package cmd

import (
	"context"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/spf13/cobra"

	"provider-diff/llm-bench/internal/benchclient"
	"provider-diff/llm-bench/internal/dataset"
	"provider-diff/llm-bench/internal/metrics"
	"provider-diff/llm-bench/internal/reporter"
	"provider-diff/llm-bench/internal/scheduler"
)

type options struct {
	Backend           string
	BaseURL           string
	Host              string
	Port              int
	Endpoint          string
	Model             string
	APIKey            string
	DatasetName       string
	DatasetPath       string
	NumPrompts        int
	RandomInputLen    int
	RandomOutputLen   int
	RandomRangeRatio  float64
	RandomPrefixLen   int
	SonnetInputLen    int
	SonnetOutputLen   int
	SonnetPrefixLen   int
	ShareGPTOutputLen int
	RequestRate       float64
	Burstiness        float64
	MaxConcurrency    int
	Seed              int64
	PercentileMetrics string
	MetricPercentiles string
	Goodput           []string
	SaveResult        bool
	ResultDir         string
	ResultFilename    string
	Metadata          []string
	DisableTQDM       bool
	NumWarmupRequests int
}

func Execute() {
	if err := newRootCommand().Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func newRootCommand() *cobra.Command {
	opts := options{
		Backend:           "openai-chat",
		Host:              "127.0.0.1",
		Port:              8000,
		Endpoint:          "/v1/chat/completions",
		APIKey:            "EMPTY",
		DatasetName:       "random",
		NumPrompts:        1000,
		RandomInputLen:    1024,
		RandomOutputLen:   128,
		RandomRangeRatio:  1.0,
		SonnetInputLen:    550,
		SonnetOutputLen:   150,
		SonnetPrefixLen:   200,
		RequestRate:       math.Inf(1),
		Burstiness:        1.0,
		PercentileMetrics: "ttft,tpot,itl",
		MetricPercentiles: "99",
		ResultDir:         ".",
	}
	cmd := &cobra.Command{
		Use:           "llm-bench",
		Short:         "OpenAI-compatible serving benchmark",
		SilenceUsage:  true,
		SilenceErrors: true,
		RunE: func(cmd *cobra.Command, args []string) error {
			return run(cmd.Context(), opts)
		},
	}
	flags := cmd.Flags()
	flags.StringVar(&opts.Backend, "backend", opts.Backend, "backend type: openai, openai-chat, vllm, sglang")
	flags.StringVar(&opts.BaseURL, "base-url", "", "API base URL; overrides host and port")
	flags.StringVar(&opts.Host, "host", opts.Host, "server host")
	flags.IntVar(&opts.Port, "port", opts.Port, "server port")
	flags.StringVar(&opts.Endpoint, "endpoint", opts.Endpoint, "API endpoint path")
	flags.StringVar(&opts.Model, "model", "", "model name")
	flags.StringVar(&opts.APIKey, "api-key", opts.APIKey, "API key; OPENAI_API_KEY is used when this is empty")
	flags.StringVar(&opts.DatasetName, "dataset-name", opts.DatasetName, "dataset: random, sharegpt, sonnet")
	flags.StringVar(&opts.DatasetPath, "dataset-path", "", "dataset file path")
	flags.IntVar(&opts.NumPrompts, "num-prompts", opts.NumPrompts, "number of prompts")
	flags.IntVar(&opts.RandomInputLen, "random-input-len", opts.RandomInputLen, "random input token mean")
	flags.IntVar(&opts.RandomOutputLen, "random-output-len", opts.RandomOutputLen, "random output token mean")
	flags.Float64Var(&opts.RandomRangeRatio, "random-range-ratio", opts.RandomRangeRatio, "random length range ratio")
	flags.IntVar(&opts.RandomPrefixLen, "random-prefix-len", 0, "shared random prefix token length")
	flags.IntVar(&opts.SonnetInputLen, "sonnet-input-len", opts.SonnetInputLen, "sonnet input tokens")
	flags.IntVar(&opts.SonnetOutputLen, "sonnet-output-len", opts.SonnetOutputLen, "sonnet output tokens")
	flags.IntVar(&opts.SonnetPrefixLen, "sonnet-prefix-len", opts.SonnetPrefixLen, "sonnet shared prefix tokens")
	flags.IntVar(&opts.ShareGPTOutputLen, "sharegpt-output-len", 0, "override ShareGPT output length")
	flags.Float64Var(&opts.RequestRate, "request-rate", opts.RequestRate, "request rate req/s; inf sends as fast as possible")
	flags.Float64Var(&opts.Burstiness, "burstiness", opts.Burstiness, "Gamma arrival burstiness")
	flags.IntVar(&opts.MaxConcurrency, "max-concurrency", 0, "maximum concurrent requests")
	flags.Int64Var(&opts.Seed, "seed", 0, "random seed")
	flags.StringVar(&opts.PercentileMetrics, "percentile-metrics", opts.PercentileMetrics, "comma separated metrics: ttft,tpot,itl,e2el")
	flags.StringVar(&opts.MetricPercentiles, "metric-percentiles", opts.MetricPercentiles, "comma separated percentiles")
	flags.StringArrayVar(&opts.Goodput, "goodput", nil, "SLO KEY:VALUE_MS; repeatable")
	flags.BoolVar(&opts.SaveResult, "save-result", false, "save result JSON")
	flags.StringVar(&opts.ResultDir, "result-dir", opts.ResultDir, "result directory")
	flags.StringVar(&opts.ResultFilename, "result-filename", "", "result filename")
	flags.StringArrayVar(&opts.Metadata, "metadata", nil, "metadata key=value; repeatable")
	flags.BoolVar(&opts.DisableTQDM, "disable-tqdm", false, "disable progress")
	flags.IntVar(&opts.NumWarmupRequests, "num-warmup-requests", 0, "warmup request count")
	return cmd
}

func run(parent context.Context, opts options) error {
	if strings.TrimSpace(opts.Model) == "" {
		return errors.New("--model is required")
	}
	apiKey := strings.TrimSpace(opts.APIKey)
	if apiKey == "" || apiKey == "EMPTY" {
		apiKey = strings.TrimSpace(os.Getenv("OPENAI_API_KEY"))
	}
	if apiKey == "" {
		apiKey = "EMPTY"
	}
	samples, err := dataset.Load(dataset.Config{
		Name:              opts.DatasetName,
		Path:              opts.DatasetPath,
		NumPrompts:        opts.NumPrompts,
		RandomInputLen:    opts.RandomInputLen,
		RandomOutputLen:   opts.RandomOutputLen,
		RandomRangeRatio:  opts.RandomRangeRatio,
		RandomPrefixLen:   opts.RandomPrefixLen,
		SonnetInputLen:    opts.SonnetInputLen,
		SonnetOutputLen:   opts.SonnetOutputLen,
		SonnetPrefixLen:   opts.SonnetPrefixLen,
		ShareGPTOutputLen: opts.ShareGPTOutputLen,
		Seed:              opts.Seed,
	})
	if err != nil {
		return err
	}
	percentileMetrics, err := parseMetricNames(opts.PercentileMetrics)
	if err != nil {
		return err
	}
	percentiles, err := parseFloatList(opts.MetricPercentiles)
	if err != nil {
		return err
	}
	goodput, err := parseGoodput(opts.Goodput)
	if err != nil {
		return err
	}
	metadata, err := parseMetadata(opts.Metadata)
	if err != nil {
		return err
	}
	cfg := benchclient.Config{
		Backend:  opts.Backend,
		BaseURL:  baseURL(opts),
		Endpoint: endpointForBackend(opts),
		Model:    opts.Model,
		APIKey:   apiKey,
	}
	ctx, stop := signal.NotifyContext(parent, os.Interrupt, syscall.SIGTERM)
	defer stop()
	httpClient := &http.Client{}
	if opts.NumWarmupRequests > 0 {
		warmups := opts.NumWarmupRequests
		if warmups > len(samples) {
			warmups = len(samples)
		}
		for i := 0; i < warmups; i++ {
			_ = benchclient.Send(ctx, httpClient, cfg, samples[i])
		}
	}
	results := make([]benchclient.Result, 0, len(samples))
	resultCh := make(chan benchclient.Result, len(samples))
	semSize := opts.MaxConcurrency
	if semSize <= 0 {
		semSize = len(samples)
	}
	if semSize < 1 {
		semSize = 1
	}
	sem := make(chan struct{}, semSize)
	rng := rand.New(rand.NewSource(opts.Seed))
	var wg sync.WaitGroup
	start := time.Now()
	for index, sample := range samples {
		if ctx.Err() != nil {
			break
		}
		sem <- struct{}{}
		wg.Add(1)
		go func(sample dataset.Sample) {
			defer wg.Done()
			defer func() { <-sem }()
			resultCh <- benchclient.Send(ctx, httpClient, cfg, sample)
		}(sample)
		if !math.IsInf(opts.RequestRate, 1) && index < len(samples)-1 {
			select {
			case <-time.After(scheduler.Interval(opts.RequestRate, opts.Burstiness, rng)):
			case <-ctx.Done():
			}
		}
	}
	go func() {
		wg.Wait()
		close(resultCh)
	}()
	completed := 0
	for result := range resultCh {
		results = append(results, result)
		completed++
		if !opts.DisableTQDM {
			fmt.Fprintf(os.Stderr, "\rCompleted requests: %d / %d", completed, len(samples))
		}
	}
	if !opts.DisableTQDM {
		fmt.Fprintln(os.Stderr)
	}
	duration := time.Since(start)
	summary := metrics.Aggregate(results, duration, percentileMetrics, percentiles, goodput, metadata)
	reporter.Print(summary)
	if opts.SaveResult {
		path, err := reporter.Save(summary, opts.ResultDir, opts.ResultFilename)
		if err != nil {
			return err
		}
		fmt.Printf("Result saved to %s\n", path)
	}
	return nil
}

func baseURL(opts options) string {
	if strings.TrimSpace(opts.BaseURL) != "" {
		return strings.TrimRight(strings.TrimSpace(opts.BaseURL), "/")
	}
	return fmt.Sprintf("http://%s:%d", opts.Host, opts.Port)
}

func endpointForBackend(opts options) string {
	if strings.EqualFold(opts.Backend, "openai") && opts.Endpoint == "/v1/chat/completions" {
		return "/v1/completions"
	}
	return opts.Endpoint
}

func parseMetricNames(raw string) ([]string, error) {
	allowed := map[string]bool{"ttft": true, "tpot": true, "itl": true, "e2el": true}
	parts := splitComma(raw)
	if len(parts) == 0 {
		return nil, errors.New("percentile-metrics cannot be empty")
	}
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if !allowed[part] {
			return nil, fmt.Errorf("unsupported percentile metric %q", part)
		}
		out = append(out, part)
	}
	return out, nil
}

func parseFloatList(raw string) ([]float64, error) {
	parts := splitComma(raw)
	if len(parts) == 0 {
		return nil, errors.New("metric-percentiles cannot be empty")
	}
	out := make([]float64, 0, len(parts))
	for _, part := range parts {
		value, err := strconv.ParseFloat(part, 64)
		if err != nil {
			return nil, err
		}
		out = append(out, value)
	}
	return out, nil
}

func parseGoodput(items []string) (metrics.SLO, error) {
	out := metrics.SLO{}
	for _, item := range items {
		key, value, ok := strings.Cut(item, ":")
		if !ok {
			return nil, fmt.Errorf("invalid goodput %q, expected KEY:VALUE_MS", item)
		}
		key = strings.ToLower(strings.TrimSpace(key))
		if key != "ttft" && key != "tpot" && key != "e2el" {
			return nil, fmt.Errorf("unsupported goodput metric %q", key)
		}
		ms, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
		if err != nil {
			return nil, err
		}
		out[key] = ms
	}
	return out, nil
}

func parseMetadata(items []string) (map[string]string, error) {
	out := map[string]string{}
	for _, item := range items {
		key, value, ok := strings.Cut(item, "=")
		if !ok {
			return nil, fmt.Errorf("invalid metadata %q, expected key=value", item)
		}
		key = strings.TrimSpace(key)
		if key == "" {
			return nil, errors.New("metadata key cannot be empty")
		}
		out[key] = strings.TrimSpace(value)
	}
	return out, nil
}

func splitComma(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.ToLower(strings.TrimSpace(part))
		if part != "" {
			out = append(out, part)
		}
	}
	return out
}
