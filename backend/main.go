package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Manifest struct {
	Provider       string         `json:"provider"`
	BaseURL        string         `json:"base_url"`
	Endpoint       string         `json:"endpoint"`
	Method         string         `json:"method"`
	Source         string         `json:"source"`
	DefaultModel   string         `json:"default_model"`
	ReasoningModel string         `json:"reasoning_model"`
	VisionModel    string         `json:"vision_model"`
	Notes          []string       `json:"notes"`
	CommonExpect   map[string]any `json:"common_expect"`
	Cases          []string       `json:"cases"`
}

type TestCase struct {
	CaseID                  string            `json:"case_id"`
	Title                   string            `json:"title"`
	Category                string            `json:"category"`
	CaseScope               string            `json:"case_scope,omitempty"`
	OemVendor               string            `json:"oem_vendor,omitempty"`
	TargetGroup             string            `json:"target_group,omitempty"`
	Parameters              []string          `json:"parameters"`
	RequiresModelCapability string            `json:"requires_model_capability,omitempty"`
	Optional                bool              `json:"optional,omitempty"`
	Method                  string            `json:"method"`
	Path                    string            `json:"path"`
	BaseURL                 string            `json:"base_url,omitempty"`
	Headers                 map[string]string `json:"headers,omitempty"`
	Payload                 map[string]any    `json:"payload"`
	Expect                  map[string]any    `json:"expect"`
	File                    string            `json:"file"`
}

type CaseSummary struct {
	CaseID                  string   `json:"case_id"`
	Title                   string   `json:"title"`
	Category                string   `json:"category"`
	Parameters              []string `json:"parameters"`
	RequiresModelCapability string   `json:"requires_model_capability,omitempty"`
	Optional                bool     `json:"optional,omitempty"`
	File                    string   `json:"file"`
}

type ProviderCasesResponse struct {
	Provider         string                   `json:"provider"`
	BaseURL          string                   `json:"base_url"`
	Endpoint         string                   `json:"endpoint"`
	Method           string                   `json:"method"`
	DefaultModel     string                   `json:"default_model"`
	ReasoningModel   string                   `json:"reasoning_model"`
	VisionModel      string                   `json:"vision_model"`
	Notes            []string                 `json:"notes"`
	CommonExpect     map[string]any           `json:"common_expect"`
	Cases            []TestCase               `json:"cases"`
	CasesByParameter map[string][]CaseSummary `json:"cases_by_parameter"`
	CasesByCategory  map[string][]CaseSummary `json:"cases_by_category"`
	Parameters       []string                 `json:"parameters"`
	Categories       []string                 `json:"categories"`
}

type ProxyConfig struct {
	Enabled bool   `json:"enabled"`
	URL     string `json:"url"`
	Mode    string `json:"mode"`
}

type RunRequest struct {
	Provider         string      `json:"provider"`
	EndpointID       string      `json:"endpoint_id"`
	CaseIDs          []string    `json:"case_ids"`
	CustomCases      []TestCase  `json:"custom_cases"`
	APIKey           string      `json:"api_key"`
	ConfigPlatformID string      `json:"config_platform_id,omitempty"`
	BaseURL          string      `json:"base_url"`
	Model            string      `json:"model"`
	Proxy            ProxyConfig `json:"proxy"`
	MaxConcurrency   int         `json:"max_concurrency,omitempty"`
}

type RunResponse struct {
	Provider    string          `json:"provider"`
	BaseURL     string          `json:"base_url"`
	EndpointURL string          `json:"endpoint_url"`
	Model       string          `json:"model"`
	Proxy       ProxyConfig     `json:"proxy"`
	Results     []RunCaseResult `json:"results"`
	StartedAt   string          `json:"started_at"`
	FinishedAt  string          `json:"finished_at"`
}

type RunStreamEvent struct {
	Type        string         `json:"type"`
	Total       int            `json:"total,omitempty"`
	Index       int            `json:"index,omitempty"`
	TargetIndex int            `json:"target_index"`
	TargetLabel string         `json:"target_label,omitempty"`
	TargetTotal int            `json:"target_total,omitempty"`
	Status      int            `json:"status,omitempty"`
	Provider    string         `json:"provider,omitempty"`
	BaseURL     string         `json:"base_url,omitempty"`
	EndpointURL string         `json:"endpoint_url,omitempty"`
	Model       string         `json:"model,omitempty"`
	Result      *RunCaseResult `json:"result,omitempty"`
	Error       string         `json:"error,omitempty"`
	StartedAt   string         `json:"started_at,omitempty"`
	FinishedAt  string         `json:"finished_at,omitempty"`
}

type BatchRunRequest struct {
	Targets        []RunRequest `json:"targets"`
	EndpointID     string       `json:"endpoint_id"`
	CaseIDs        []string     `json:"case_ids"`
	CustomCases    []TestCase   `json:"custom_cases"`
	APIKey         string       `json:"api_key"`
	BaseURL        string       `json:"base_url"`
	Proxy          ProxyConfig  `json:"proxy"`
	MaxConcurrency int          `json:"max_concurrency"`
}

type BatchRunTargetResponse struct {
	Index  int    `json:"index"`
	Label  string `json:"label,omitempty"`
	Error  string `json:"error,omitempty"`
	Status int    `json:"status,omitempty"`
	RunResponse
}

type BatchRunResponse struct {
	Targets    []BatchRunTargetResponse `json:"targets"`
	StartedAt  string                   `json:"started_at"`
	FinishedAt string                   `json:"finished_at"`
}

type batchRunStreamTarget struct {
	Index    int
	Label    string
	Target   RunRequest
	Prepared preparedRunRequest
	RunErr   *runRequestError
}

type runRequestError struct {
	status  int
	message string
}

func (e runRequestError) Error() string {
	return e.message
}

type preparedRunRequest struct {
	Req         RunRequest
	Manifest    Manifest
	Selected    []TestCase
	BaseURL     string
	EndpointURL string
	Client      *http.Client
}

type indexedRunCaseResult struct {
	Index  int
	Result RunCaseResult
}

type RunCaseResult struct {
	CaseID                    string               `json:"case_id"`
	Title                     string               `json:"title"`
	Category                  string               `json:"category"`
	Parameters                []string             `json:"parameters"`
	Method                    string               `json:"method"`
	URL                       string               `json:"url"`
	RequestHeaders            map[string]any       `json:"request_headers,omitempty"`
	RequestBody               map[string]any       `json:"request_body"`
	ExpectedHTTPStatus        int                  `json:"expected_http_status,omitempty"`
	ExpectedSupportConclusion string               `json:"expected_support_conclusion,omitempty"`
	HTTPStatus                int                  `json:"http_status"`
	LatencyMS                 int64                `json:"latency_ms"`
	ResponseBody              any                  `json:"response_body,omitempty"`
	RawResponse               string               `json:"raw_response,omitempty"`
	ResponseHeaders           map[string]any       `json:"response_headers,omitempty"`
	Assertions                []CaseAssertion      `json:"assertions,omitempty"`
	Error                     string               `json:"error,omitempty"`
	SupportConclusion         string               `json:"support_conclusion"`
	ReasoningTokens           *int                 `json:"reasoning_tokens,omitempty"`
	ThinkingTokens            *int                 `json:"thinking_tokens,omitempty"`
	StreamMetrics             *StreamMetrics       `json:"stream_metrics,omitempty"`
	StreamProbeAttempts       []StreamProbeAttempt `json:"stream_probe_attempts,omitempty"`
	StreamUsagePresent        *bool                `json:"stream_usage_present,omitempty"`
	StreamUsageChunkProfile   *string              `json:"stream_usage_chunk_profile,omitempty"`
	StreamDoneMarkerPresent   *bool                `json:"stream_done_marker_present,omitempty"`
	OutputLengthCapPrecedence *string              `json:"output_length_cap_precedence,omitempty"`
	OutputCapEffective        *bool                `json:"output_cap_effective,omitempty"`
	ParameterDiagnosis        *ParameterDiagnosis  `json:"parameter_diagnosis,omitempty"`
}

type ParameterDiagnosis struct {
	DocSupport string `json:"doc_support"`
	Policy     string `json:"policy"`
	Scenario   string `json:"scenario,omitempty"`
	Compliant  *bool  `json:"compliant"`
	Flag       string `json:"flag,omitempty"`
	Effect     bool   `json:"effect"`
	Message    string `json:"message"`
}

type StreamMetrics struct {
	SSEChunkCount       int   `json:"sse_chunk_count"`
	ContentChunkCount   int   `json:"content_chunk_count"`
	ReasoningChunkCount int   `json:"reasoning_chunk_count,omitempty"`
	FirstChunkMS        int64 `json:"first_chunk_ms"`
	LastChunkMS         int64 `json:"last_chunk_ms"`
	ChunkSpreadMS       int64 `json:"chunk_spread_ms"`
}

type StreamProbeAttempt struct {
	Attempt       int            `json:"attempt"`
	HTTPStatus    int            `json:"http_status"`
	LatencyMS     int64          `json:"latency_ms"`
	StreamMetrics *StreamMetrics `json:"stream_metrics,omitempty"`
	Error         string         `json:"error,omitempty"`
}

type CaseAssertion struct {
	Name    string `json:"name"`
	Pass    bool   `json:"pass"`
	Message string `json:"message,omitempty"`
}

type Server struct {
	root string
}

const defaultRunCaseConcurrency = 20
const statusClientClosedRequest = 499

type FeishuDocumentRequest struct {
	DocumentURL  string `json:"document_url"`
	DocumentMode string `json:"document_mode"`
	Title        string `json:"title"`
	Markdown     string `json:"markdown"`
}

type FeishuDocumentResponse struct {
	OK      bool   `json:"ok"`
	Message string `json:"message,omitempty"`
}

type PerformanceBenchmarkRequest struct {
	Backend           string            `json:"backend"`
	BaseURL           string            `json:"base_url"`
	Host              string            `json:"host"`
	Port              int               `json:"port"`
	Endpoint          string            `json:"endpoint"`
	Model             string            `json:"model"`
	APIKey            string            `json:"api_key"`
	DatasetName       string            `json:"dataset_name"`
	DatasetPath       string            `json:"dataset_path"`
	NumPrompts        int               `json:"num_prompts"`
	RandomInputLen    int               `json:"random_input_len"`
	RandomOutputLen   int               `json:"random_output_len"`
	RandomRangeRatio  *float64          `json:"random_range_ratio"`
	RandomPrefixLen   int               `json:"random_prefix_len"`
	SonnetInputLen    int               `json:"sonnet_input_len"`
	SonnetOutputLen   int               `json:"sonnet_output_len"`
	SonnetPrefixLen   int               `json:"sonnet_prefix_len"`
	ShareGPTOutputLen int               `json:"sharegpt_output_len"`
	RequestRate       string            `json:"request_rate"`
	Burstiness        float64           `json:"burstiness"`
	MaxConcurrency    int               `json:"max_concurrency"`
	Seed              int64             `json:"seed"`
	PercentileMetrics string            `json:"percentile_metrics"`
	MetricPercentiles string            `json:"metric_percentiles"`
	Goodput           []string          `json:"goodput"`
	Metadata          map[string]string `json:"metadata"`
	NumWarmupRequests int               `json:"num_warmup_requests"`
	DisableTQDM       bool              `json:"disable_tqdm"`
	ExtraArgs         []string          `json:"extra_args"`
	Proxy             ProxyConfig       `json:"proxy"`
}

type PerformanceBenchmarkResponse struct {
	Result     map[string]any `json:"result"`
	Stdout     string         `json:"stdout"`
	Stderr     string         `json:"stderr,omitempty"`
	ResultPath string         `json:"result_path"`
}

func main() {
	root, err := findProjectRoot()
	if err != nil {
		log.Fatal(err)
	}

	s := &Server{root: root}
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", s.handleHealth)
	mux.HandleFunc("/api/providers", s.handleProviders)
	mux.HandleFunc("/api/providers/", s.handleProviderRoutes)
	mux.HandleFunc("/api/run", s.handleRun)
	mux.HandleFunc("/api/run-stream", s.handleRunStream)
	mux.HandleFunc("/api/run-batch", s.handleRunBatch)
	mux.HandleFunc("/api/run-batch-stream", s.handleRunBatchStream)
	mux.HandleFunc("/api/feishu/document", s.handleFeishuDocument)
	mux.HandleFunc("/api/performance/benchmark", s.handlePerformanceBenchmark)
	mux.HandleFunc("/api/channel-model-lookup", s.handleChannelModelLookup)
	mux.HandleFunc("/api/local-config", s.handleLocalConfig)

	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "8080"
	}
	addr := ":" + port
	log.Printf("ProviderX backend listening on http://localhost%s", addr)
	log.Fatal(http.ListenAndServe(addr, withCORS(mux)))
}

func (s *Server) handlePerformanceBenchmark(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/api/performance/benchmark" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req PerformanceBenchmarkRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}
	response, err := s.runPerformanceBenchmark(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (s *Server) handleFeishuDocument(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/api/feishu/document" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req FeishuDocumentRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 512<<10)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}
	title := strings.TrimSpace(req.Title)
	if title == "" {
		title = "Provider Diff 评测完成"
	}
	markdown := strings.TrimSpace(req.Markdown)
	if markdown == "" {
		writeError(w, http.StatusBadRequest, "markdown is required")
		return
	}
	if len([]rune(markdown)) > 18000 {
		runes := []rune(markdown)
		markdown = string(runes[:18000]) + "\n\n（内容过长，已截断；请在本地历史报告查看完整结果。）"
	}

	documentURL, err := validateFeishuDocumentURL(req.DocumentURL)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	mode, err := normalizeFeishuDocumentMode(req.DocumentMode)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := writeFeishuDocumentWithCLI(r.Context(), s.root, documentURL.String(), mode, title, markdown); err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, FeishuDocumentResponse{
		OK:      true,
		Message: "written",
	})
}

func findProjectRoot() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for {
		if exists(filepath.Join(wd, "payloads")) && exists(filepath.Join(wd, "index.html")) {
			return wd, nil
		}
		parent := filepath.Dir(wd)
		if parent == wd {
			return "", errors.New("could not locate project root containing payloads and index.html")
		}
		wd = parent
	}
}

func exists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func validateFeishuDocumentURL(value string) (*url.URL, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, errors.New("document_url is required")
	}
	parsed, err := url.Parse(trimmed)
	if err != nil {
		return nil, fmt.Errorf("invalid document_url: %w", err)
	}
	if parsed.Scheme != "https" {
		return nil, errors.New("document_url must use https")
	}
	host := strings.ToLower(parsed.Hostname())
	allowedSuffixes := []string{
		"feishu.cn",
		"larksuite.com",
		"larkoffice.com",
	}
	allowed := false
	for _, suffix := range allowedSuffixes {
		if host == suffix || strings.HasSuffix(host, "."+suffix) {
			allowed = true
			break
		}
	}
	if !allowed {
		return nil, errors.New("document_url must be a Feishu or Lark document/wiki URL")
	}
	path := parsed.EscapedPath()
	if !strings.Contains(path, "/wiki/") && !strings.Contains(path, "/docx/") && !strings.Contains(path, "/docs/") {
		return nil, errors.New("document_url must point to a Feishu wiki/docx/docs page")
	}
	return parsed, nil
}

func normalizeFeishuDocumentMode(value string) (string, error) {
	mode := strings.TrimSpace(value)
	if mode == "" {
		mode = "append"
	}
	switch mode {
	case "append", "overwrite":
		return mode, nil
	default:
		return "", errors.New("document_mode must be append or overwrite")
	}
}

func writeFeishuDocumentWithCLI(ctx context.Context, root, documentURL, mode, title, markdown string) error {
	cliPath, err := larkCLIPath(root)
	if err != nil {
		return err
	}
	tempFile, err := os.CreateTemp("", "providerx-feishu-*.md")
	if err != nil {
		return fmt.Errorf("create temporary markdown file: %w", err)
	}
	tempPath := tempFile.Name()
	defer os.Remove(tempPath)
	if _, err := tempFile.WriteString(markdown); err != nil {
		tempFile.Close()
		return fmt.Errorf("write temporary markdown file: %w", err)
	}
	if err := tempFile.Close(); err != nil {
		return fmt.Errorf("close temporary markdown file: %w", err)
	}

	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()
	args := []string{
		"docs", "+update",
		"--api-version", "v2",
		"--as", "user",
		"--doc", documentURL,
		"--mode", mode,
		"--markdown", "@" + tempPath,
	}
	if mode == "overwrite" && strings.TrimSpace(title) != "" {
		args = append(args, "--new-title", strings.TrimSpace(title))
	}
	cmd := exec.CommandContext(ctx, cliPath, args...)
	cmd.Dir = root
	output, err := cmd.CombinedOutput()
	if ctx.Err() == context.DeadlineExceeded {
		return errors.New("lark-cli timed out while writing the document")
	}
	if err != nil {
		text := strings.TrimSpace(string(output))
		if text == "" {
			text = err.Error()
		}
		return fmt.Errorf("lark-cli docs +update failed: %s", text)
	}
	return nil
}

func larkCLIPath(root string) (string, error) {
	binaryName := "lark-cli"
	if os.PathSeparator == '\\' {
		binaryName = "lark-cli.cmd"
	}
	localPath := filepath.Join(root, "node_modules", ".bin", binaryName)
	if exists(localPath) {
		return localPath, nil
	}
	if path, err := exec.LookPath(binaryName); err == nil {
		return path, nil
	}
	return "", errors.New("lark-cli is not installed; run npm install or install @larksuite/cli")
}

func (s *Server) runPerformanceBenchmark(ctx context.Context, req PerformanceBenchmarkRequest) (PerformanceBenchmarkResponse, error) {
	if strings.TrimSpace(req.Model) == "" {
		return PerformanceBenchmarkResponse{}, errors.New("model is required")
	}
	if strings.TrimSpace(req.BaseURL) == "" && strings.TrimSpace(req.Host) == "" {
		req.Host = "127.0.0.1"
	}
	if req.Port == 0 {
		req.Port = 8000
	}
	tempDir, err := os.MkdirTemp("", "providerx-performance-*")
	if err != nil {
		return PerformanceBenchmarkResponse{}, fmt.Errorf("create result directory: %w", err)
	}
	resultFilename := "benchmark-result.json"
	args := performanceBenchmarkArgs(req, tempDir, resultFilename)
	cmd, commandLabel, err := s.performanceBenchmarkCommand(ctx, args)
	if err != nil {
		os.RemoveAll(tempDir)
		return PerformanceBenchmarkResponse{}, err
	}
	cmd.Env = performanceBenchmarkEnv(os.Environ(), req.Proxy)
	output, err := cmd.CombinedOutput()
	stdout := string(output)
	resultPath := filepath.Join(tempDir, resultFilename)
	var result map[string]any
	readErr := readJSONFile(resultPath, &result)
	if err != nil {
		os.RemoveAll(tempDir)
		message := strings.TrimSpace(stdout)
		if message == "" {
			message = err.Error()
		}
		return PerformanceBenchmarkResponse{}, fmt.Errorf("%s failed: %s", commandLabel, message)
	}
	if readErr != nil {
		os.RemoveAll(tempDir)
		return PerformanceBenchmarkResponse{}, fmt.Errorf("read benchmark result: %w", readErr)
	}
	return PerformanceBenchmarkResponse{
		Result:     result,
		Stdout:     stdout,
		ResultPath: resultPath,
	}, nil
}

func performanceBenchmarkArgs(req PerformanceBenchmarkRequest, resultDir, resultFilename string) []string {
	args := []string{"--save-result", "--result-dir", resultDir, "--result-filename", resultFilename}
	addStringArg := func(name, value string) {
		if strings.TrimSpace(value) != "" {
			args = append(args, name, strings.TrimSpace(value))
		}
	}
	addIntArg := func(name string, value int) {
		if value != 0 {
			args = append(args, name, fmt.Sprintf("%d", value))
		}
	}
	addFloatArg := func(name string, value float64) {
		if value != 0 {
			args = append(args, name, fmt.Sprintf("%g", value))
		}
	}
	addStringArg("--backend", req.Backend)
	addStringArg("--base-url", req.BaseURL)
	addStringArg("--host", req.Host)
	addIntArg("--port", req.Port)
	addStringArg("--endpoint", req.Endpoint)
	addStringArg("--model", req.Model)
	addStringArg("--api-key", req.APIKey)
	addStringArg("--dataset-name", req.DatasetName)
	addStringArg("--dataset-path", req.DatasetPath)
	addIntArg("--num-prompts", req.NumPrompts)
	addIntArg("--random-input-len", req.RandomInputLen)
	addIntArg("--random-output-len", req.RandomOutputLen)
	if req.RandomRangeRatio != nil {
		args = append(args, "--random-range-ratio", fmt.Sprintf("%g", *req.RandomRangeRatio))
	}
	addIntArg("--random-prefix-len", req.RandomPrefixLen)
	addIntArg("--sonnet-input-len", req.SonnetInputLen)
	addIntArg("--sonnet-output-len", req.SonnetOutputLen)
	addIntArg("--sonnet-prefix-len", req.SonnetPrefixLen)
	addIntArg("--sharegpt-output-len", req.ShareGPTOutputLen)
	addStringArg("--request-rate", req.RequestRate)
	addFloatArg("--burstiness", req.Burstiness)
	addIntArg("--max-concurrency", req.MaxConcurrency)
	if req.Seed != 0 {
		args = append(args, "--seed", fmt.Sprintf("%d", req.Seed))
	}
	addStringArg("--percentile-metrics", req.PercentileMetrics)
	addStringArg("--metric-percentiles", req.MetricPercentiles)
	for _, item := range req.Goodput {
		addStringArg("--goodput", item)
	}
	keys := sortedStringMapKeys(req.Metadata)
	for _, key := range keys {
		args = append(args, "--metadata", key+"="+req.Metadata[key])
	}
	addIntArg("--num-warmup-requests", req.NumWarmupRequests)
	if req.DisableTQDM {
		args = append(args, "--disable-tqdm")
	}
	args = append(args, req.ExtraArgs...)
	return args
}

func (s *Server) performanceBenchmarkCommand(ctx context.Context, args []string) (*exec.Cmd, string, error) {
	for _, candidate := range s.performanceBenchmarkBinaryCandidates() {
		if isExecutable(candidate) {
			cmd := exec.CommandContext(ctx, candidate, args...)
			cmd.Dir = s.root
			return cmd, candidate, nil
		}
	}
	benchDir := filepath.Join(s.root, "llm-bench")
	if exists(filepath.Join(benchDir, "go.mod")) {
		runArgs := append([]string{"run", "."}, args...)
		cmd := exec.CommandContext(ctx, "go", runArgs...)
		cmd.Dir = benchDir
		return cmd, "go run ./llm-bench", nil
	}
	return nil, "", errors.New("llm-bench binary not found and llm-bench source directory is unavailable")
}

func (s *Server) performanceBenchmarkBinaryCandidates() []string {
	binaryName := "llm-bench"
	if os.PathSeparator == '\\' {
		binaryName = "llm-bench.exe"
	}
	candidates := []string{
		filepath.Join(s.root, "desktop", "bin", binaryName),
		filepath.Join(s.root, "llm-bench", binaryName),
	}
	if executable, err := os.Executable(); err == nil {
		candidates = append([]string{filepath.Join(filepath.Dir(executable), binaryName)}, candidates...)
	}
	if path, err := exec.LookPath(binaryName); err == nil {
		candidates = append(candidates, path)
	}
	return candidates
}

func isExecutable(path string) bool {
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		return false
	}
	if os.PathSeparator == '\\' {
		return true
	}
	return info.Mode()&0o111 != 0
}

func performanceBenchmarkEnv(base []string, proxy ProxyConfig) []string {
	if !proxy.Enabled || strings.TrimSpace(proxy.URL) == "" {
		return base
	}
	env := withoutEnvKeys(base, "HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy")
	proxyURL := strings.TrimSpace(proxy.URL)
	return append(env, "HTTP_PROXY="+proxyURL, "HTTPS_PROXY="+proxyURL, "http_proxy="+proxyURL, "https_proxy="+proxyURL)
}

func withoutEnvKeys(env []string, keys ...string) []string {
	blocked := map[string]bool{}
	for _, key := range keys {
		blocked[key] = true
	}
	out := make([]string, 0, len(env))
	for _, item := range env {
		key, _, _ := strings.Cut(item, "=")
		if !blocked[key] {
			out = append(out, item)
		}
	}
	return out
}

func sortedStringMapKeys(values map[string]string) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleRun(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/api/run" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req RunRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}
	response, runErr := s.runRequest(r.Context(), req)
	if runErr != nil {
		writeError(w, runErr.status, runErr.message)
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (s *Server) handleRunStream(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/api/run-stream" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req RunRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}
	prepared, runErr := s.prepareRunRequest(req)
	if runErr != nil {
		writeError(w, runErr.status, runErr.message)
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming is not supported by this server")
		return
	}

	w.Header().Set("Content-Type", "application/x-ndjson; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("X-Accel-Buffering", "no")

	started := time.Now().UTC()
	total := len(prepared.Selected)
	maxConcurrency := runCaseConcurrency(total, prepared.Req.MaxConcurrency)
	if err := writeRunStreamEvent(w, flusher, RunStreamEvent{
		Type:        "start",
		Total:       total,
		Provider:    prepared.Manifest.Provider,
		BaseURL:     prepared.BaseURL,
		EndpointURL: prepared.EndpointURL,
		Model:       prepared.Req.Model,
		StartedAt:   started.Format(time.RFC3339),
	}); err != nil {
		return
	}

	results := make(chan indexedRunCaseResult, total)
	sem := make(chan struct{}, maxConcurrency)
	var wg sync.WaitGroup
	for index, tc := range prepared.Selected {
		index := index
		tc := tc
		wg.Add(1)
		go func() {
			defer wg.Done()
			select {
			case sem <- struct{}{}:
			case <-r.Context().Done():
				results <- indexedRunCaseResult{Index: index, Result: canceledRunCaseResult(tc, prepared.EndpointURL, r.Context().Err())}
				return
			}
			defer func() { <-sem }()
			if r.Context().Err() != nil {
				results <- indexedRunCaseResult{Index: index, Result: canceledRunCaseResult(tc, prepared.EndpointURL, r.Context().Err())}
				return
			}
			log.Printf("run stream provider=%s case=%s index=%d/%d concurrency=%d start", prepared.Manifest.Provider, tc.CaseID, index+1, total, maxConcurrency)
			caseEndpointURL := prepared.EndpointURL
			if caseBaseURL := strings.TrimSpace(tc.BaseURL); caseBaseURL != "" {
				caseEndpointURL = buildEndpointURL(caseBaseURL, prepared.Manifest.Endpoint)
			}
			result := runProviderCase(r.Context(), prepared.Client, caseEndpointURL, prepared.Req.APIKey, prepared.Req.Model, prepared.Manifest, tc)
			log.Printf("run stream provider=%s case=%s index=%d/%d done status=%d latency_ms=%d conclusion=%s error=%q", prepared.Manifest.Provider, tc.CaseID, index+1, total, result.HTTPStatus, result.LatencyMS, result.SupportConclusion, result.Error)
			results <- indexedRunCaseResult{Index: index, Result: result}
		}()
	}
	go func() {
		wg.Wait()
		close(results)
	}()

	for item := range results {
		if r.Context().Err() != nil {
			return
		}
		result := item.Result
		if err := writeRunStreamEvent(w, flusher, RunStreamEvent{
			Type:   "result",
			Total:  total,
			Index:  item.Index,
			Result: &result,
		}); err != nil {
			return
		}
	}
	if r.Context().Err() != nil {
		return
	}
	finished := time.Now().UTC()
	_ = writeRunStreamEvent(w, flusher, RunStreamEvent{
		Type:       "end",
		Total:      total,
		FinishedAt: finished.Format(time.RFC3339),
	})
}

func (s *Server) handleRunBatch(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/api/run-batch" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req BatchRunRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<20)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}
	if len(req.Targets) == 0 {
		writeError(w, http.StatusBadRequest, "targets must contain at least one run target")
		return
	}
	if len(req.Targets) > 32 {
		writeError(w, http.StatusBadRequest, "targets cannot contain more than 32 run targets")
		return
	}

	maxConcurrency := req.MaxConcurrency
	if maxConcurrency <= 0 {
		maxConcurrency = 3
	}
	if maxConcurrency > 8 {
		maxConcurrency = 8
	}
	req.MaxConcurrency = maxConcurrency

	started := time.Now().UTC()
	targets := make([]BatchRunTargetResponse, len(req.Targets))
	sem := make(chan struct{}, maxConcurrency)
	var wg sync.WaitGroup
	for index, target := range req.Targets {
		index := index
		target := applyBatchDefaults(target, req)
		wg.Add(1)
		go func() {
			defer wg.Done()
			select {
			case sem <- struct{}{}:
			case <-r.Context().Done():
				targets[index] = BatchRunTargetResponse{
					Index:  index,
					Label:  runTargetLabel(target),
					Error:  contextErrorMessage(r.Context().Err()),
					Status: statusClientClosedRequest,
				}
				return
			}
			defer func() { <-sem }()
			if r.Context().Err() != nil {
				targets[index] = BatchRunTargetResponse{
					Index:  index,
					Label:  runTargetLabel(target),
					Error:  contextErrorMessage(r.Context().Err()),
					Status: statusClientClosedRequest,
				}
				return
			}
			label := runTargetLabel(target)
			log.Printf("batch run target=%s index=%d/%d start", label, index+1, len(req.Targets))
			response, runErr := s.runRequest(r.Context(), target)
			targets[index] = BatchRunTargetResponse{
				Index:       index,
				Label:       label,
				RunResponse: response,
			}
			if runErr != nil {
				targets[index].Error = runErr.message
				targets[index].Status = runErr.status
			}
			log.Printf("batch run target=%s index=%d/%d done error=%q", label, index+1, len(req.Targets), targets[index].Error)
		}()
	}
	wg.Wait()
	finished := time.Now().UTC()

	writeJSON(w, http.StatusOK, BatchRunResponse{
		Targets:    targets,
		StartedAt:  started.Format(time.RFC3339),
		FinishedAt: finished.Format(time.RFC3339),
	})
}

func (s *Server) handleRunBatchStream(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/api/run-batch-stream" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req BatchRunRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<20)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}
	if len(req.Targets) == 0 {
		writeError(w, http.StatusBadRequest, "targets must contain at least one run target")
		return
	}
	if len(req.Targets) > 32 {
		writeError(w, http.StatusBadRequest, "targets cannot contain more than 32 run targets")
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming is not supported by this server")
		return
	}

	maxConcurrency := req.MaxConcurrency
	if maxConcurrency <= 0 {
		maxConcurrency = 3
	}
	if maxConcurrency > 8 {
		maxConcurrency = 8
	}
	req.MaxConcurrency = maxConcurrency

	targets := make([]batchRunStreamTarget, 0, len(req.Targets))
	total := 0
	for index, rawTarget := range req.Targets {
		target := applyBatchDefaults(rawTarget, req)
		label := runTargetLabel(target)
		prepared, runErr := s.prepareRunRequest(target)
		if runErr == nil {
			total += len(prepared.Selected)
		}
		targets = append(targets, batchRunStreamTarget{
			Index:    index,
			Label:    label,
			Target:   target,
			Prepared: prepared,
			RunErr:   runErr,
		})
	}

	w.Header().Set("Content-Type", "application/x-ndjson; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("X-Accel-Buffering", "no")

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	events := make(chan RunStreamEvent, max(16, len(targets)*2))
	writeDone := make(chan struct{})
	go func() {
		defer close(writeDone)
		for event := range events {
			if ctx.Err() != nil {
				return
			}
			if err := writeRunStreamEvent(w, flusher, event); err != nil {
				cancel()
				return
			}
		}
	}()

	sendEvent := func(event RunStreamEvent) bool {
		select {
		case events <- event:
			return true
		case <-ctx.Done():
			return false
		}
	}

	started := time.Now().UTC()
	if !sendEvent(RunStreamEvent{
		Type:        "start",
		Total:       total,
		TargetTotal: len(targets),
		StartedAt:   started.Format(time.RFC3339),
	}) {
		close(events)
		<-writeDone
		return
	}

	sem := make(chan struct{}, maxConcurrency)
	var wg sync.WaitGroup
	for _, item := range targets {
		item := item
		if item.RunErr != nil {
			sendEvent(RunStreamEvent{
				Type:        "target_error",
				TargetIndex: item.Index,
				TargetLabel: item.Label,
				Status:      item.RunErr.status,
				Error:       item.RunErr.message,
			})
			continue
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			select {
			case sem <- struct{}{}:
			case <-ctx.Done():
				return
			}
			defer func() { <-sem }()
			s.runBatchStreamTarget(ctx, item, total, sendEvent)
		}()
	}

	wg.Wait()
	if ctx.Err() == nil {
		finished := time.Now().UTC()
		sendEvent(RunStreamEvent{
			Type:       "end",
			Total:      total,
			FinishedAt: finished.Format(time.RFC3339),
		})
	}
	close(events)
	<-writeDone
}

func (s *Server) runBatchStreamTarget(ctx context.Context, item batchRunStreamTarget, total int, sendEvent func(RunStreamEvent) bool) {
	prepared := item.Prepared
	targetTotal := len(prepared.Selected)
	if !sendEvent(RunStreamEvent{
		Type:        "target_start",
		Total:       total,
		TargetIndex: item.Index,
		TargetLabel: item.Label,
		TargetTotal: targetTotal,
		Provider:    prepared.Manifest.Provider,
		BaseURL:     prepared.BaseURL,
		EndpointURL: prepared.EndpointURL,
		Model:       prepared.Req.Model,
		StartedAt:   time.Now().UTC().Format(time.RFC3339),
	}) {
		return
	}

	results := make(chan indexedRunCaseResult, targetTotal)
	maxConcurrency := runCaseConcurrency(targetTotal, prepared.Req.MaxConcurrency)
	sem := make(chan struct{}, maxConcurrency)
	var wg sync.WaitGroup
	for index, tc := range prepared.Selected {
		index := index
		tc := tc
		wg.Add(1)
		go func() {
			defer wg.Done()
			select {
			case sem <- struct{}{}:
			case <-ctx.Done():
				results <- indexedRunCaseResult{Index: index, Result: canceledRunCaseResult(tc, prepared.EndpointURL, ctx.Err())}
				return
			}
			defer func() { <-sem }()
			if ctx.Err() != nil {
				results <- indexedRunCaseResult{Index: index, Result: canceledRunCaseResult(tc, prepared.EndpointURL, ctx.Err())}
				return
			}
			log.Printf("batch stream target=%s case=%s index=%d/%d concurrency=%d start", item.Label, tc.CaseID, index+1, targetTotal, maxConcurrency)
			caseEndpointURL := prepared.EndpointURL
			if caseBaseURL := strings.TrimSpace(tc.BaseURL); caseBaseURL != "" {
				caseEndpointURL = buildEndpointURL(caseBaseURL, prepared.Manifest.Endpoint)
			}
			result := runProviderCase(ctx, prepared.Client, caseEndpointURL, prepared.Req.APIKey, prepared.Req.Model, prepared.Manifest, tc)
			log.Printf("batch stream target=%s case=%s index=%d/%d done status=%d latency_ms=%d conclusion=%s error=%q", item.Label, tc.CaseID, index+1, targetTotal, result.HTTPStatus, result.LatencyMS, result.SupportConclusion, result.Error)
			results <- indexedRunCaseResult{Index: index, Result: result}
		}()
	}
	go func() {
		wg.Wait()
		close(results)
	}()

	for resultItem := range results {
		if ctx.Err() != nil {
			return
		}
		result := resultItem.Result
		if !sendEvent(RunStreamEvent{
			Type:        "result",
			Total:       total,
			Index:       resultItem.Index,
			TargetIndex: item.Index,
			TargetLabel: item.Label,
			TargetTotal: targetTotal,
			Result:      &result,
		}) {
			return
		}
	}
	if ctx.Err() != nil {
		return
	}
	sendEvent(RunStreamEvent{
		Type:        "target_end",
		Total:       total,
		TargetIndex: item.Index,
		TargetLabel: item.Label,
		TargetTotal: targetTotal,
		FinishedAt:  time.Now().UTC().Format(time.RFC3339),
	})
}

func applyBatchDefaults(target RunRequest, batch BatchRunRequest) RunRequest {
	if strings.TrimSpace(target.EndpointID) == "" {
		target.EndpointID = batch.EndpointID
	}
	if len(target.CaseIDs) == 0 && len(target.CustomCases) == 0 {
		target.CaseIDs = batch.CaseIDs
		target.CustomCases = batch.CustomCases
	}
	if strings.TrimSpace(target.APIKey) == "" {
		target.APIKey = batch.APIKey
	}
	if strings.TrimSpace(target.BaseURL) == "" {
		target.BaseURL = batch.BaseURL
	}
	if !target.Proxy.Enabled && strings.TrimSpace(target.Proxy.URL) == "" {
		target.Proxy = batch.Proxy
	}
	if target.MaxConcurrency <= 0 {
		target.MaxConcurrency = batch.MaxConcurrency
	}
	return target
}

func runTargetLabel(req RunRequest) string {
	parts := []string{}
	if provider := strings.TrimSpace(req.Provider); provider != "" {
		parts = append(parts, provider)
	}
	if model := strings.TrimSpace(req.Model); model != "" {
		parts = append(parts, model)
	}
	if len(parts) == 0 {
		return "target"
	}
	return strings.Join(parts, " / ")
}

func (s *Server) prepareRunRequest(req RunRequest) (preparedRunRequest, *runRequestError) {
	req.Provider = strings.TrimSpace(req.Provider)
	if req.Provider == "" {
		req.Provider = "siliconflow"
	}
	req.EndpointID = strings.TrimSpace(req.EndpointID)
	req.APIKey = strings.TrimSpace(req.APIKey)
	req.ConfigPlatformID = strings.TrimSpace(req.ConfigPlatformID)
	if req.APIKey == "" && req.ConfigPlatformID != "" {
		if entry, ok := resolveLocalProviderConfig(s.root, req.ConfigPlatformID); ok {
			req.APIKey = strings.TrimSpace(entry.APIKey)
			if strings.TrimSpace(req.BaseURL) == "" {
				req.BaseURL = strings.TrimSpace(entry.BaseURL)
			}
		}
	}
	if req.APIKey == "" {
		return preparedRunRequest{}, &runRequestError{status: http.StatusBadRequest, message: "api_key is required for real provider requests"}
	}

	manifest, cases, err := s.loadProviderForEndpoint(req.Provider, req.EndpointID)
	if err != nil {
		return preparedRunRequest{}, &runRequestError{status: http.StatusNotFound, message: err.Error()}
	}
	selected, err := selectCases(cases, req.CaseIDs, req.CustomCases)
	if err != nil {
		return preparedRunRequest{}, &runRequestError{status: http.StatusBadRequest, message: err.Error()}
	}
	baseURL := strings.TrimSpace(req.BaseURL)
	if baseURL == "" {
		baseURL = manifest.BaseURL
	}
	endpointURL := buildEndpointURL(baseURL, manifest.Endpoint)
	client, err := httpClient(req.Proxy)
	if err != nil {
		return preparedRunRequest{}, &runRequestError{status: http.StatusBadRequest, message: err.Error()}
	}
	return preparedRunRequest{
		Req:         req,
		Manifest:    manifest,
		Selected:    selected,
		BaseURL:     baseURL,
		EndpointURL: endpointURL,
		Client:      client,
	}, nil
}

func (s *Server) runRequest(ctx context.Context, req RunRequest) (RunResponse, *runRequestError) {
	prepared, runErr := s.prepareRunRequest(req)
	if runErr != nil {
		return RunResponse{}, runErr
	}

	started := time.Now().UTC()
	results := make([]RunCaseResult, len(prepared.Selected))
	maxConcurrency := runCaseConcurrency(len(prepared.Selected), prepared.Req.MaxConcurrency)
	sem := make(chan struct{}, maxConcurrency)
	var wg sync.WaitGroup
	for index, tc := range prepared.Selected {
		index := index
		tc := tc
		wg.Add(1)
		go func() {
			defer wg.Done()
			select {
			case sem <- struct{}{}:
			case <-ctx.Done():
				results[index] = canceledRunCaseResult(tc, prepared.EndpointURL, ctx.Err())
				return
			}
			defer func() { <-sem }()
			if ctx.Err() != nil {
				results[index] = canceledRunCaseResult(tc, prepared.EndpointURL, ctx.Err())
				return
			}
			log.Printf("run provider=%s case=%s index=%d/%d concurrency=%d start", prepared.Manifest.Provider, tc.CaseID, index+1, len(prepared.Selected), maxConcurrency)
			caseEndpointURL := prepared.EndpointURL
			if caseBaseURL := strings.TrimSpace(tc.BaseURL); caseBaseURL != "" {
				caseEndpointURL = buildEndpointURL(caseBaseURL, prepared.Manifest.Endpoint)
			}
			result := runProviderCase(ctx, prepared.Client, caseEndpointURL, prepared.Req.APIKey, prepared.Req.Model, prepared.Manifest, tc)
			log.Printf("run provider=%s case=%s index=%d/%d done status=%d latency_ms=%d conclusion=%s error=%q", prepared.Manifest.Provider, tc.CaseID, index+1, len(prepared.Selected), result.HTTPStatus, result.LatencyMS, result.SupportConclusion, result.Error)
			results[index] = result
		}()
	}
	wg.Wait()
	finished := time.Now().UTC()

	return RunResponse{
		Provider:    prepared.Manifest.Provider,
		BaseURL:     prepared.BaseURL,
		EndpointURL: prepared.EndpointURL,
		Model:       prepared.Req.Model,
		Proxy:       prepared.Req.Proxy,
		Results:     results,
		StartedAt:   started.Format(time.RFC3339),
		FinishedAt:  finished.Format(time.RFC3339),
	}, nil
}

func runCaseConcurrency(total, requested int) int {
	if total <= 0 {
		return 1
	}
	limit := defaultRunCaseConcurrency
	if requested > 0 {
		limit = requested
	}
	if limit < 1 {
		limit = 1
	}
	if limit > defaultRunCaseConcurrency {
		limit = defaultRunCaseConcurrency
	}
	if total < limit {
		return total
	}
	return limit
}

func contextErrorMessage(err error) string {
	if errors.Is(err, context.Canceled) {
		return "run canceled by client"
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return "run deadline exceeded"
	}
	if err != nil {
		return err.Error()
	}
	return "run canceled"
}

func canceledRunCaseResult(tc TestCase, endpointURL string, err error) RunCaseResult {
	return RunCaseResult{
		CaseID:                    tc.CaseID,
		Title:                     tc.Title,
		Category:                  tc.Category,
		Parameters:                tc.Parameters,
		Method:                    tc.Method,
		URL:                       endpointURL,
		RequestBody:               cloneMap(tc.Payload),
		ExpectedHTTPStatus:        expectedHTTPStatus(tc.Expect),
		ExpectedSupportConclusion: expectedSupportConclusion(tc.Expect),
		HTTPStatus:                0,
		Error:                     contextErrorMessage(err),
		SupportConclusion:         "request_failed",
		Assertions: []CaseAssertion{{
			Name:    "run_canceled",
			Pass:    false,
			Message: contextErrorMessage(err),
		}},
	}
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":   true,
		"time": time.Now().UTC().Format(time.RFC3339),
	})
}

func (s *Server) handleLocalConfig(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/api/local-config" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	providers, err := loadLocalConfig(s.root)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	out := map[string]map[string]string{}
	for id, entry := range providers {
		key := strings.TrimSpace(entry.APIKey)
		if key == "" || isPlaceholderAPIKey(key) {
			continue
		}
		out[id] = map[string]string{
			"base_url":     strings.TrimSpace(entry.BaseURL),
			"api_key_hint": maskAPIKey(key),
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"providers": out})
}

func (s *Server) handleProviders(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/api/providers" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	payloadRoot := filepath.Join(s.root, "payloads")
	entries, err := os.ReadDir(payloadRoot)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	providers := make([]string, 0)
	for _, entry := range entries {
		if entry.IsDir() && exists(filepath.Join(payloadRoot, entry.Name(), "manifest.json")) {
			providers = append(providers, entry.Name())
		}
	}
	sort.Strings(providers)
	writeJSON(w, http.StatusOK, map[string]any{"providers": providers})
}

func (s *Server) handleProviderRoutes(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/providers/"), "/")
	if len(parts) < 2 || parts[0] == "" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	provider := parts[0]
	switch {
	case len(parts) == 2 && parts[1] == "cases":
		s.handleCases(w, r, provider)
	case len(parts) == 4 && parts[1] == "cases" && parts[3] == "payload":
		s.handleCasePayload(w, r, provider, parts[2])
	default:
		writeError(w, http.StatusNotFound, "not found")
	}
}

func (s *Server) handleCases(w http.ResponseWriter, r *http.Request, provider string) {
	endpointID := strings.TrimSpace(r.URL.Query().Get("endpoint_id"))
	manifest, cases, err := s.loadProviderForEndpoint(provider, endpointID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	summaries := make([]CaseSummary, 0, len(cases))
	byParam := map[string][]CaseSummary{}
	byCategory := map[string][]CaseSummary{}
	paramSet := map[string]bool{}
	categorySet := map[string]bool{}

	for _, tc := range cases {
		summary := CaseSummary{
			CaseID:                  tc.CaseID,
			Title:                   tc.Title,
			Category:                tc.Category,
			Parameters:              tc.Parameters,
			RequiresModelCapability: tc.RequiresModelCapability,
			Optional:                tc.Optional,
			File:                    tc.File,
		}
		summaries = append(summaries, summary)
		if tc.Category != "" {
			categorySet[tc.Category] = true
			byCategory[tc.Category] = append(byCategory[tc.Category], summary)
		}
		for _, param := range tc.Parameters {
			paramSet[param] = true
			byParam[param] = append(byParam[param], summary)
		}
	}

	writeJSON(w, http.StatusOK, ProviderCasesResponse{
		Provider:         manifest.Provider,
		BaseURL:          manifest.BaseURL,
		Endpoint:         manifest.Endpoint,
		Method:           manifest.Method,
		DefaultModel:     manifest.DefaultModel,
		ReasoningModel:   manifest.ReasoningModel,
		VisionModel:      manifest.VisionModel,
		Notes:            manifest.Notes,
		CommonExpect:     manifest.CommonExpect,
		Cases:            cases,
		CasesByParameter: byParam,
		CasesByCategory:  byCategory,
		Parameters:       sortedKeys(paramSet),
		Categories:       sortedKeys(categorySet),
	})
}

func (s *Server) handleCasePayload(w http.ResponseWriter, r *http.Request, provider, caseID string) {
	endpointID := strings.TrimSpace(r.URL.Query().Get("endpoint_id"))
	_, cases, err := s.loadProviderForEndpoint(provider, endpointID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	for _, tc := range cases {
		if tc.CaseID == caseID {
			writeJSON(w, http.StatusOK, tc)
			return
		}
	}
	writeError(w, http.StatusNotFound, fmt.Sprintf("case %s not found", caseID))
}

func (s *Server) loadProvider(provider string) (Manifest, []TestCase, error) {
	return s.loadProviderForEndpoint(provider, "")
}

func (s *Server) loadProviderForEndpoint(provider, endpointID string) (Manifest, []TestCase, error) {
	suffix := endpointSuffix(endpointID)
	if suffix != "" && !strings.HasSuffix(provider, "_"+suffix) {
		provider = provider + "_" + suffix
	}
	providerDir := filepath.Join(s.root, "payloads", provider)
	manifestPath := filepath.Join(providerDir, "manifest.json")
	var manifest Manifest
	if err := readJSONFile(manifestPath, &manifest); err != nil {
		return Manifest{}, nil, err
	}

	cases := make([]TestCase, 0, len(manifest.Cases))
	for _, file := range manifest.Cases {
		if !safeJSONName(file) {
			return Manifest{}, nil, fmt.Errorf("unsafe case filename %q", file)
		}
		var tc TestCase
		if err := readJSONFile(filepath.Join(providerDir, file), &tc); err != nil {
			return Manifest{}, nil, err
		}
		tc.File = file
		tc.Expect = mergeExpect(manifest.CommonExpect, tc.Expect)
		cases = append(cases, tc)
	}
	return manifest, cases, nil
}

func mergeExpect(common, override map[string]any) map[string]any {
	if len(common) == 0 && len(override) == 0 {
		return nil
	}
	merged := cloneMap(common)
	if merged == nil {
		merged = map[string]any{}
	}
	for key, value := range override {
		merged[key] = value
	}
	return merged
}

func endpointSuffix(endpointID string) string {
	switch endpointID {
	case "", "chat_completions":
		return ""
	case "anthropic_messages":
		return "messages"
	default:
		return endpointID
	}
}

func selectCases(cases []TestCase, caseIDs []string, customCases []TestCase) ([]TestCase, error) {
	if len(caseIDs) == 0 && len(customCases) == 0 {
		return nil, errors.New("case_ids or custom_cases must contain at least one case")
	}
	byID := make(map[string]TestCase, len(cases))
	for _, tc := range cases {
		byID[tc.CaseID] = tc
	}
	selected := make([]TestCase, 0, len(caseIDs)+len(customCases))
	for _, id := range caseIDs {
		id = strings.TrimSpace(id)
		tc, ok := byID[id]
		if !ok {
			return nil, fmt.Errorf("case %s not found", id)
		}
		selected = append(selected, tc)
	}
	for index, tc := range customCases {
		normalized, err := normalizeCustomCase(tc, index+1)
		if err != nil {
			return nil, err
		}
		selected = append(selected, normalized)
	}
	return selected, nil
}

func normalizeCustomCase(tc TestCase, index int) (TestCase, error) {
	if tc.Payload == nil || len(tc.Payload) == 0 {
		return TestCase{}, fmt.Errorf("custom case %d payload is required", index)
	}
	tc.CaseID = strings.TrimSpace(tc.CaseID)
	if tc.CaseID == "" {
		tc.CaseID = fmt.Sprintf("custom_payload_%02d", index)
	}
	tc.Title = strings.TrimSpace(tc.Title)
	if tc.Title == "" {
		tc.Title = fmt.Sprintf("Custom payload %d", index)
	}
	tc.Category = strings.TrimSpace(tc.Category)
	if tc.Category == "" {
		tc.Category = "custom"
	}
	tc.Method = strings.TrimSpace(tc.Method)
	if tc.Method == "" {
		tc.Method = http.MethodPost
	}
	if len(tc.Parameters) == 0 {
		tc.Parameters = []string{"payload"}
	}
	if tc.Expect == nil {
		tc.Expect = map[string]any{"http_status": 200}
	}
	return tc, nil
}

func httpClient(proxy ProxyConfig) (*http.Client, error) {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	if proxy.Enabled {
		proxyURL := strings.TrimSpace(proxy.URL)
		if proxyURL == "" {
			return nil, errors.New("proxy.url is required when proxy.enabled is true")
		}
		parsed, err := url.Parse(proxyURL)
		if err != nil {
			return nil, fmt.Errorf("invalid proxy url: %w", err)
		}
		transport.Proxy = http.ProxyURL(parsed)
	}
	return &http.Client{
		Transport: transport,
		Timeout:   90 * time.Second,
	}, nil
}

func buildEndpointURL(baseURL, endpoint string) string {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	endpoint = strings.TrimSpace(endpoint)
	if endpoint == "" {
		return baseURL
	}
	endpointPath := "/" + strings.TrimLeft(endpoint, "/")
	if strings.HasSuffix(baseURL, endpointPath) {
		return baseURL
	}
	return baseURL + endpointPath
}

func runProviderCase(ctx context.Context, client *http.Client, endpointURL, apiKey, model string, manifest Manifest, tc TestCase) RunCaseResult {
	requestBody := cloneMap(tc.Payload)
	if strings.TrimSpace(model) != "" {
		requestBody["model"] = strings.TrimSpace(model)
	}

	result := RunCaseResult{
		CaseID:                    tc.CaseID,
		Title:                     tc.Title,
		Category:                  tc.Category,
		Parameters:                tc.Parameters,
		Method:                    tc.Method,
		URL:                       endpointURL,
		RequestHeaders:            requestHeaders(tc.Headers, manifest),
		RequestBody:               requestBody,
		ExpectedHTTPStatus:        expectedHTTPStatus(tc.Expect),
		ExpectedSupportConclusion: expectedSupportConclusion(tc.Expect),
	}

	if probe, ok := capacityProbeSpec(requestBody); ok {
		return runCapacityProbeCase(ctx, client, endpointURL, apiKey, manifest, tc, result, probe)
	}
	if probe, ok := cacheProbeSpec(requestBody); ok {
		return runCacheProbeCase(ctx, client, endpointURL, apiKey, manifest, tc, result, probe)
	}

	bodyBytes, err := json.Marshal(requestBody)
	if err != nil {
		result.Error = fmt.Sprintf("marshal request body: %v", err)
		finalizeCaseResult(&result, err, tc.Expect)
		return result
	}

	attempts := streamProbeAttemptsCount(tc.Expect)
	if requestStreamEnabled(requestBody) && attempts > 1 {
		return runStreamProbeCase(ctx, client, endpointURL, apiKey, manifest, tc, result, bodyBytes, attempts)
	}
	return executeProviderCase(ctx, client, endpointURL, apiKey, manifest, tc, result, bodyBytes)
}

func executeProviderCase(ctx context.Context, client *http.Client, endpointURL, apiKey string, manifest Manifest, tc TestCase, result RunCaseResult, bodyBytes []byte) RunCaseResult {
	stream := requestStreamEnabled(result.RequestBody)
	start := time.Now()
	resp, err := doProviderRequest(ctx, client, endpointURL, apiKey, manifest, tc.Headers, bodyBytes, expectedHTTPStatus(tc.Expect))
	result.LatencyMS = time.Since(start).Milliseconds()
	if err != nil {
		result.Error = err.Error()
		finalizeCaseResult(&result, err, tc.Expect)
		return result
	}
	defer resp.Body.Close()

	result.HTTPStatus = resp.StatusCode
	result.ResponseHeaders = responseHeaders(resp.Header)
	raw, metrics, readErr := readProviderResponseBody(io.LimitReader(resp.Body, 4<<20), start, stream)
	if readErr != nil {
		result.Error = fmt.Sprintf("read response body: %v", readErr)
		finalizeCaseResult(&result, readErr, tc.Expect)
		return result
	}
	result.RawResponse = raw
	if metrics != nil {
		result.StreamMetrics = metrics
	}
	if parsed, ok := parseJSON([]byte(raw)); ok {
		result.ResponseBody = parsed
	}
	if result.HTTPStatus >= 400 {
		result.Error = providerErrorMessage(result.ResponseBody, result.RawResponse, resp.Status)
		if optionalCapabilityMismatch(result, tc.Expect) {
			result.Error = ""
		}
	}
	result.Assertions = evaluateAssertions(result, tc.Expect)
	populateStreamUsagePresent(&result)
	populateStreamUsageChunkProfile(&result)
	populateOutputLengthMetrics(&result)
	populateThinkingTokenMetrics(&result)
	finalizeCaseResult(&result, nil, tc.Expect)
	return result
}

func runStreamProbeCase(ctx context.Context, client *http.Client, endpointURL, apiKey string, manifest Manifest, tc TestCase, result RunCaseResult, bodyBytes []byte, attempts int) RunCaseResult {
	probeAttempts := make([]StreamProbeAttempt, 0, attempts)
	var totalLatency int64
	lastResult := result

	for i := 1; i <= attempts; i++ {
		attemptResult := executeProviderCase(ctx, client, endpointURL, apiKey, manifest, tc, result, bodyBytes)
		probeAttempts = append(probeAttempts, StreamProbeAttempt{
			Attempt:       i,
			HTTPStatus:    attemptResult.HTTPStatus,
			LatencyMS:     attemptResult.LatencyMS,
			StreamMetrics: attemptResult.StreamMetrics,
			Error:         attemptResult.Error,
		})
		totalLatency += attemptResult.LatencyMS
		lastResult = attemptResult
		if attemptResult.Error != "" && attemptResult.HTTPStatus == 0 {
			break
		}
	}

	lastResult.StreamProbeAttempts = probeAttempts
	lastResult.LatencyMS = totalLatency
	lastResult.Assertions = evaluateAssertions(lastResult, tc.Expect)
	populateStreamUsagePresent(&lastResult)
	populateStreamUsageChunkProfile(&lastResult)
	populateOutputLengthMetrics(&lastResult)
	populateThinkingTokenMetrics(&lastResult)
	finalizeCaseResult(&lastResult, nil, tc.Expect)
	return lastResult
}

func requestStreamEnabled(request map[string]any) bool {
	enabled, ok := request["stream"].(bool)
	return ok && enabled
}

func streamProbeAttemptsCount(expect map[string]any) int {
	if expect == nil {
		return 1
	}
	value, ok := intFromExpect(expect["stream_probe_attempts"])
	if !ok || value <= 1 {
		return 1
	}
	return value
}

func readProviderResponseBody(body io.Reader, started time.Time, stream bool) (string, *StreamMetrics, error) {
	if !stream {
		raw, err := io.ReadAll(body)
		if err != nil {
			return "", nil, err
		}
		return string(raw), nil, nil
	}
	raw, metrics, err := readProviderSSEStream(body, started)
	if err != nil {
		return raw, nil, err
	}
	return raw, &metrics, nil
}

func readProviderSSEStream(body io.Reader, started time.Time) (string, StreamMetrics, error) {
	scanner := bufio.NewScanner(body)
	scanner.Buffer(make([]byte, 0, 64*1024), 4<<20)
	var builder strings.Builder
	metrics := StreamMetrics{}
	var firstContentAt time.Time
	var lastContentAt time.Time

	for scanner.Scan() {
		line := scanner.Text()
		builder.WriteString(line)
		builder.WriteByte('\n')

		trimmed := strings.TrimSpace(line)
		if !strings.HasPrefix(trimmed, "data:") {
			continue
		}
		dataLine := strings.TrimSpace(strings.TrimPrefix(trimmed, "data:"))
		if dataLine == "" || dataLine == "[DONE]" {
			continue
		}
		now := time.Now()
		if metrics.SSEChunkCount == 0 {
			metrics.FirstChunkMS = now.Sub(started).Milliseconds()
		}
		metrics.SSEChunkCount++

		if content := sseChunkContent(dataLine); content != "" {
			if metrics.ContentChunkCount == 0 {
				firstContentAt = now
			}
			lastContentAt = now
			metrics.ContentChunkCount++
			metrics.LastChunkMS = now.Sub(started).Milliseconds()
		}
		if reasoning := sseChunkReasoningContent(dataLine); reasoning != "" {
			if metrics.ContentChunkCount == 0 && metrics.ReasoningChunkCount == 0 {
				firstContentAt = now
			}
			lastContentAt = now
			metrics.ReasoningChunkCount++
			metrics.LastChunkMS = now.Sub(started).Milliseconds()
		}
	}
	if err := scanner.Err(); err != nil {
		return builder.String(), metrics, err
	}
	if !firstContentAt.IsZero() && !lastContentAt.IsZero() {
		metrics.ChunkSpreadMS = lastContentAt.Sub(firstContentAt).Milliseconds()
	}
	return builder.String(), metrics, nil
}

func sseChunkContent(dataLine string) string {
	var chunk struct {
		Choices []struct {
			Text  string `json:"text"`
			Delta struct {
				Content any `json:"content"`
			} `json:"delta"`
		} `json:"choices"`
	}
	if err := json.Unmarshal([]byte(dataLine), &chunk); err != nil || len(chunk.Choices) == 0 {
		return ""
	}
	if chunk.Choices[0].Text != "" {
		return chunk.Choices[0].Text
	}
	switch value := chunk.Choices[0].Delta.Content.(type) {
	case string:
		return value
	case []any:
		var builder strings.Builder
		for _, item := range value {
			object, ok := item.(map[string]any)
			if !ok {
				continue
			}
			if text, ok := object["text"].(string); ok {
				builder.WriteString(text)
			}
		}
		return builder.String()
	default:
		return ""
	}
}

func sseChunkReasoningContent(dataLine string) string {
	var chunk struct {
		Choices []struct {
			Delta struct {
				ReasoningContent any `json:"reasoning_content"`
			} `json:"delta"`
		} `json:"choices"`
	}
	if err := json.Unmarshal([]byte(dataLine), &chunk); err != nil || len(chunk.Choices) == 0 {
		return ""
	}
	switch value := chunk.Choices[0].Delta.ReasoningContent.(type) {
	case string:
		return value
	default:
		return ""
	}
}

func streamIncrementalChunkCount(metrics StreamMetrics) int {
	return metrics.ContentChunkCount + metrics.ReasoningChunkCount
}

func streamIncrementalChunkMessage(metrics StreamMetrics, minChunks int) string {
	incremental := streamIncrementalChunkCount(metrics)
	message := fmt.Sprintf("预期 >= %d 个增量 chunk（content/reasoning），实际 %d（content %d · reasoning %d）", minChunks, incremental, metrics.ContentChunkCount, metrics.ReasoningChunkCount)
	if incremental == 1 {
		message = fmt.Sprintf("仅收到 1 个增量 chunk（疑似伪流式），预期 >= %d（content %d · reasoning %d）", minChunks, metrics.ContentChunkCount, metrics.ReasoningChunkCount)
	}
	return message
}

type capacityProbe struct {
	Kind                     string
	Candidates               []int
	ContextOutputTokens      int
	ContextSafetyMarginRatio float64
	// Exhaustive disables boundary early-stop so every candidate is tested.
	// Used by effectiveness probes (max_output_effective, thinking_budget).
	Exhaustive bool
	// Balanced total_context: when both > 0, each context tier is split into
	// input/output below the measured caps so the true context (which can
	// exceed the input cap) is reached instead of being clipped by the input limit.
	BalancedMaxInputTokens  int
	BalancedMaxOutputTokens int
	// thinking_budget: dialect field path and whether to also send enable_thinking.
	ThinkingField  string
	EnableThinking bool
}

type capacityAttempt struct {
	CaseID                    string         `json:"case_id"`
	Candidate                 int            `json:"candidate"`
	CandidateDisplay          string         `json:"candidate_display"`
	TestedTotalContextTokens  int            `json:"tested_total_context_tokens,omitempty"`
	TestedTotalContextDisplay string         `json:"tested_total_context_display,omitempty"`
	AppliedSafetyMarginTokens int            `json:"applied_context_safety_margin_tokens,omitempty"`
	ContextSafetyMarginRatio  float64        `json:"context_safety_margin_ratio,omitempty"`
	HTTPStatus                int            `json:"http_status"`
	LatencyMS                 int64          `json:"latency_ms"`
	Conclusion                string         `json:"conclusion"`
	Error                     string         `json:"error,omitempty"`
	FinishReason              string         `json:"finish_reason,omitempty"`
	Usage                     map[string]any `json:"usage,omitempty"`
	EstimatedInputTokens      int            `json:"estimated_input_tokens,omitempty"`
	RequestedMaxOutputTokens  int            `json:"requested_max_output_tokens,omitempty"`
	EstimatedTotalContextToks int            `json:"estimated_total_context_tokens,omitempty"`
	CompletionTokens          int            `json:"completion_tokens,omitempty"`
	ReasoningTokens           int            `json:"reasoning_tokens,omitempty"`
	RequestedThinkingBudget   int            `json:"requested_thinking_budget,omitempty"`
	Effective                 *bool          `json:"effective,omitempty"`
	EffectiveReason           string         `json:"effective_reason,omitempty"`
}

func capacityProbeSpec(payload map[string]any) (capacityProbe, bool) {
	raw, ok := payload["__capacity_probe"]
	if !ok {
		return capacityProbe{}, false
	}
	spec, ok := raw.(map[string]any)
	if !ok {
		return capacityProbe{}, false
	}
	kind, _ := spec["kind"].(string)
	kind = strings.TrimSpace(kind)
	if !capacityKindSupported(kind) {
		return capacityProbe{}, false
	}
	candidates := capacityIntSlice(spec["candidates"])
	if len(candidates) == 0 {
		candidates = defaultCapacityCandidates(kind)
	}
	sort.Sort(sort.Reverse(sort.IntSlice(candidates)))
	outputTokens, _ := intValue(spec["context_output_tokens"])
	if outputTokens <= 0 {
		outputTokens = 8
	}
	contextSafetyMarginRatio, ok := floatValue(spec["context_safety_margin_ratio"])
	if !ok || contextSafetyMarginRatio <= 0 || contextSafetyMarginRatio >= 1 {
		contextSafetyMarginRatio = 0.05
	}
	probe := capacityProbe{
		Kind:                     kind,
		Candidates:               candidates,
		ContextOutputTokens:      outputTokens,
		ContextSafetyMarginRatio: contextSafetyMarginRatio,
		Exhaustive:               kind == "max_output_effective" || kind == "thinking_budget",
	}
	if v, ok := intValue(spec["balanced_max_input_tokens"]); ok && v > 0 {
		probe.BalancedMaxInputTokens = v
	}
	if v, ok := intValue(spec["balanced_max_output_tokens"]); ok && v > 0 {
		probe.BalancedMaxOutputTokens = v
	}
	if field, ok := spec["thinking_field"].(string); ok {
		probe.ThinkingField = strings.TrimSpace(field)
	}
	if probe.Kind == "thinking_budget" && probe.ThinkingField == "" {
		probe.ThinkingField = "thinking_budget"
	}
	if enable, ok := spec["enable_thinking"].(bool); ok {
		probe.EnableThinking = enable
	}
	return probe, true
}

func capacityKindSupported(kind string) bool {
	switch kind {
	case "max_output", "total_context", "max_input", "max_output_effective", "thinking_budget":
		return true
	}
	return false
}

var commonCapacityCandidates = []int{4194304, 2097152, 1048576, 524288, 262144, 131072, 65536, 32768, 16384, 8192, 4096, 2048, 1024}

func defaultCapacityCandidates(kind string) []int {
	switch kind {
	case "max_output_effective":
		return []int{512, 64}
	case "thinking_budget":
		return []int{32768, 16384, 8192, 4096, 2048, 1024, 512, 256, 128}
	default:
		return append([]int(nil), commonCapacityCandidates...)
	}
}

func capacityIsEffectivenessKind(kind string) bool {
	return kind == "max_output_effective" || kind == "thinking_budget"
}

func capacityIntSlice(value any) []int {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	out := make([]int, 0, len(items))
	seen := map[int]bool{}
	for _, item := range items {
		number, ok := intValue(item)
		if !ok || number <= 0 || seen[number] {
			continue
		}
		seen[number] = true
		out = append(out, number)
	}
	return out
}

func runCapacityProbeCase(ctx context.Context, client *http.Client, endpointURL, apiKey string, manifest Manifest, tc TestCase, result RunCaseResult, probe capacityProbe) RunCaseResult {
	model, _ := result.RequestBody["model"].(string)
	if strings.TrimSpace(model) == "" {
		model = manifest.DefaultModel
	}
	result.RequestBody = map[string]any{
		"model":            model,
		"__capacity_probe": result.RequestBody["__capacity_probe"],
	}

	attempts := []capacityAttempt{}
	sawNonSupported := false
	stoppedByBoundary := false
	for _, candidate := range probe.Candidates {
		if ctx.Err() != nil {
			attempts = append(attempts, capacityAttempt{
				CaseID:           capacityAttemptCaseID(tc.CaseID, candidate),
				Candidate:        candidate,
				CandidateDisplay: capacityTierDisplay(candidate),
				Conclusion:       "request_failed",
				Error:            contextErrorMessage(ctx.Err()),
			})
			break
		}
		attemptPayload, estimatedInputTokens, requestedOutputTokens, testedTotalContextTokens, appliedSafetyMarginTokens := capacityAttemptPayload(manifest, probe, model, candidate)
		bodyBytes, err := json.Marshal(attemptPayload)
		attempt := capacityAttempt{
			CaseID:                    capacityAttemptCaseID(tc.CaseID, candidate),
			Candidate:                 candidate,
			CandidateDisplay:          capacityTierDisplay(candidate),
			TestedTotalContextTokens:  testedTotalContextTokens,
			TestedTotalContextDisplay: capacityTierDisplay(testedTotalContextTokens),
			AppliedSafetyMarginTokens: appliedSafetyMarginTokens,
			ContextSafetyMarginRatio:  probe.ContextSafetyMarginRatio,
			EstimatedInputTokens:      estimatedInputTokens,
			RequestedMaxOutputTokens:  requestedOutputTokens,
			EstimatedTotalContextToks: estimatedInputTokens + requestedOutputTokens,
		}
		if probe.Kind == "thinking_budget" {
			attempt.RequestedThinkingBudget = candidate
		}
		start := time.Now()
		if err != nil {
			attempt.LatencyMS = time.Since(start).Milliseconds()
			attempt.Conclusion = "request_failed"
			attempt.Error = fmt.Sprintf("marshal request body: %v", err)
			attempts = append(attempts, attempt)
			break
		}
		resp, err := doProviderRequest(ctx, client, endpointURL, apiKey, manifest, tc.Headers, bodyBytes, 0)
		attempt.LatencyMS = time.Since(start).Milliseconds()
		if err != nil {
			attempt.Conclusion = "request_failed"
			attempt.Error = err.Error()
			attempts = append(attempts, attempt)
		} else {
			raw, readErr := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
			resp.Body.Close()
			attempt.HTTPStatus = resp.StatusCode
			if parsed, ok := parseJSON(raw); ok {
				attempt.Usage = capacityUsageMap(parsed)
				attempt.FinishReason = capacityFinishReason(parsed, isAnthropicMessagesEndpoint(manifest))
				if ct, ok := capacityCompletionTokens(parsed); ok {
					attempt.CompletionTokens = ct
				}
				if rt, ok := maxTokenFieldCount(parsed, "reasoning_tokens"); ok {
					attempt.ReasoningTokens = rt
				}
			}
			if readErr != nil {
				attempt.Conclusion = "request_failed"
				attempt.Error = fmt.Sprintf("read response body: %v", readErr)
			} else {
				attempt.Conclusion = capacityConclusion(resp.StatusCode)
				if resp.StatusCode >= 400 {
					var parsed any
					if value, ok := parseJSON(raw); ok {
						parsed = value
					}
					attempt.Error = providerErrorMessage(parsed, string(raw), resp.Status)
				}
			}
			result.ResponseHeaders = responseHeaders(resp.Header)
		}
		if probe.Kind == "max_output_effective" && attempt.Conclusion == "supported" {
			eff, reason := evaluateOutputCapEffective(attempt)
			attempt.Effective = &eff
			attempt.EffectiveReason = reason
		}
		attempts = append(attempts, attempt)

		if !probe.Exhaustive {
			if attempt.Conclusion == "supported" && sawNonSupported {
				stoppedByBoundary = true
				break
			}
			if attempt.Conclusion == "supported" && !sawNonSupported {
				break
			}
			if attempt.Conclusion != "supported" {
				sawNonSupported = true
			}
		}
	}

	summary := capacitySummary(probe, attempts, stoppedByBoundary)
	result.HTTPStatus = capacityResultHTTPStatus(attempts)
	result.LatencyMS = capacityTotalLatency(attempts)
	result.ResponseBody = summary
	if raw, err := json.Marshal(summary); err == nil {
		result.RawResponse = string(raw)
	}

	label := capacityDisplayLabel(probe.Kind)
	display, _ := summary["capacity_display"].(map[string]any)
	displayText, _ := display[label].(string)

	if probe.Kind == "max_output_effective" {
		effective, _ := summary["effective"].(bool)
		result.SupportConclusion = "supported"
		if !effective {
			result.SupportConclusion = "schema_mismatch"
		}
		result.Assertions = []CaseAssertion{{
			Name:    "capacity_output_effective",
			Pass:    effective,
			Message: fmt.Sprintf("%s：%s", label, displayText),
		}}
		return result
	}

	if probe.Kind == "thinking_budget" {
		accepted, _ := summary["budget_accepted"].(bool)
		if accepted {
			result.SupportConclusion = "supported"
		} else {
			result.SupportConclusion = "rejected_400"
		}
		result.Assertions = []CaseAssertion{{
			Name:    "capacity_thinking_budget",
			Pass:    accepted,
			Message: fmt.Sprintf("%s：%s", label, displayText),
		}}
		if !accepted {
			result.Error = "思考预算字段未被接受"
		}
		return result
	}

	if supportedMax, _ := intValue(summary["supported_max"]); supportedMax > 0 {
		result.SupportConclusion = "supported"
		result.Assertions = []CaseAssertion{{
			Name:    "capacity_boundary",
			Pass:    true,
			Message: fmt.Sprintf("%s：%s", label, summary["supported_max_display"]),
		}}
		return result
	}
	result.SupportConclusion = "request_failed"
	result.Error = "当前候选档位内未测到支持项"
	result.Assertions = []CaseAssertion{{
		Name:    "capacity_boundary",
		Pass:    false,
		Message: result.Error,
	}}
	return result
}

type cacheProbe struct {
	Kind          string
	WarmupDelayMS int
	MinHitRate    float64
}

type cacheProbeAttempt struct {
	Attempt      int            `json:"attempt"`
	HTTPStatus   int            `json:"http_status"`
	LatencyMS    int64          `json:"latency_ms"`
	Usage        map[string]any `json:"usage,omitempty"`
	HitTokens    int            `json:"hit_tokens,omitempty"`
	MissTokens   int            `json:"miss_tokens,omitempty"`
	PromptTokens int            `json:"prompt_tokens,omitempty"`
	HitRate      float64        `json:"hit_rate,omitempty"`
	HitField     string         `json:"hit_field,omitempty"`
	Error        string         `json:"error,omitempty"`
}

func cacheProbeSpec(payload map[string]any) (cacheProbe, bool) {
	raw, ok := payload["__cache_probe"]
	if !ok {
		return cacheProbe{}, false
	}
	spec, ok := raw.(map[string]any)
	if !ok {
		return cacheProbe{}, false
	}
	kind, _ := spec["kind"].(string)
	kind = strings.TrimSpace(kind)
	if !cacheKindSupported(kind) {
		return cacheProbe{}, false
	}
	delayMS, _ := intValue(spec["warmup_delay_ms"])
	if delayMS <= 0 {
		delayMS = 400
	}
	minHitRate, ok := floatValue(spec["min_hit_rate"])
	if !ok || minHitRate < 0 {
		minHitRate = 0
	}
	if minHitRate > 1 {
		minHitRate = 1
	}
	return cacheProbe{Kind: kind, WarmupDelayMS: delayMS, MinHitRate: minHitRate}, true
}

func cacheKindSupported(kind string) bool {
	switch kind {
	case "passive", "prompt_cache_key", "cache_control":
		return true
	default:
		return false
	}
}

func cacheProbeLongContext() string {
	const block = "Provider-diff cache probe. Repeatable context block: compatibility testing records whether request fields are supported, ignored, or rejected. This sentence is repeated to exceed the passive cache threshold. "
	return strings.Repeat(block, 12)
}

func cacheAttemptPayload(manifest Manifest, probe cacheProbe, model string) map[string]any {
	contextText := cacheProbeLongContext()
	userPrompt := "Reply with the word cached."
	messagesEndpoint := isAnthropicMessagesEndpoint(manifest)

	switch probe.Kind {
	case "prompt_cache_key":
		return map[string]any{
			"model": model,
			"messages": []map[string]any{
				{"role": "system", "content": contextText},
				{"role": "user", "content": userPrompt},
			},
			"prompt_cache_key":      "provider-diff-cache-probe",
			"max_completion_tokens": 20,
		}
	case "cache_control":
		if messagesEndpoint {
			return map[string]any{
				"model":      model,
				"max_tokens": 64,
				"system": []map[string]any{
					{
						"type": "text",
						"text": contextText,
						"cache_control": map[string]any{
							"type": "ephemeral",
						},
					},
				},
				"messages": []map[string]any{
					{"role": "user", "content": userPrompt},
				},
			}
		}
		return map[string]any{
			"model": model,
			"messages": []map[string]any{
				{
					"role": "user",
					"content": []map[string]any{
						{
							"type": "text",
							"text": contextText,
							"cache_control": map[string]any{
								"type": "ephemeral",
							},
						},
						{
							"type": "text",
							"text": userPrompt,
						},
					},
				},
			},
			"max_completion_tokens": 20,
		}
	default:
		if messagesEndpoint {
			return map[string]any{
				"model":      model,
				"max_tokens": 64,
				"system":     contextText,
				"messages": []map[string]any{
					{"role": "user", "content": userPrompt},
				},
			}
		}
		return map[string]any{
			"model": model,
			"messages": []map[string]any{
				{"role": "system", "content": contextText},
				{"role": "user", "content": userPrompt},
			},
			"max_completion_tokens": 20,
		}
	}
}

func extractCacheHitMetrics(usage map[string]any) (hit, miss, prompt int, field string, hasField bool) {
	if usage == nil {
		return 0, 0, 0, "", false
	}
	if details, ok := usage["prompt_tokens_details"].(map[string]any); ok {
		if _, exists := details["cached_tokens"]; exists {
			hit, _ = intValue(details["cached_tokens"])
			field = "usage.prompt_tokens_details.cached_tokens"
			hasField = true
		}
	}
	if _, exists := usage["prompt_cache_hit_tokens"]; exists {
		if field == "" {
			if v, ok := intValue(usage["prompt_cache_hit_tokens"]); ok {
				hit = v
			}
			field = "usage.prompt_cache_hit_tokens"
		}
		hasField = true
	}
	if _, exists := usage["prompt_cache_miss_tokens"]; exists {
		if v, ok := intValue(usage["prompt_cache_miss_tokens"]); ok {
			miss = v
		}
		if field == "" {
			field = "usage.prompt_cache_miss_tokens"
		}
		hasField = true
	}
	if v, ok := intValue(usage["prompt_tokens"]); ok {
		prompt = v
	} else if v, ok := intValue(usage["input_tokens"]); ok {
		prompt = v
	}
	return hit, miss, prompt, field, hasField
}

func cacheHitRate(hit, miss, prompt int) float64 {
	denom := 0
	if hit > 0 || miss > 0 {
		denom = hit + miss
	} else if prompt > 0 {
		denom = prompt
	}
	if denom <= 0 {
		return 0
	}
	return float64(hit) / float64(denom)
}

func formatCacheHitRate(rate float64) string {
	if rate <= 0 {
		return "0%"
	}
	return fmt.Sprintf("%.1f%%", rate*100)
}

func cacheUsageMap(value any) map[string]any {
	root, ok := value.(map[string]any)
	if !ok {
		return nil
	}
	usage, ok := root["usage"].(map[string]any)
	if !ok {
		return nil
	}
	return usage
}

func runCacheProbeCase(ctx context.Context, client *http.Client, endpointURL, apiKey string, manifest Manifest, tc TestCase, result RunCaseResult, probe cacheProbe) RunCaseResult {
	model, _ := result.RequestBody["model"].(string)
	if strings.TrimSpace(model) == "" {
		model = manifest.DefaultModel
	}
	attemptPayload := cacheAttemptPayload(manifest, probe, model)
	result.RequestBody = map[string]any{
		"model":         model,
		"__cache_probe": result.RequestBody["__cache_probe"],
	}

	attempts := make([]cacheProbeAttempt, 0, 2)
	var totalLatency int64
	var measureAttempt cacheProbeAttempt
	var lastHTTPStatus int

	for i := 1; i <= 2; i++ {
		if ctx.Err() != nil {
			attempts = append(attempts, cacheProbeAttempt{
				Attempt: i,
				Error:   contextErrorMessage(ctx.Err()),
			})
			break
		}
		if i == 2 && probe.WarmupDelayMS > 0 {
			if !providerRetrySleep(ctx, time.Duration(probe.WarmupDelayMS)*time.Millisecond) {
				attempts = append(attempts, cacheProbeAttempt{
					Attempt: 2,
					Error:   contextErrorMessage(ctx.Err()),
				})
				break
			}
		}

		bodyBytes, err := json.Marshal(attemptPayload)
		attempt := cacheProbeAttempt{Attempt: i}
		start := time.Now()
		if err != nil {
			attempt.LatencyMS = time.Since(start).Milliseconds()
			attempt.Error = fmt.Sprintf("marshal request body: %v", err)
			attempts = append(attempts, attempt)
			break
		}

		attemptResult := executeProviderCase(ctx, client, endpointURL, apiKey, manifest, tc, result, bodyBytes)
		attempt.LatencyMS = attemptResult.LatencyMS
		attempt.HTTPStatus = attemptResult.HTTPStatus
		attempt.Error = attemptResult.Error
		lastHTTPStatus = attemptResult.HTTPStatus
		totalLatency += attemptResult.LatencyMS

		if usage := cacheUsageMap(attemptResult.ResponseBody); usage != nil {
			attempt.Usage = usage
			hit, miss, prompt, field, _ := extractCacheHitMetrics(usage)
			attempt.HitTokens = hit
			attempt.MissTokens = miss
			attempt.PromptTokens = prompt
			attempt.HitField = field
			attempt.HitRate = cacheHitRate(hit, miss, prompt)
		}

		attempts = append(attempts, attempt)
		if i == 2 {
			measureAttempt = attempt
		}
		if attempt.Error != "" && attempt.HTTPStatus == 0 {
			break
		}
	}

	summary := cacheProbeSummary(probe, attempts, measureAttempt)
	result.HTTPStatus = lastHTTPStatus
	result.LatencyMS = totalLatency
	result.ResponseBody = summary
	if raw, err := json.Marshal(summary); err == nil {
		result.RawResponse = string(raw)
	}

	conclusion, message, pass := cacheProbeConclusion(probe, attempts, measureAttempt)
	result.SupportConclusion = conclusion
	result.Assertions = []CaseAssertion{{
		Name:    "cache_hit_rate",
		Pass:    pass,
		Message: message,
	}}
	if conclusion == "request_failed" && message != "" {
		result.Error = message
	}
	return result
}

func cacheProbeSummary(probe cacheProbe, attempts []cacheProbeAttempt, measure cacheProbeAttempt) map[string]any {
	display := map[string]any{
		"缓存命中 tokens": fmt.Sprintf("%d", measure.HitTokens),
		"缓存命中率":       formatCacheHitRate(measure.HitRate),
	}
	if measure.HitField != "" {
		display["命中字段"] = measure.HitField
	} else {
		display["命中字段"] = "—"
	}
	if probe.MinHitRate > 0 {
		display["命中率阈值"] = formatCacheHitRate(probe.MinHitRate)
	}
	return map[string]any{
		"cache_probe": map[string]any{
			"kind":     probe.Kind,
			"attempts": attempts,
		},
		"cache_display": display,
	}
}

func cacheProbeConclusion(probe cacheProbe, attempts []cacheProbeAttempt, measure cacheProbeAttempt) (conclusion, message string, pass bool) {
	if len(attempts) < 2 {
		if len(attempts) == 1 && attempts[0].Error != "" {
			return "request_failed", attempts[0].Error, false
		}
		return "request_failed", "缓存探测未完成两次请求", false
	}
	warmup := attempts[0]
	if warmup.HTTPStatus != 200 || warmup.Error != "" {
		msg := warmup.Error
		if msg == "" {
			msg = fmt.Sprintf("预热请求 HTTP %d", warmup.HTTPStatus)
		}
		return "request_failed", msg, false
	}
	if measure.HTTPStatus != 200 || measure.Error != "" {
		msg := measure.Error
		if msg == "" {
			msg = fmt.Sprintf("测量请求 HTTP %d", measure.HTTPStatus)
		}
		return "request_failed", msg, false
	}
	_, _, _, field, hasField := extractCacheHitMetrics(measure.Usage)
	if probe.MinHitRate > 0 {
		thresholdLabel := formatCacheHitRate(probe.MinHitRate)
		if !hasField || field == "" {
			return "schema_mismatch", fmt.Sprintf("未暴露缓存统计，无法判定是否达到 %s", thresholdLabel), false
		}
		if measure.HitRate < probe.MinHitRate {
			return "schema_mismatch", fmt.Sprintf("命中率 %s 低于阈值 %s", formatCacheHitRate(measure.HitRate), thresholdLabel), false
		}
		return "supported", fmt.Sprintf("缓存命中 %d tokens（%s，达到阈值 %s）", measure.HitTokens, formatCacheHitRate(measure.HitRate), thresholdLabel), true
	}
	if !hasField || field == "" {
		return "ignored", "未暴露缓存统计字段", true
	}
	if measure.HitTokens > 0 {
		return "supported", fmt.Sprintf("缓存命中 %d tokens（%s）", measure.HitTokens, formatCacheHitRate(measure.HitRate)), true
	}
	return "ignored", "未观测到缓存命中（hit_tokens=0）", true
}

func capacityAttemptPayload(manifest Manifest, probe capacityProbe, model string, candidate int) (map[string]any, int, int, int, int) {
	outputTokens := candidate
	content := "Reply exactly: OK"
	estimatedInputTokens := 0
	testedTotalContextTokens := 0
	appliedSafetyMarginTokens := 0

	switch probe.Kind {
	case "total_context":
		if probe.BalancedMaxInputTokens > 0 && probe.BalancedMaxOutputTokens > 0 {
			inputTokens, outTokens, testedTotal, margin := capacityBalancedContextSplit(candidate, probe)
			outputTokens = outTokens
			estimatedInputTokens = inputTokens
			testedTotalContextTokens = testedTotal
			appliedSafetyMarginTokens = margin
			content = capacityLongPrompt(estimatedInputTokens)
		} else {
			outputTokens = probe.ContextOutputTokens
			testedTotalContextTokens, appliedSafetyMarginTokens = capacityTestedTotalContextTokens(candidate, probe.ContextSafetyMarginRatio, outputTokens)
			estimatedInputTokens = testedTotalContextTokens - outputTokens
			if estimatedInputTokens < 1 {
				estimatedInputTokens = 1
			}
			content = capacityLongPrompt(estimatedInputTokens)
		}
	case "max_input":
		outputTokens = 16
		margin := int(float64(candidate)*probe.ContextSafetyMarginRatio + 0.5)
		testedInput := candidate - margin
		if testedInput < 1 {
			testedInput = 1
			margin = candidate - testedInput
			if margin < 0 {
				margin = 0
			}
		}
		appliedSafetyMarginTokens = margin
		estimatedInputTokens = testedInput
		content = capacityLongPrompt(testedInput)
	case "max_output_effective":
		outputTokens = candidate
		content = capacityForceLongPrompt()
	case "thinking_budget":
		outputTokens = candidate + 2048
		if outputTokens > 65536 {
			outputTokens = 65536
		}
		if outputTokens < 2048 {
			outputTokens = 2048
		}
		content = capacityHardReasoningPrompt()
	}

	payload := map[string]any{
		"model": model,
		"messages": []map[string]any{
			{"role": "user", "content": content},
		},
		capacityOutputParameter(manifest.Provider): outputTokens,
	}
	if probe.Kind == "thinking_budget" {
		applyThinkingBudget(payload, probe, candidate)
	}
	return payload, estimatedInputTokens, outputTokens, testedTotalContextTokens, appliedSafetyMarginTokens
}

// capacityBalancedContextSplit splits a total-context tier into input/output
// budgets that each stay under the measured caps, so a context that exceeds the
// input limit (e.g. 128K context with a 96K input cap) can still be reached.
func capacityBalancedContextSplit(candidate int, probe capacityProbe) (int, int, int, int) {
	ratio := probe.ContextSafetyMarginRatio
	if ratio <= 0 || ratio >= 1 {
		ratio = 0.05
	}
	margin := int(float64(candidate)*ratio + 0.5)
	testedTotal := candidate - margin
	if testedTotal < 2 {
		testedTotal = 2
		margin = candidate - testedTotal
		if margin < 0 {
			margin = 0
		}
	}
	output := probe.BalancedMaxOutputTokens
	if output > testedTotal-1 {
		output = testedTotal - 1
	}
	if output < 1 {
		output = 1
	}
	input := testedTotal - output
	if input > probe.BalancedMaxInputTokens {
		input = probe.BalancedMaxInputTokens
		output = testedTotal - input
		if output < 1 {
			output = 1
		}
	}
	if input < 1 {
		input = 1
	}
	return input, output, testedTotal, margin
}

func applyThinkingBudget(payload map[string]any, probe capacityProbe, budget int) {
	switch probe.ThinkingField {
	case "thinking.budget_tokens":
		payload["thinking"] = map[string]any{"type": "enabled", "budget_tokens": budget}
	case "reasoning.max_tokens":
		payload["reasoning"] = map[string]any{"max_tokens": budget, "enabled": true}
	default:
		payload["thinking_budget"] = budget
		if probe.EnableThinking {
			payload["enable_thinking"] = true
		}
	}
}

func capacityForceLongPrompt() string {
	return "Write an extremely long and detailed essay about the history of computing, from the abacus to modern AI accelerators. Keep writing continuously with many sections and paragraphs, and do not stop, summarize, or conclude until you are cut off."
}

func capacityHardReasoningPrompt() string {
	return "Think step by step in extensive detail before answering, and show all of your reasoning. " +
		"Carefully work through every case and double-check each step: " +
		"Three friends Alice, Bob, and Carol each pick a distinct integer from 1 to 9. " +
		"The sum of Alice's and Bob's numbers equals twice Carol's number; Bob's number is a prime; " +
		"Alice's number is even; and the product of all three numbers is divisible by 12. " +
		"Enumerate the possibilities exhaustively, explain why each candidate works or fails, " +
		"then state the final answer."
}

func capacityCompletionTokens(value any) (int, bool) {
	root, ok := value.(map[string]any)
	if !ok {
		return 0, false
	}
	usage, ok := root["usage"].(map[string]any)
	if !ok {
		return 0, false
	}
	for _, key := range []string{"completion_tokens", "output_tokens"} {
		if v, ok := intValue(usage[key]); ok {
			return v, true
		}
	}
	return 0, false
}

func finishReasonIsLength(reason string) bool {
	switch strings.ToLower(strings.TrimSpace(reason)) {
	case "length", "max_tokens", "max_output_tokens", "output_limit", "model_length":
		return true
	}
	return false
}

func evaluateOutputCapEffective(attempt capacityAttempt) (bool, string) {
	cap := attempt.Candidate
	ct := attempt.CompletionTokens
	if finishReasonIsLength(attempt.FinishReason) {
		if ct > 0 {
			return true, fmt.Sprintf("finish_reason=%s，completion_tokens=%d≈cap %d", attempt.FinishReason, ct, cap)
		}
		return true, fmt.Sprintf("finish_reason=%s（无 completion_tokens 计数）", attempt.FinishReason)
	}
	if ct > 0 && cap > 0 && ct >= cap-cap/5 && ct <= cap+cap/5 {
		return true, fmt.Sprintf("completion_tokens=%d≈cap %d（finish_reason=%s）", ct, cap, attempt.FinishReason)
	}
	return false, fmt.Sprintf("未被截断：finish_reason=%s，completion_tokens=%d，cap=%d（疑似被忽略）", attempt.FinishReason, ct, cap)
}

func capacityTestedTotalContextTokens(candidate int, safetyMarginRatio float64, outputTokens int) (int, int) {
	if candidate <= 0 {
		return 0, 0
	}
	ratio := safetyMarginRatio
	if ratio < 0 {
		ratio = 0
	}
	if ratio >= 1 {
		ratio = 0.05
	}
	margin := int(float64(candidate)*ratio + 0.5)
	testedTotal := candidate - margin
	minTotal := outputTokens + 1
	if testedTotal < minTotal {
		testedTotal = minTotal
		margin = candidate - testedTotal
		if margin < 0 {
			margin = 0
		}
	}
	return testedTotal, margin
}

func capacityOutputParameter(provider string) string {
	switch provider {
	case "openai", "claude", "minimax", "openrouter":
		return "max_completion_tokens"
	default:
		return "max_tokens"
	}
}

func capacityLongPrompt(estimatedInputTokens int) string {
	prefix := "Capacity probe. Ignore the repeated filler and reply with OK.\n\n"
	suffix := "\n\nReply exactly: OK"
	fillerTokens := estimatedInputTokens - 24
	if fillerTokens < 1 {
		fillerTokens = 1
	}
	return prefix + strings.Repeat("x ", fillerTokens) + suffix
}

func capacityConclusion(status int) string {
	if status >= 200 && status < 300 {
		return "supported"
	}
	if status == http.StatusUnauthorized || status == http.StatusForbidden {
		return "auth_or_permission_failed"
	}
	if status == http.StatusTooManyRequests {
		return "rate_limited"
	}
	if status == http.StatusBadRequest || status == http.StatusNotFound || status == http.StatusUnprocessableEntity {
		return "rejected"
	}
	if status >= 500 {
		return "server_error"
	}
	return "request_failed"
}

func capacitySummary(probe capacityProbe, attempts []capacityAttempt, stoppedByBoundary bool) map[string]any {
	supportedMax := 0
	var supportedAttempt *capacityAttempt
	for _, attempt := range attempts {
		if attempt.Conclusion == "supported" && attempt.Candidate > supportedMax {
			supportedMax = attempt.Candidate
			copy := attempt
			supportedAttempt = &copy
		}
	}
	var nearestHigher *capacityAttempt
	if supportedMax > 0 {
		for _, attempt := range attempts {
			if attempt.Candidate > supportedMax && attempt.Conclusion != "supported" {
				if nearestHigher == nil || attempt.Candidate < nearestHigher.Candidate {
					copy := attempt
					nearestHigher = &copy
				}
			}
		}
	}
	topCandidate := 0
	if len(probe.Candidates) > 0 {
		topCandidate = probe.Candidates[0]
	}
	topSupported := len(attempts) > 0 && attempts[0].Candidate == topCandidate && attempts[0].Conclusion == "supported"
	upperBoundFound := supportedMax > 0 && nearestHigher != nil

	var effective bool
	var effectiveDetail string
	var budgetAccepted bool
	budgetRespected := true
	var thinkLowBudget, thinkHighBudget, thinkLowRT, thinkHighRT int
	if probe.Kind == "max_output_effective" {
		for _, a := range attempts {
			if a.Effective != nil && *a.Effective {
				effective = true
				effectiveDetail = a.EffectiveReason
				break
			}
		}
		if !effective {
			for _, a := range attempts {
				if a.EffectiveReason != "" {
					effectiveDetail = a.EffectiveReason
					break
				}
			}
		}
	}
	if probe.Kind == "thinking_budget" {
		budgetAccepted = supportedMax > 0
		for _, a := range attempts {
			if a.Conclusion != "supported" {
				continue
			}
			if thinkHighBudget == 0 || a.Candidate > thinkHighBudget {
				thinkHighBudget = a.Candidate
				thinkHighRT = a.ReasoningTokens
			}
			if thinkLowBudget == 0 || a.Candidate < thinkLowBudget {
				thinkLowBudget = a.Candidate
				thinkLowRT = a.ReasoningTokens
			}
			if a.ReasoningTokens > a.Candidate {
				budgetRespected = false
			}
		}
		effective = thinkHighBudget > thinkLowBudget && thinkHighRT > thinkLowRT
	}

	display := capacityDisplayConclusion(probe.Kind, supportedMax, supportedAttempt, nearestHigher, topSupported)
	switch probe.Kind {
	case "max_output_effective":
		display = capacityOutputEffectiveDisplay(effective, effectiveDetail)
	case "thinking_budget":
		display = capacityThinkingBudgetDisplay(budgetAccepted, supportedMax, effective, budgetRespected)
	}
	summary := map[string]any{
		"kind":                    probe.Kind,
		"label":                   capacityDisplayLabel(probe.Kind),
		"supported_max":           supportedMax,
		"supported_max_display":   capacityTierDisplay(supportedMax),
		"top_candidate":           topCandidate,
		"top_candidate_display":   capacityTierDisplay(topCandidate),
		"top_candidate_supported": topSupported,
		"upper_bound_found":       upperBoundFound,
		"boundary_found_by_stop":  stoppedByBoundary,
		"attempts":                attempts,
		"capacity_display": map[string]any{
			capacityDisplayLabel(probe.Kind): display,
		},
	}
	if probe.Kind == "total_context" {
		summary["context_safety_margin_ratio"] = probe.ContextSafetyMarginRatio
		summary["context_safety_margin_percent"] = probe.ContextSafetyMarginRatio * 100
		if supportedAttempt != nil {
			summary["supported_tested_total_context_tokens"] = supportedAttempt.TestedTotalContextTokens
			summary["supported_tested_total_context_display"] = supportedAttempt.TestedTotalContextDisplay
		}
	}
	if nearestHigher != nil {
		summary["nearest_higher_non_supported"] = map[string]any{
			"candidate":                    nearestHigher.Candidate,
			"candidate_display":            nearestHigher.CandidateDisplay,
			"tested_total_context_tokens":  nearestHigher.TestedTotalContextTokens,
			"tested_total_context_display": nearestHigher.TestedTotalContextDisplay,
			"conclusion":                   nearestHigher.Conclusion,
			"http_status":                  nearestHigher.HTTPStatus,
			"error":                        nearestHigher.Error,
		}
	}
	if probe.Kind == "total_context" && probe.BalancedMaxInputTokens > 0 && probe.BalancedMaxOutputTokens > 0 {
		summary["context_method"] = "balanced"
		summary["balanced_max_input_tokens"] = probe.BalancedMaxInputTokens
		summary["balanced_max_output_tokens"] = probe.BalancedMaxOutputTokens
	} else if probe.Kind == "total_context" {
		summary["context_method"] = "input_heavy"
	}
	if probe.Kind == "max_output_effective" {
		summary["effective"] = effective
		summary["effective_detail"] = effectiveDetail
	}
	if probe.Kind == "thinking_budget" {
		summary["budget_accepted"] = budgetAccepted
		summary["budget_max"] = supportedMax
		summary["budget_max_display"] = capacityTierDisplay(supportedMax)
		summary["effective"] = effective
		summary["budget_respected"] = budgetRespected
		summary["thinking_field"] = probe.ThinkingField
		summary["thinking_low_budget"] = thinkLowBudget
		summary["thinking_high_budget"] = thinkHighBudget
		summary["thinking_low_reasoning_tokens"] = thinkLowRT
		summary["thinking_high_reasoning_tokens"] = thinkHighRT
	}
	return summary
}

func capacityDisplayLabel(kind string) string {
	switch kind {
	case "total_context":
		return "最大Total Context"
	case "max_input":
		return "最大Input"
	case "max_output_effective":
		return "Max Output 生效"
	case "thinking_budget":
		return "最大Thinking Budget"
	default:
		return "最大Max Output"
	}
}

func capacityOutputEffectiveDisplay(effective bool, detail string) string {
	if effective {
		if detail != "" {
			return fmt.Sprintf("生效（%s）", detail)
		}
		return "生效"
	}
	if detail != "" {
		return fmt.Sprintf("未生效（%s）", detail)
	}
	return "未生效（参数疑似被忽略）"
}

func capacityThinkingBudgetDisplay(accepted bool, supportedMax int, effective, respected bool) string {
	if !accepted {
		return "不支持该思考预算字段"
	}
	parts := []string{fmt.Sprintf("最大可传 %s", capacityTierDisplay(supportedMax))}
	if effective {
		parts = append(parts, "实测生效")
	} else {
		parts = append(parts, "接受但未观察到随预算变化")
	}
	if !respected {
		parts = append(parts, "reasoning_tokens 曾超出预算")
	}
	return strings.Join(parts, "；")
}

func capacityDisplayConclusion(kind string, supportedMax int, supportedAttempt, nearestHigher *capacityAttempt, topSupported bool) string {
	if supportedMax <= 0 {
		return "当前候选档位内未测到支持项"
	}
	supported := capacityTierDisplay(supportedMax)
	tested := ""
	if kind == "total_context" && supportedAttempt != nil && supportedAttempt.TestedTotalContextDisplay != "" {
		tested = fmt.Sprintf("按%s探测，", supportedAttempt.TestedTotalContextDisplay)
	}
	if nearestHigher != nil {
		return fmt.Sprintf("%s（%s%s不支持）", supported, tested, nearestHigher.CandidateDisplay)
	}
	if topSupported {
		return fmt.Sprintf(">= %s（%s最高候选档位已支持）", supported, tested)
	}
	return fmt.Sprintf("%s（%s边界未完全括定）", supported, tested)
}

func capacityTierDisplay(value int) string {
	if value <= 0 {
		return ""
	}
	const oneM = 1024 * 1024
	if value >= oneM && value%oneM == 0 {
		return fmt.Sprintf("%dm", value/oneM)
	}
	if value >= 1024 && value%1024 == 0 {
		return fmt.Sprintf("%dk", value/1024)
	}
	if value >= oneM {
		return trimCapacityDecimal(float64(value)/float64(oneM)) + "m"
	}
	if value >= 1024 {
		return trimCapacityDecimal(float64(value)/1024) + "k"
	}
	return fmt.Sprintf("%d", value)
}

func trimCapacityDecimal(value float64) string {
	return strconv.FormatFloat(value, 'f', 1, 64)
}

func capacityAttemptCaseID(caseID string, candidate int) string {
	return fmt.Sprintf("%s_%s", caseID, capacityTierDisplay(candidate))
}

func capacityResultHTTPStatus(attempts []capacityAttempt) int {
	for i := len(attempts) - 1; i >= 0; i-- {
		if attempts[i].HTTPStatus > 0 {
			return attempts[i].HTTPStatus
		}
	}
	return 0
}

func capacityTotalLatency(attempts []capacityAttempt) int64 {
	var total int64
	for _, attempt := range attempts {
		total += attempt.LatencyMS
	}
	return total
}

func capacityUsageMap(value any) map[string]any {
	root, ok := value.(map[string]any)
	if !ok {
		return nil
	}
	usage, ok := root["usage"].(map[string]any)
	if !ok {
		return nil
	}
	out := map[string]any{}
	for _, key := range []string{"prompt_tokens", "completion_tokens", "total_tokens", "input_tokens", "output_tokens"} {
		if item, ok := usage[key]; ok {
			out[key] = item
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func capacityFinishReason(value any, messagesEndpoint bool) string {
	root, ok := value.(map[string]any)
	if !ok {
		return ""
	}
	if messagesEndpoint {
		if reason, ok := root["stop_reason"].(string); ok {
			return reason
		}
		return ""
	}
	choices, ok := root["choices"].([]any)
	if !ok || len(choices) == 0 {
		return ""
	}
	first, ok := choices[0].(map[string]any)
	if !ok {
		return ""
	}
	reason, _ := first["finish_reason"].(string)
	return reason
}

const maxProviderRequestAttempts = 3

var providerRetrySleep = sleepBeforeRetry

func doProviderRequest(ctx context.Context, client *http.Client, endpointURL, apiKey string, manifest Manifest, headers map[string]string, bodyBytes []byte, expectedStatus int) (*http.Response, error) {
	var lastErr error
	for attempt := 1; ; attempt++ {
		req, err := newProviderRequest(ctx, endpointURL, apiKey, manifest, headers, bodyBytes)
		if err != nil {
			return nil, err
		}
		resp, err := client.Do(req)
		if err == nil {
			if shouldRetryStatus(resp.StatusCode, expectedStatus) && canRetryStatus(resp.StatusCode, attempt) {
				io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<20))
				resp.Body.Close()
				if !providerRetrySleep(ctx, retryDelayForStatus(resp.StatusCode, attempt, resp.Header.Get("Retry-After"))) {
					return nil, ctx.Err()
				}
				continue
			}
			return resp, nil
		}
		lastErr = err
		if !isTransientProviderError(err) || attempt == maxProviderRequestAttempts {
			break
		}
		if !providerRetrySleep(ctx, retryDelayForStatus(0, attempt, "")) {
			return nil, ctx.Err()
		}
	}
	return nil, lastErr
}

func shouldRetryStatus(statusCode, expectedStatus int) bool {
	if statusCode == expectedStatus {
		return false
	}
	switch statusCode {
	case http.StatusTooManyRequests, http.StatusRequestTimeout, http.StatusInternalServerError, http.StatusBadGateway, http.StatusServiceUnavailable, http.StatusGatewayTimeout:
		return true
	default:
		return false
	}
}

func canRetryStatus(statusCode, attempt int) bool {
	if statusCode == http.StatusTooManyRequests {
		return true
	}
	return attempt < maxProviderRequestAttempts
}

func newProviderRequest(ctx context.Context, endpointURL, apiKey string, manifest Manifest, headers map[string]string, bodyBytes []byte) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpointURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	authHeader := providerAuthHeader(manifest.Provider)
	if authHeader == "X-Api-Key" {
		req.Header.Set(authHeader, apiKey)
	} else {
		req.Header.Set(authHeader, "Bearer "+apiKey)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	if isAnthropicMessagesEndpoint(manifest) {
		req.Header.Set("anthropic-version", "2023-06-01")
	}
	for key, value := range headers {
		if strings.TrimSpace(key) == "" {
			continue
		}
		req.Header.Set(key, value)
	}
	return req, nil
}

func isTransientProviderError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	transientFragments := []string{
		"eof",
		"timeout",
		"connection reset",
		"server closed idle connection",
		"tls handshake timeout",
		"broken pipe",
	}
	for _, fragment := range transientFragments {
		if strings.Contains(msg, fragment) {
			return true
		}
	}
	return false
}

func retryDelayForStatus(statusCode, attempt int, retryAfter string) time.Duration {
	headerDelay := retryAfterDelay(retryAfter)
	if statusCode == http.StatusTooManyRequests {
		backoff := cappedExponentialDelay(attempt, 30*time.Second, 15*time.Minute)
		if headerDelay > backoff {
			return headerDelay
		}
		return backoff
	}
	if headerDelay > 0 {
		return headerDelay
	}
	switch attempt {
	case 1:
		return 2 * time.Second
	case 2:
		return 6 * time.Second
	default:
		return time.Duration(attempt) * 2 * time.Second
	}
}

func retryAfterDelay(retryAfter string) time.Duration {
	retryAfter = strings.TrimSpace(retryAfter)
	if retryAfter == "" {
		return 0
	}
	if seconds, err := time.ParseDuration(retryAfter + "s"); err == nil && seconds > 0 {
		return seconds
	}
	if retryAt, err := http.ParseTime(retryAfter); err == nil {
		delay := time.Until(retryAt)
		if delay > 0 {
			return delay
		}
	}
	return 0
}

func cappedExponentialDelay(attempt int, base, maxDelay time.Duration) time.Duration {
	if attempt < 1 {
		attempt = 1
	}
	delay := base
	for i := 1; i < attempt; i++ {
		if delay >= maxDelay/2 {
			return maxDelay
		}
		delay *= 2
	}
	if delay > maxDelay {
		return maxDelay
	}
	return delay
}

func sleepBeforeRetry(ctx context.Context, delay time.Duration) bool {
	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}

func cloneMap(value map[string]any) map[string]any {
	if value == nil {
		return map[string]any{}
	}
	data, err := json.Marshal(value)
	if err != nil {
		copy := make(map[string]any, len(value))
		for key, item := range value {
			copy[key] = item
		}
		return copy
	}
	var out map[string]any
	if err := json.Unmarshal(data, &out); err != nil {
		copy := make(map[string]any, len(value))
		for key, item := range value {
			copy[key] = item
		}
		return copy
	}
	return out
}

func parseJSON(data []byte) (any, bool) {
	if len(bytes.TrimSpace(data)) == 0 {
		return nil, false
	}
	var value any
	if err := json.Unmarshal(data, &value); err != nil {
		return nil, false
	}
	return value, true
}

func responseHeaders(header http.Header) map[string]any {
	out := make(map[string]any, len(header))
	for key, values := range header {
		if len(values) == 1 {
			out[key] = values[0]
			continue
		}
		out[key] = values
	}
	return out
}

func providerAuthHeader(provider string) string {
	switch provider {
	case "ali_messages", "claude_messages", "deepseek_messages", "minimax_messages":
		return "X-Api-Key"
	}
	return "Authorization"
}

func requestHeaders(headers map[string]string, manifest Manifest) map[string]any {
	authHeader := providerAuthHeader(manifest.Provider)
	out := map[string]any{
		"Content-Type": "application/json",
		"Accept":       "application/json, text/event-stream",
	}
	if isAnthropicMessagesEndpoint(manifest) {
		out["anthropic-version"] = "2023-06-01"
	}
	if authHeader == "X-Api-Key" {
		out[authHeader] = "<redacted>"
	} else {
		out[authHeader] = "Bearer <redacted>"
	}
	for key, value := range headers {
		if strings.TrimSpace(key) == "" {
			continue
		}
		out[key] = value
	}
	return out
}

func isAnthropicMessagesEndpoint(manifest Manifest) bool {
	return strings.TrimSpace(manifest.Endpoint) == "/messages" || strings.HasSuffix(manifest.Provider, "_messages")
}

func expectedHTTPStatus(expect map[string]any) int {
	value, ok := expect["http_status"]
	if !ok {
		return 0
	}
	switch typed := value.(type) {
	case float64:
		return int(typed)
	case int:
		return typed
	case json.Number:
		status, _ := typed.Int64()
		return int(status)
	default:
		return 0
	}
}

func expectedSupportConclusion(expect map[string]any) string {
	if value, ok := expect["support_conclusion"].(string); ok && value != "" {
		return value
	}
	if status := expectedHTTPStatus(expect); status >= 400 {
		return "rejected_400"
	}
	return "supported"
}

func supportConclusion(httpStatus int, err error, expect map[string]any) string {
	if err != nil || httpStatus == 0 {
		return "request_failed"
	}
	expected := expectedSupportConclusion(expect)
	if expected == "permission_limited" {
		if httpStatus == http.StatusForbidden || httpStatus == http.StatusTooManyRequests {
			return "permission_limited"
		}
	}
	if httpStatus >= 200 && httpStatus < 300 {
		if expected == "rejected_400" || expected == "ignored" || expected == "permission_limited" {
			return "ignored"
		}
		return "supported"
	}
	if httpStatus == http.StatusBadRequest || httpStatus == http.StatusUnprocessableEntity {
		return "rejected_400"
	}
	if httpStatus >= 400 {
		return "request_failed"
	}
	return "supported"
}

func finalizeSupportConclusion(httpStatus int, err error, expect map[string]any, assertions []CaseAssertion) string {
	conclusion := supportConclusion(httpStatus, err, expect)
	if conclusion == "supported" && hasFailedSemanticAssertion(assertions) {
		return "schema_mismatch"
	}
	return conclusion
}

func finalizeSupportConclusionForResult(result RunCaseResult, err error, expect map[string]any) string {
	if optionalCapabilityMismatch(result, expect) {
		return "ignored"
	}
	return finalizeSupportConclusion(result.HTTPStatus, err, expect, result.Assertions)
}

func attachParameterDiagnosis(result *RunCaseResult, expect map[string]any) {
	if result == nil {
		return
	}
	result.ParameterDiagnosis = diagnoseParameterSupport(*result, expect)
}

func docSupportPolicy(expect map[string]any) string {
	if expect == nil {
		return "documented"
	}
	if v, ok := expect["doc_support"].(string); ok {
		switch strings.ToLower(strings.TrimSpace(v)) {
		case "documented", "undocumented":
			return strings.ToLower(strings.TrimSpace(v))
		}
	}
	if v, ok := expect["undocumented_scenario"].(string); ok && strings.TrimSpace(v) != "" {
		return "undocumented"
	}
	return "documented"
}

func detectParameterEffect(result RunCaseResult, expect map[string]any) bool {
	if expect != nil {
		if v, ok := expect["output_cap_effective"].(bool); ok && v {
			return true
		}
	}
	if result.OutputCapEffective != nil && *result.OutputCapEffective {
		return true
	}
	for _, assertion := range result.Assertions {
		switch assertion.Name {
		case "parameter_acceptance":
			if assertion.Pass && strings.Contains(assertion.Message, "已接受且已生效") {
				return true
			}
		case "thinking_required", "thinking_evidence_required":
			if assertion.Pass {
				return true
			}
		case "thinking_absent":
			if !assertion.Pass {
				return true
			}
		case "token_limit":
			if assertion.Pass && strings.Contains(assertion.Message, "生效") {
				return true
			}
		}
	}
	return false
}

func diagnoseParameterSupport(result RunCaseResult, expect map[string]any) *ParameterDiagnosis {
	policy := docSupportPolicy(expect)
	effect := detectParameterEffect(result, expect)
	httpOK := result.HTTPStatus >= 200 && result.HTTPStatus < 300
	httpRejected := result.HTTPStatus == http.StatusBadRequest || result.HTTPStatus == http.StatusUnprocessableEntity

	diag := &ParameterDiagnosis{
		DocSupport: policy,
		Policy:     policy,
		Effect:     effect,
	}

	if policy == "documented" {
		compliant := result.SupportConclusion == expectedSupportConclusion(expect)
		if compliant {
			for _, assertion := range result.Assertions {
				if assertion.Name == "http_status" || assertion.Name == "optional_capability_mismatch" {
					continue
				}
				if !assertion.Pass {
					compliant = false
					break
				}
			}
		}
		diag.Compliant = &compliant
		if compliant {
			diag.Message = "文档已声明支持，实测结论与预期一致。"
		} else {
			diag.Message = "文档已声明支持，实测结论与预期不一致，须以复测结果更新文档或判渠道不达标。"
		}
		return diag
	}

	scenario := ""
	if expect != nil {
		if v, ok := expect["undocumented_scenario"].(string); ok {
			scenario = strings.TrimSpace(v)
		}
	}
	diag.Scenario = scenario

	if httpRejected {
		compliant := scenario == "reject_on_pass"
		diag.Compliant = &compliant
		diag.Scenario = "reject_on_pass"
		if compliant {
			diag.Message = "文档未声明支持的参数按预期被拒绝。"
		} else {
			diag.Flag = "undocumented_rejected"
			diag.Message = "文档未声明支持的参数传参后直接报错，存在兼容性风险。"
		}
		return diag
	}

	if httpOK && effect {
		compliant := false
		diag.Compliant = &compliant
		diag.Scenario = "silent_effective"
		diag.Flag = "doc_gap"
		diag.Message = "文档未声明支持的参数传参后静默生效，属渠道 API 文档漏洞，需补充文档。"
		return diag
	}

	if httpOK && !effect {
		compliant := result.SupportConclusion == "ignored" || result.SupportConclusion == "supported" || scenario == "silent_ignore"
		diag.Compliant = &compliant
		diag.Scenario = "silent_ignore"
		diag.Message = "传参无报错且未观察到生效，符合未文档化参数的预期。"
		return diag
	}

	diag.Message = "未文档化参数场景证据不足，需补充 case 或复测。"
	return diag
}

func finalizeCaseResult(result *RunCaseResult, err error, expect map[string]any) {
	if result == nil {
		return
	}
	result.SupportConclusion = finalizeSupportConclusionForResult(*result, err, expect)
	attachParameterDiagnosis(result, expect)
}

func optionalCapabilityMismatch(result RunCaseResult, expect map[string]any) bool {
	enabled, _ := expect["optional_capability_mismatch"].(bool)
	if !enabled {
		return false
	}
	if result.HTTPStatus != http.StatusBadRequest && result.HTTPStatus != http.StatusNotFound && result.HTTPStatus != http.StatusUnprocessableEntity {
		return false
	}
	text := strings.ToLower(result.Error + " " + result.RawResponse)
	fragments := []string{
		"no endpoints found that support",
		"not supported",
		"unsupported",
		"does not support",
		"support input audio",
		"support input video",
	}
	for _, fragment := range fragments {
		if strings.Contains(text, fragment) {
			return true
		}
	}
	return false
}

func hasFailedSemanticAssertion(assertions []CaseAssertion) bool {
	for _, assertion := range assertions {
		if assertion.Name == "http_status" {
			continue
		}
		if !assertion.Pass {
			return true
		}
	}
	return false
}

func evaluateAssertions(result RunCaseResult, expect map[string]any) []CaseAssertion {
	assertions := make([]CaseAssertion, 0)
	if optionalCapabilityMismatch(result, expect) {
		return append(assertions, CaseAssertion{
			Name:    "optional_capability_mismatch",
			Pass:    true,
			Message: "可选能力在当前模型/路由下不可用，按 ignored 处理",
		})
	}
	if status := expectedHTTPStatus(expect); status > 0 {
		assertions = append(assertions, CaseAssertion{
			Name:    "http_status",
			Pass:    result.HTTPStatus == status,
			Message: fmt.Sprintf("预期 %d，实际 %d", status, result.HTTPStatus),
		})
	}
	if result.HTTPStatus >= 400 {
		return assertions
	}
	if mode, _ := expect["response_mode"].(string); mode == "sse" {
		assertions = append(assertions, CaseAssertion{
			Name:    "response_mode",
			Pass:    looksLikeSSE(result.RawResponse),
			Message: "预期 text/event-stream 风格的 data: 分片",
		})
		if fields := stringSlice(expect["required_chunk_fields"]); len(fields) > 0 {
			assertions = append(assertions, requiredFieldsAssertion("required_chunk_fields", firstSSEJSON(result.RawResponse), fields))
		}
		if fields := stringSlice(expect["usage_required_fields"]); len(fields) > 0 {
			assertions = append(assertions, sseUsageRequiredFieldsAssertion("usage_required_fields", result.RawResponse, fields))
		}
		if includeUsageRequested(result.RequestBody) {
			assertions = append(assertions, CaseAssertion{
				Name:    "stream_options.include_usage",
				Pass:    sseHasUsage(result.RawResponse),
				Message: "stream=true 且 include_usage=true 时预期 SSE chunk 中包含 usage",
			})
		}
		if mode, _ := expect["stream_usage_in_sse"].(string); strings.TrimSpace(mode) != "" {
			if assertion, ok := streamUsageInSSEAssertion(result.RawResponse, mode); ok {
				assertions = append(assertions, assertion)
			}
		}
		if shape, _ := expect["stream_usage_chunk_shape"].(string); strings.TrimSpace(shape) != "" {
			if assertion, ok := streamUsageChunkShapeAssertion(result.RawResponse, shape); ok {
				assertions = append(assertions, assertion)
			}
		}
		assertions = appendSSEStreamAssertions(assertions, result, expect)
		return assertions
	}
	if fields := stringSlice(expect["required_response_fields"]); len(fields) > 0 {
		assertions = append(assertions, requiredFieldsAssertion("required_response_fields", result.ResponseBody, fields))
	}
	if isMessagesResponse(result.ResponseBody) {
		if fields := stringSlice(expect["required_response_fields"]); len(fields) == 0 {
			assertions = append(assertions, requiredFieldsAssertion("messages_required_response_fields", result.ResponseBody, []string{"id", "type", "role", "content", "model"}))
		}
	}
	if choices, ok := choicesArray(result.ResponseBody); ok && len(choices) > 0 {
		if fields := stringSlice(expect["choice_required_fields"]); len(fields) == 0 {
			assertions = append(assertions, nestedRequiredFieldsAssertion("choice_required_fields", result.ResponseBody, []string{"choices"}, []string{"index", "message", "finish_reason"}))
		}
		if _, ok := valueAt(result.ResponseBody, []string{"usage"}); ok {
			if fields := stringSlice(expect["usage_required_fields"]); len(fields) == 0 {
				assertions = append(assertions, nestedRequiredFieldsAssertion("usage_required_fields", result.ResponseBody, []string{"usage"}, []string{"prompt_tokens", "completion_tokens", "total_tokens"}))
			}
		}
	}
	if fields := stringSlice(expect["choice_required_fields"]); len(fields) > 0 {
		assertions = append(assertions, nestedRequiredFieldsAssertion("choice_required_fields", result.ResponseBody, []string{"choices"}, fields))
	}
	if fields := stringSlice(expect["usage_required_fields"]); len(fields) > 0 {
		assertions = append(assertions, nestedRequiredFieldsAssertion("usage_required_fields", result.ResponseBody, []string{"usage"}, fields))
	}
	if fields := stringSlice(expect["content_required_fields"]); len(fields) > 0 {
		assertions = append(assertions, contentBlockRequiredFieldsAssertion("content_required_fields", result.ResponseBody, fields))
	}
	if shouldParse, _ := expect["content_should_parse_as_json"].(bool); shouldParse {
		content, ok := assistantContent(result.ResponseBody)
		if !ok {
			assertions = append(assertions, CaseAssertion{Name: "content_should_parse_as_json", Pass: false, Message: "未找到 choices[0].message.content"})
		} else {
			assertions = append(assertions, CaseAssertion{Name: "content_should_parse_as_json", Pass: json.Valid([]byte(content)), Message: "assistant content 应为合法 JSON 字符串"})
		}
	}
	if nonEmpty, _ := expect["assistant_content_non_empty"].(bool); nonEmpty {
		content, ok := assistantContent(result.ResponseBody)
		assertions = append(assertions, CaseAssertion{
			Name:    "assistant_content_non_empty",
			Pass:    ok && strings.TrimSpace(content) != "",
			Message: "预期 choices[0].message.content 为非空字符串",
		})
	}
	if prefix, _ := expect["assistant_content_starts_with"].(string); strings.TrimSpace(prefix) != "" {
		content, ok := assistantContent(result.ResponseBody)
		assertions = append(assertions, CaseAssertion{
			Name:    "assistant_content_starts_with",
			Pass:    ok && strings.HasPrefix(strings.TrimSpace(content), prefix),
			Message: fmt.Sprintf("预期 choices[0].message.content 以 %q 开头", prefix),
		})
	}
	if required, _ := expect["thinking_required"].(bool); required {
		assertions = append(assertions, thinkingRequiredAssertion(result.ResponseBody, expect))
	}
	if probe, _ := expect["thinking_location_probe"].(bool); probe {
		assertions = append(assertions, thinkingLocationProbeAssertion(result.ResponseBody))
	}
	if required, _ := expect["thinking_evidence_required"].(bool); required {
		assertions = append(assertions, thinkingEvidenceRequiredAssertion(result.ResponseBody))
	}
	if absent, _ := expect["thinking_absent"].(bool); absent {
		assertions = append(assertions, thinkingAbsentAssertion(result.ResponseBody, expect))
	}
	if min, ok := intFromExpect(expect["reasoning_tokens_min"]); ok {
		assertions = append(assertions, reasoningTokensMinAssertion(result.ResponseBody, min))
	}
	if max, ok := intFromExpect(expect["reasoning_tokens_max"]); ok {
		assertions = append(assertions, reasoningTokensMaxAssertion(result.ResponseBody, max))
	}
	if _, ok := expect["completion_tokens_max"]; ok {
		if assertion, ok := completionTokensMaxAssertion(result, expect); ok {
			assertions = append(assertions, assertion)
		}
	}
	if mode, _ := expect["output_length_cap_precedence"].(string); strings.TrimSpace(mode) != "" {
		if assertion, ok := outputLengthCapPrecedenceAssertion(result, mode); ok {
			assertions = append(assertions, assertion)
		}
	}
	if mode, _ := expect["output_cap_effective"].(string); strings.TrimSpace(mode) != "" {
		if assertion, ok := outputCapEffectiveAssertion(result, mode); ok {
			assertions = append(assertions, assertion)
		}
	}
	assertions = append(assertions, inferredAssertions(result, expect)...)
	return assertions
}

func inferredAssertions(result RunCaseResult, expect map[string]any) []CaseAssertion {
	assertions := make([]CaseAssertion, 0)
	if assertion, ok := nAssertion(result); ok {
		assertions = append(assertions, assertion)
	}
	if assertion, ok := tokenLimitAssertion(result, expect); ok {
		assertions = append(assertions, assertion)
	}
	if assertion, ok := finishReasonAssertion(result, expect); ok {
		assertions = append(assertions, assertion)
	}
	if assertion, ok := responseFormatAssertion(result); ok {
		assertions = append(assertions, assertion)
	}
	if assertion, ok := toolChoiceAssertion(result); ok {
		assertions = append(assertions, assertion)
	}
	if assertion, ok := toolCallPayloadAssertion(result); ok {
		assertions = append(assertions, assertion)
	}
	if assertion, ok := logprobsAssertion(result); ok {
		assertions = append(assertions, assertion)
	}
	if assertion, ok := topLogprobsAssertion(result); ok {
		assertions = append(assertions, assertion)
	}
	if assertion, ok := stopSequenceAssertion(result); ok {
		assertions = append(assertions, assertion)
	}
	return assertions
}

func nAssertion(result RunCaseResult) (CaseAssertion, bool) {
	expected, ok := intFromMap(result.RequestBody, "n")
	if !ok || expected <= 0 {
		return CaseAssertion{}, false
	}
	choices, ok := choicesArray(result.ResponseBody)
	if !ok {
		return CaseAssertion{Name: "n", Pass: false, Message: "响应缺少 choices 数组"}, true
	}
	return CaseAssertion{
		Name:    "n",
		Pass:    len(choices) == expected,
		Message: fmt.Sprintf("预期 choices 数量 %d，实际 %d", expected, len(choices)),
	}, true
}

func tokenLimitAssertion(result RunCaseResult, expect map[string]any) (CaseAssertion, bool) {
	if shouldSkipTokenLimitEnforcement(expect, result.CaseID, result.Category) {
		if isLengthParameterAcceptanceCase(result.CaseID, result.Category) {
			return lengthParameterAcceptanceAssertion(result), true
		}
		return CaseAssertion{}, false
	}
	limitName, limit, ok := tokenLimit(result.RequestBody)
	if !ok {
		return CaseAssertion{}, false
	}
	usageField := "completion_tokens"
	if isMessagesResponse(result.ResponseBody) {
		usageField = "output_tokens"
	}
	actual, ok := nestedInt(result.ResponseBody, []string{"usage", usageField})
	if !ok {
		return CaseAssertion{Name: limitName, Pass: false, Message: "响应 usage 中缺少 " + usageField}, true
	}
	return CaseAssertion{
		Name:    limitName,
		Pass:    actual <= limit,
		Message: fmt.Sprintf("预期 %s <= %d，实际 %d", usageField, limit, actual),
	}, true
}

func isLengthParameterAcceptanceCase(caseID, category string) bool {
	if category != "length" {
		return false
	}
	if strings.Contains(caseID, "_only_effective") || strings.Contains(caseID, "_precedence") {
		return false
	}
	if strings.Contains(caseID, "deprecated") || strings.Contains(caseID, "_null") || strings.Contains(caseID, "legacy") {
		return false
	}
	if strings.HasSuffix(caseID, "_length_max_tokens") || strings.HasSuffix(caseID, "_length_max_completion_tokens") {
		return true
	}
	if strings.HasSuffix(caseID, "_length_max_tokens_stop") || strings.HasSuffix(caseID, "_length_max_completion_tokens_stop") {
		return true
	}
	return false
}

func shouldSkipTokenLimitEnforcement(expect map[string]any, caseID, category string) bool {
	if enforced, ok := expect["token_limit_enforced"].(bool); ok && !enforced {
		return true
	}
	if _, ok := expect["output_cap_effective"]; ok {
		return true
	}
	if _, ok := expect["output_length_cap_precedence"]; ok {
		return true
	}
	if _, ok := expect["completion_tokens_max"]; ok {
		return true
	}
	return isLengthParameterAcceptanceCase(caseID, category)
}

func lengthParameterAcceptanceAssertion(result RunCaseResult) CaseAssertion {
	limitName, limit, ok := tokenLimit(result.RequestBody)
	if !ok {
		return CaseAssertion{Name: "parameter_acceptance", Pass: false, Message: "请求未设置输出上限参数"}
	}
	actual, hasTokens := responseCompletionTokens(result.ResponseBody)
	enforced := hasTokens && actual <= limit
	if enforced {
		return CaseAssertion{
			Name:    "parameter_acceptance",
			Pass:    true,
			Message: fmt.Sprintf("参数 %s 已接受且已生效（completion_tokens=%d <= %d）", limitName, actual, limit),
		}
	}
	message := fmt.Sprintf("参数 %s 已接受（HTTP %d），未验证生效性", limitName, result.HTTPStatus)
	if hasTokens {
		message = fmt.Sprintf(
			"参数 %s 已接受但未生效（completion_tokens=%d > %d）；若渠道文档未声明支持该参数，视为静默忽略",
			limitName,
			actual,
			limit,
		)
	}
	return CaseAssertion{
		Name:    "parameter_acceptance",
		Pass:    true,
		Message: message,
	}
}

func finishReasonAssertion(result RunCaseResult, expect map[string]any) (CaseAssertion, bool) {
	allowed := stringSlice(expect["allowed_finish_reasons"])
	if len(allowed) == 0 && tokenLimitName(result.RequestBody) != "" {
		if isMessagesResponse(result.ResponseBody) {
			allowed = []string{"end_turn", "max_tokens", "stop_sequence", "tool_use", "pause_turn", "refusal"}
		} else {
			allowed = []string{"stop", "length", "tool_calls", "eos", "content_filter"}
		}
	}
	if len(allowed) == 0 {
		return CaseAssertion{}, false
	}
	actual, ok := firstStringAt(result.ResponseBody, []string{"choices", "finish_reason"})
	if !ok {
		actual, ok = firstStringAt(result.ResponseBody, []string{"choices", "stop_reason"})
	}
	if !ok && isMessagesResponse(result.ResponseBody) {
		actual, ok = stringAt(result.ResponseBody, []string{"stop_reason"})
	}
	if !ok {
		return CaseAssertion{Name: "finish_reason", Pass: false, Message: "响应缺少 finish_reason/stop_reason"}, true
	}
	return CaseAssertion{
		Name:    "finish_reason",
		Pass:    containsString(allowed, actual),
		Message: fmt.Sprintf("预期 finish_reason/stop_reason 属于 [%s]，实际 %s", strings.Join(allowed, ", "), actual),
	}, true
}

func responseFormatAssertion(result RunCaseResult) (CaseAssertion, bool) {
	responseFormat, ok := result.RequestBody["response_format"].(map[string]any)
	if !ok {
		return CaseAssertion{}, false
	}
	formatType, _ := responseFormat["type"].(string)
	if formatType != "json_object" && formatType != "json_schema" {
		return CaseAssertion{}, false
	}
	content, ok := assistantContent(result.ResponseBody)
	if !ok {
		return CaseAssertion{Name: "response_format", Pass: false, Message: "未找到 choices[0].message.content"}, true
	}
	if !json.Valid([]byte(content)) {
		return CaseAssertion{Name: "response_format", Pass: false, Message: "assistant content 不是合法 JSON"}, true
	}
	if formatType == "json_schema" {
		required := schemaRequiredFields(responseFormat)
		if len(required) > 0 {
			var parsed map[string]any
			if err := json.Unmarshal([]byte(content), &parsed); err != nil {
				return CaseAssertion{Name: "response_format.json_schema", Pass: false, Message: "assistant content 不是 JSON object"}, true
			}
			missing := missingFields(parsed, required)
			return CaseAssertion{Name: "response_format.json_schema", Pass: len(missing) == 0, Message: missingMessage(missing)}, true
		}
	}
	return CaseAssertion{Name: "response_format", Pass: true, Message: "assistant content 是合法 JSON"}, true
}

func toolChoiceAssertion(result RunCaseResult) (CaseAssertion, bool) {
	choice, ok := result.RequestBody["tool_choice"]
	if !ok {
		return CaseAssertion{}, false
	}
	hasToolCalls := responseHasToolCalls(result.ResponseBody)
	switch typed := choice.(type) {
	case string:
		switch typed {
		case "none":
			return CaseAssertion{Name: "tool_choice", Pass: !hasToolCalls, Message: "tool_choice=none 时不应返回 tool_calls"}, true
		case "required":
			return CaseAssertion{Name: "tool_choice", Pass: hasToolCalls, Message: "tool_choice=required 时应返回 tool_calls"}, true
		default:
			return CaseAssertion{}, false
		}
	case map[string]any:
		if typed["type"] == "none" {
			return CaseAssertion{Name: "tool_choice", Pass: !hasToolCalls, Message: "tool_choice none 时不应返回 tool_calls"}, true
		}
		if typed["type"] == "any" || typed["type"] == "required" {
			return CaseAssertion{Name: "tool_choice", Pass: hasToolCalls, Message: "tool_choice required/any 时应返回 tool_calls"}, true
		}
		if typed["type"] == "function" {
			name, _ := nestedString(typed, []string{"function", "name"})
			if name == "" {
				return CaseAssertion{}, false
			}
			actual, ok := firstToolCallName(result.ResponseBody)
			return CaseAssertion{Name: "tool_choice", Pass: ok && actual == name, Message: fmt.Sprintf("预期调用 tool %s，实际 %s", name, emptyDash(actual))}, true
		}
		if typed["type"] == "tool" {
			name, _ := typed["name"].(string)
			actual, ok := firstToolCallName(result.ResponseBody)
			return CaseAssertion{Name: "tool_choice", Pass: ok && (name == "" || actual == name), Message: fmt.Sprintf("预期调用 tool %s，实际 %s", emptyDash(name), emptyDash(actual))}, true
		}
	}
	return CaseAssertion{}, false
}

func toolCallPayloadAssertion(result RunCaseResult) (CaseAssertion, bool) {
	if _, ok := result.RequestBody["tools"]; !ok {
		return CaseAssertion{}, false
	}
	if !responseHasToolCalls(result.ResponseBody) {
		return CaseAssertion{}, false
	}
	invalid := invalidToolCallArguments(result.ResponseBody)
	return CaseAssertion{Name: "tool_calls.arguments", Pass: len(invalid) == 0, Message: invalidToolArgumentsMessage(invalid)}, true
}

func logprobsAssertion(result RunCaseResult) (CaseAssertion, bool) {
	enabled, ok := boolFromMap(result.RequestBody, "logprobs")
	if !ok || !enabled {
		return CaseAssertion{}, false
	}
	exists := firstPathExists(result.ResponseBody, []string{"choices", "logprobs"})
	return CaseAssertion{Name: "logprobs", Pass: exists, Message: "logprobs=true 时预期 choices[].logprobs 存在"}, true
}

func topLogprobsAssertion(result RunCaseResult) (CaseAssertion, bool) {
	limit, ok := intFromMap(result.RequestBody, "top_logprobs")
	if !ok || limit < 0 {
		return CaseAssertion{}, false
	}
	maxSeen, ok := maxTopLogprobsSeen(result.ResponseBody)
	if !ok {
		return CaseAssertion{Name: "top_logprobs", Pass: false, Message: "响应缺少可检查的 top_logprobs"}, true
	}
	return CaseAssertion{Name: "top_logprobs", Pass: maxSeen <= limit, Message: fmt.Sprintf("预期每个 token top_logprobs <= %d，实际最大 %d", limit, maxSeen)}, true
}

func stopSequenceAssertion(result RunCaseResult) (CaseAssertion, bool) {
	_, hasStop := result.RequestBody["stop"]
	_, hasStopSequences := result.RequestBody["stop_sequences"]
	if !hasStop && !hasStopSequences {
		return CaseAssertion{}, false
	}
	reason := firstFinishOrStopReason(result.ResponseBody)
	if reason == "" {
		return CaseAssertion{Name: "stop", Pass: false, Message: "响应缺少 finish_reason/stop_reason"}, true
	}
	allowed := []string{"stop", "stop_sequence", "eos", "length"}
	if isMessagesResponse(result.ResponseBody) {
		allowed = []string{"end_turn", "max_tokens", "stop_sequence", "tool_use", "pause_turn", "refusal"}
	}
	return CaseAssertion{Name: "stop", Pass: containsString(allowed, reason), Message: "实际 finish_reason/stop_reason=" + reason}, true
}

func requiredFieldsAssertion(name string, value any, fields []string) CaseAssertion {
	object, ok := value.(map[string]any)
	if !ok {
		return CaseAssertion{Name: name, Pass: false, Message: "响应不是 JSON object"}
	}
	missing := missingFields(object, fields)
	return CaseAssertion{
		Name:    name,
		Pass:    len(missing) == 0,
		Message: missingMessage(missing),
	}
}

func nestedRequiredFieldsAssertion(name string, value any, path []string, fields []string) CaseAssertion {
	current := value
	for _, part := range path {
		object, ok := current.(map[string]any)
		if !ok {
			return CaseAssertion{Name: name, Pass: false, Message: strings.Join(path, ".") + " 不存在"}
		}
		current = object[part]
	}
	if array, ok := current.([]any); ok {
		if len(array) == 0 {
			return CaseAssertion{Name: name, Pass: false, Message: strings.Join(path, ".") + " 为空"}
		}
		current = array[0]
	}
	return requiredFieldsAssertion(name, current, fieldsRelativeToPath(fields, path))
}

func contentBlockRequiredFieldsAssertion(name string, value any, fields []string) CaseAssertion {
	content, ok := valueAt(value, []string{"content"})
	if !ok {
		return CaseAssertion{Name: name, Pass: false, Message: "content 不存在"}
	}
	array, ok := content.([]any)
	if !ok {
		return requiredFieldsAssertion(name, content, fields)
	}
	if len(array) == 0 {
		return CaseAssertion{Name: name, Pass: false, Message: "content 为空"}
	}
	missingByIndex := make([]string, 0, len(array))
	for index, item := range array {
		object, ok := item.(map[string]any)
		if !ok {
			missingByIndex = append(missingByIndex, fmt.Sprintf("content[%d] 不是 object", index))
			continue
		}
		missing := missingFields(object, fields)
		if len(missing) == 0 {
			return CaseAssertion{Name: name, Pass: true, Message: "content 中存在满足字段要求的 block"}
		}
		missingByIndex = append(missingByIndex, fmt.Sprintf("content[%d] 缺少 %s", index, strings.Join(missing, ", ")))
	}
	return CaseAssertion{Name: name, Pass: false, Message: strings.Join(missingByIndex, "；")}
}

func thinkingRequiredAssertion(value any, expect map[string]any) CaseAssertion {
	location, _ := expect["thinking_location"].(string)
	if location == "" {
		location = inferredThinkingLocation(value)
	}
	switch location {
	case "messages.content_block":
		block, ok := firstContentBlockWithType(value, "thinking")
		if !ok {
			return CaseAssertion{Name: "thinking_required", Pass: false, Message: "预期 content[] 中存在 type=thinking 的 block"}
		}
		if text, _ := block["thinking"].(string); strings.TrimSpace(text) == "" {
			return CaseAssertion{Name: "thinking_required", Pass: false, Message: "预期 thinking block.thinking 为非空字符串"}
		}
		if mustPrecede, _ := expect["thinking_must_precede_text"].(bool); mustPrecede && !thinkingPrecedesText(value) {
			return CaseAssertion{Name: "thinking_required", Pass: false, Message: "预期 content[] 中 thinking block 位于 text block 之前"}
		}
		if fields := stringSlice(expect["thinking_required_fields"]); len(fields) > 0 {
			missing := missingFields(block, fields)
			return CaseAssertion{Name: "thinking_required", Pass: len(missing) == 0, Message: missingMessage(missing)}
		}
		return CaseAssertion{Name: "thinking_required", Pass: true, Message: "content[] 中存在非空 thinking block"}
	case "chat.message.reasoning_content":
		text, ok := firstStringAt(value, []string{"choices", "message", "reasoning_content"})
		return CaseAssertion{Name: "thinking_required", Pass: ok && strings.TrimSpace(text) != "", Message: "预期 choices[0].message.reasoning_content 为非空字符串"}
	case "chat.message.reasoning":
		thinking, ok := firstValueAt(value, []string{"choices", "message", "reasoning"})
		return CaseAssertion{Name: "thinking_required", Pass: ok && !emptyJSONValue(thinking), Message: "预期 choices[0].message.reasoning 存在且非空"}
	case "chat.message.reasoning_details":
		details, ok := firstValueAt(value, []string{"choices", "message", "reasoning_details"})
		return CaseAssertion{Name: "thinking_required", Pass: ok && !emptyJSONValue(details), Message: "预期 choices[0].message.reasoning_details 存在且非空"}
	case "chat.message.content_think_tag":
		content, ok := assistantContent(value)
		return CaseAssertion{Name: "thinking_required", Pass: ok && containsThinkTag(content), Message: "预期 choices[0].message.content 包含 <think>...</think>"}
	default:
		return CaseAssertion{Name: "thinking_required", Pass: false, Message: "未知 thinking_location: " + location}
	}
}

func thinkingAbsentAssertion(value any, expect map[string]any) CaseAssertion {
	location, _ := expect["thinking_location"].(string)
	locations := []string{"messages.content_block", "chat.message.reasoning_content", "chat.message.reasoning", "chat.message.reasoning_details", "chat.message.content_think_tag"}
	if location != "" {
		locations = []string{location}
	}
	present := make([]string, 0)
	for _, candidate := range locations {
		if thinkingPresentAt(value, candidate) {
			present = append(present, candidate)
		}
	}
	if tokenEvidence := thinkingTokenEvidence(value); len(tokenEvidence) > 0 {
		present = append(present, tokenEvidence...)
	}
	return CaseAssertion{Name: "thinking_absent", Pass: len(present) == 0, Message: "不应出现 thinking 输出或 reasoning/thinking token 证据；实际位置: " + strings.Join(present, ", ")}
}

func thinkingLocationProbeAssertion(value any) CaseAssertion {
	locations := thinkingLocations(value)
	tokenEvidence := thinkingTokenEvidence(value)
	message := thinkingEvidenceMessage(locations, tokenEvidence)
	return CaseAssertion{Name: "thinking_location_probe", Pass: true, Message: message}
}

func thinkingEvidenceRequiredAssertion(value any) CaseAssertion {
	locations := thinkingLocations(value)
	tokenEvidence := thinkingTokenEvidence(value)
	pass := len(locations) > 0 || len(tokenEvidence) > 0
	return CaseAssertion{Name: "thinking_evidence_required", Pass: pass, Message: thinkingEvidenceMessage(locations, tokenEvidence)}
}

func thinkingEvidenceMessage(locations, tokenEvidence []string) string {
	parts := make([]string, 0, 2)
	if len(locations) > 0 {
		parts = append(parts, "thinking 内容位置: "+strings.Join(locations, ", "))
	}
	if len(tokenEvidence) > 0 {
		parts = append(parts, "token 证据: "+strings.Join(tokenEvidence, ", "))
	}
	if len(parts) == 0 {
		return "未探测到 thinking 内容位置或 reasoning/thinking token 证据"
	}
	return strings.Join(parts, "；")
}

func inferredThinkingLocation(value any) string {
	if isMessagesResponse(value) {
		return "messages.content_block"
	}
	return "chat.message.reasoning_content"
}

func thinkingLocations(value any) []string {
	locations := make([]string, 0)
	if _, ok := firstContentBlockWithType(value, "redacted_thinking"); ok {
		locations = append(locations, "messages.content_block.redacted_thinking")
	} else if thinkingPresentAt(value, "messages.content_block") {
		locations = append(locations, "messages.content_block")
	}
	for _, candidate := range []string{"chat.message.reasoning_content", "chat.message.reasoning", "chat.message.reasoning_details", "chat.message.content_think_tag"} {
		if thinkingPresentAt(value, candidate) {
			locations = append(locations, candidate)
		}
	}
	return locations
}

func thinkingPresentAt(value any, location string) bool {
	switch location {
	case "messages.content_block":
		if _, ok := firstContentBlockWithType(value, "redacted_thinking"); ok {
			return true
		}
		block, ok := firstContentBlockWithType(value, "thinking")
		if !ok {
			return false
		}
		text, _ := block["thinking"].(string)
		return strings.TrimSpace(text) != ""
	case "chat.message.reasoning_content":
		text, ok := firstStringAt(value, []string{"choices", "message", "reasoning_content"})
		return ok && strings.TrimSpace(text) != ""
	case "chat.message.reasoning":
		thinking, ok := firstValueAt(value, []string{"choices", "message", "reasoning"})
		return ok && !emptyJSONValue(thinking)
	case "chat.message.reasoning_details":
		details, ok := firstValueAt(value, []string{"choices", "message", "reasoning_details"})
		return ok && !emptyJSONValue(details)
	case "chat.message.content_think_tag":
		content, ok := assistantContent(value)
		return ok && containsThinkTag(content)
	default:
		return false
	}
}

func thinkingTokenEvidence(value any) []string {
	evidence := make([]string, 0)
	walkJSONPath(value, nil, func(path []string, key string, value any) {
		lowerKey := strings.ToLower(key)
		if lowerKey != "reasoning_tokens" && lowerKey != "thinking_tokens" {
			return
		}
		count, ok := intValue(value)
		if !ok || count <= 0 {
			return
		}
		evidence = append(evidence, strings.Join(append(path, key), "."))
	})
	sort.Strings(evidence)
	return evidence
}

func intFromExpect(value any) (int, bool) {
	return intValue(value)
}

func maxTokenFieldCount(value any, field string) (int, bool) {
	maxCount := 0
	found := false
	lowerField := strings.ToLower(field)
	walkJSONPath(value, nil, func(path []string, key string, value any) {
		if strings.ToLower(key) != lowerField {
			return
		}
		count, ok := intValue(value)
		if !ok {
			return
		}
		found = true
		if count > maxCount {
			maxCount = count
		}
	})
	return maxCount, found
}

func populateThinkingTokenMetrics(result *RunCaseResult) {
	if result == nil || result.ResponseBody == nil {
		return
	}
	if count, ok := maxTokenFieldCount(result.ResponseBody, "reasoning_tokens"); ok {
		result.ReasoningTokens = &count
	}
	if count, ok := maxTokenFieldCount(result.ResponseBody, "thinking_tokens"); ok {
		result.ThinkingTokens = &count
	}
}

func populateStreamUsagePresent(result *RunCaseResult) {
	if result == nil || !requestStreamEnabled(result.RequestBody) || !looksLikeSSE(result.RawResponse) {
		return
	}
	present := sseHasUsage(result.RawResponse)
	result.StreamUsagePresent = &present
}

type sseChunk struct {
	hasRealUsage    bool
	choicesEmpty    bool
	hasFinishReason bool
}

type sseChunkParseResult struct {
	chunks            []sseChunk
	doneMarkerPresent bool
}

func parseSSEChunks(raw string) sseChunkParseResult {
	result := sseChunkParseResult{chunks: make([]sseChunk, 0)}
	for _, line := range strings.Split(raw, "\n") {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		line = strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if line == "" {
			continue
		}
		if line == "[DONE]" {
			result.doneMarkerPresent = true
			continue
		}
		parsed, ok := parseJSON([]byte(line))
		if !ok {
			continue
		}
		chunk := sseChunk{}
		if usage, ok := valueAt(parsed, []string{"usage"}); ok {
			if _, ok := usage.(map[string]any); ok {
				chunk.hasRealUsage = true
			}
		}
		if choices, ok := valueAt(parsed, []string{"choices"}); ok {
			if arr, ok := choices.([]any); ok {
				chunk.choicesEmpty = len(arr) == 0
				for _, item := range arr {
					choice, ok := item.(map[string]any)
					if !ok {
						continue
					}
					if finishReason, ok := valueAt(choice, []string{"finish_reason"}); ok && finishReason != nil {
						chunk.hasFinishReason = true
						break
					}
				}
			}
		}
		result.chunks = append(result.chunks, chunk)
	}
	return result
}

func classifyStreamUsageChunkProfile(chunks []sseChunk) string {
	hasRealUsage := false
	hasDedicatedUsage := false
	hasMergedFinishReason := false
	for _, chunk := range chunks {
		if !chunk.hasRealUsage {
			continue
		}
		hasRealUsage = true
		if chunk.hasFinishReason {
			hasMergedFinishReason = true
			continue
		}
		if chunk.choicesEmpty {
			hasDedicatedUsage = true
		}
	}
	if !hasRealUsage {
		return "missing"
	}
	if hasMergedFinishReason {
		return "merged_finish_reason"
	}
	if hasDedicatedUsage {
		return "dedicated"
	}
	return "other"
}

func dedicatedUsageChunkIsLastBeforeDone(chunks []sseChunk) bool {
	lastUsageIndex := -1
	for i, chunk := range chunks {
		if chunk.hasRealUsage && chunk.choicesEmpty && !chunk.hasFinishReason {
			lastUsageIndex = i
		}
	}
	if lastUsageIndex < 0 {
		return false
	}
	for i := lastUsageIndex + 1; i < len(chunks); i++ {
		if chunks[i].hasRealUsage {
			return false
		}
	}
	return lastUsageIndex == len(chunks)-1
}

func streamUsageChunkProfileLabel(profile string) string {
	switch profile {
	case "dedicated":
		return "独立 usage chunk（choices:[]）"
	case "merged_finish_reason":
		return "usage 与 finish_reason 合并"
	case "missing":
		return "无 usage 对象"
	case "other":
		return "其他 usage 分片形态"
	default:
		return profile
	}
}

func populateStreamUsageChunkProfile(result *RunCaseResult) {
	if result == nil || !requestStreamEnabled(result.RequestBody) || !looksLikeSSE(result.RawResponse) {
		return
	}
	parsed := parseSSEChunks(result.RawResponse)
	profile := classifyStreamUsageChunkProfile(parsed.chunks)
	result.StreamUsageChunkProfile = &profile
	doneMarker := parsed.doneMarkerPresent
	result.StreamDoneMarkerPresent = &doneMarker
}

func streamUsageChunkShapeAssertion(raw string, mode string) (CaseAssertion, bool) {
	mode = strings.ToLower(strings.TrimSpace(mode))
	if mode == "" {
		return CaseAssertion{}, false
	}
	parsed := parseSSEChunks(raw)
	profile := classifyStreamUsageChunkProfile(parsed.chunks)
	label := streamUsageChunkProfileLabel(profile)
	switch mode {
	case "openai_dedicated":
		if profile != "dedicated" {
			return CaseAssertion{
				Name:    "stream_usage_chunk_shape",
				Pass:    false,
				Message: fmt.Sprintf("预期 OpenAI 独立 usage chunk，实际为 %s", label),
			}, true
		}
		if !dedicatedUsageChunkIsLastBeforeDone(parsed.chunks) {
			return CaseAssertion{
				Name:    "stream_usage_chunk_shape",
				Pass:    false,
				Message: "usage chunk 存在，但不是 [DONE] 前最后一个 data chunk",
			}, true
		}
		if !parsed.doneMarkerPresent {
			return CaseAssertion{
				Name:    "stream_usage_chunk_shape",
				Pass:    false,
				Message: "预期流以 data: [DONE] 结束，但未找到 [DONE]",
			}, true
		}
		return CaseAssertion{
			Name:    "stream_usage_chunk_shape",
			Pass:    true,
			Message: "通过：独立 usage chunk 位于 [DONE] 前",
		}, true
	case "observed":
		return CaseAssertion{
			Name:    "stream_usage_chunk_shape",
			Pass:    true,
			Message: fmt.Sprintf("观测：%s", label),
		}, true
	default:
		return CaseAssertion{}, false
	}
}

func streamUsageInSSEAssertion(raw string, mode string) (CaseAssertion, bool) {
	mode = strings.ToLower(strings.TrimSpace(mode))
	if mode == "" {
		return CaseAssertion{}, false
	}
	hasUsage := sseHasUsage(raw)
	switch mode {
	case "required":
		if hasUsage {
			return CaseAssertion{Name: "stream_usage_in_sse", Pass: true, Message: "SSE 含 usage chunk"}, true
		}
		return CaseAssertion{Name: "stream_usage_in_sse", Pass: false, Message: "预期 SSE 含 usage chunk，但未找到"}, true
	case "forbidden":
		if hasUsage {
			return CaseAssertion{Name: "stream_usage_in_sse", Pass: false, Message: "预期 SSE 不含 usage chunk，但找到了 usage"}, true
		}
		return CaseAssertion{Name: "stream_usage_in_sse", Pass: true, Message: "SSE 不含 usage chunk"}, true
	case "observed":
		message := "观测：SSE 不含 usage chunk"
		if hasUsage {
			message = "观测：SSE 含 usage chunk"
		}
		return CaseAssertion{Name: "stream_usage_in_sse", Pass: true, Message: message}, true
	default:
		return CaseAssertion{}, false
	}
}

func reasoningTokensMinAssertion(value any, min int) CaseAssertion {
	actual, ok := maxTokenFieldCount(value, "reasoning_tokens")
	if !ok {
		return CaseAssertion{Name: "reasoning_tokens_min", Pass: false, Message: fmt.Sprintf("响应 usage 中缺少 reasoning_tokens；预期 >= %d", min)}
	}
	return CaseAssertion{
		Name:    "reasoning_tokens_min",
		Pass:    actual >= min,
		Message: fmt.Sprintf("预期 reasoning_tokens >= %d，实际 %d", min, actual),
	}
}

func reasoningTokensMaxAssertion(value any, max int) CaseAssertion {
	actual, ok := maxTokenFieldCount(value, "reasoning_tokens")
	if !ok {
		return CaseAssertion{Name: "reasoning_tokens_max", Pass: false, Message: fmt.Sprintf("响应 usage 中缺少 reasoning_tokens；预期 <= %d", max)}
	}
	return CaseAssertion{
		Name:    "reasoning_tokens_max",
		Pass:    actual <= max,
		Message: fmt.Sprintf("预期 reasoning_tokens <= %d，实际 %d", max, actual),
	}
}

func completionTokensMaxCap(result RunCaseResult, expect map[string]any) (int, bool) {
	if cap, ok := intFromExpect(expect["completion_tokens_max"]); ok {
		return cap, true
	}
	if mode, _ := expect["completion_tokens_max"].(string); strings.EqualFold(strings.TrimSpace(mode), "request") {
		_, cap, ok := tokenLimit(result.RequestBody)
		return cap, ok
	}
	return 0, false
}

func completionTokensMaxAssertion(result RunCaseResult, expect map[string]any) (CaseAssertion, bool) {
	cap, ok := completionTokensMaxCap(result, expect)
	if !ok {
		return CaseAssertion{}, false
	}
	actual, ok := responseCompletionTokens(result.ResponseBody)
	if !ok {
		return CaseAssertion{
			Name:    "completion_tokens_max",
			Pass:    false,
			Message: fmt.Sprintf("响应 usage 中缺少 completion_tokens；预期 <= %d", cap),
		}, true
	}
	reasoning := 0
	if rt, ok := maxTokenFieldCount(result.ResponseBody, "reasoning_tokens"); ok {
		reasoning = rt
	}
	pass := actual <= cap
	message := fmt.Sprintf("预期 completion_tokens <= %d，实际 %d", cap, actual)
	if !pass {
		message = fmt.Sprintf("Completion tokens exceeded max_tokens: completion_tokens=%d > cap=%d", actual, cap)
	}
	if reasoning > 0 {
		message += fmt.Sprintf(" (reasoning_tokens=%d)", reasoning)
	}
	return CaseAssertion{Name: "completion_tokens_max", Pass: pass, Message: message}, true
}

func emptyJSONValue(value any) bool {
	switch typed := value.(type) {
	case nil:
		return true
	case string:
		return strings.TrimSpace(typed) == ""
	case []any:
		return len(typed) == 0
	case map[string]any:
		return len(typed) == 0
	default:
		return false
	}
}

func firstContentBlockWithType(value any, blockType string) (map[string]any, bool) {
	content, ok := valueAt(value, []string{"content"})
	if !ok {
		return nil, false
	}
	array, ok := content.([]any)
	if !ok {
		return nil, false
	}
	for _, item := range array {
		block, ok := item.(map[string]any)
		if !ok {
			continue
		}
		if typed, _ := block["type"].(string); typed == blockType {
			return block, true
		}
	}
	return nil, false
}

func thinkingPrecedesText(value any) bool {
	content, ok := valueAt(value, []string{"content"})
	if !ok {
		return false
	}
	array, ok := content.([]any)
	if !ok {
		return false
	}
	thinkingIndex := -1
	textIndex := -1
	for index, item := range array {
		block, ok := item.(map[string]any)
		if !ok {
			continue
		}
		switch typed, _ := block["type"].(string); typed {
		case "thinking":
			if thinkingIndex < 0 {
				thinkingIndex = index
			}
		case "text":
			if textIndex < 0 {
				textIndex = index
			}
		}
	}
	return thinkingIndex >= 0 && textIndex > thinkingIndex
}

func containsThinkTag(content string) bool {
	lower := strings.ToLower(content)
	start := strings.Index(lower, "<think>")
	end := strings.Index(lower, "</think>")
	return start >= 0 && end > start+len("<think>")
}

func tokenLimit(request map[string]any) (string, int, bool) {
	if value, ok := intFromMap(request, "max_completion_tokens"); ok && value >= 0 {
		return "max_completion_tokens", value, true
	}
	if value, ok := intFromMap(request, "max_tokens"); ok && value >= 0 {
		return "max_tokens", value, true
	}
	return "", 0, false
}

func tokenLimitName(request map[string]any) string {
	name, _, ok := tokenLimit(request)
	if !ok {
		return ""
	}
	return name
}

func outputLengthLimits(request map[string]any) (maxTokens int, hasMaxTokens bool, maxCompletion int, hasMaxCompletion bool) {
	if request == nil {
		return 0, false, 0, false
	}
	if value, ok := intFromMap(request, "max_tokens"); ok && value >= 0 {
		maxTokens, hasMaxTokens = value, true
	}
	if value, ok := intFromMap(request, "max_completion_tokens"); ok && value >= 0 {
		maxCompletion, hasMaxCompletion = value, true
	}
	return maxTokens, hasMaxTokens, maxCompletion, hasMaxCompletion
}

func responseCompletionTokens(responseBody any) (int, bool) {
	if responseBody == nil {
		return 0, false
	}
	if isMessagesResponse(responseBody) {
		return nestedInt(responseBody, []string{"usage", "output_tokens"})
	}
	return nestedInt(responseBody, []string{"usage", "completion_tokens"})
}

func responseFinishReason(responseBody any) string {
	if responseBody == nil {
		return ""
	}
	if actual, ok := firstStringAt(responseBody, []string{"choices", "finish_reason"}); ok {
		return actual
	}
	if actual, ok := firstStringAt(responseBody, []string{"choices", "stop_reason"}); ok {
		return actual
	}
	if isMessagesResponse(responseBody) {
		if actual, ok := stringAt(responseBody, []string{"stop_reason"}); ok {
			return actual
		}
	}
	return ""
}

func completionTokensNearCap(completionTokens, cap int) bool {
	if cap <= 0 || completionTokens <= 0 {
		return false
	}
	lower := cap - cap/5
	if lower < 1 {
		lower = 1
	}
	upper := cap + cap/5
	return completionTokens >= lower && completionTokens <= upper
}

func classifyOutputLengthCapPrecedence(httpStatus int, request map[string]any, responseBody any) string {
	if httpStatus >= 400 {
		return "rejected"
	}
	maxTokens, hasMaxTokens, maxCompletion, hasMaxCompletion := outputLengthLimits(request)
	if hasMaxTokens && hasMaxCompletion {
		completionTokens, hasCompletion := responseCompletionTokens(responseBody)
		finishReason := responseFinishReason(responseBody)
		if !hasCompletion {
			return "inconclusive"
		}
		if maxTokens == maxCompletion {
			if finishReasonIsLength(finishReason) && completionTokensNearCap(completionTokens, maxTokens) {
				return "min_wins"
			}
			return "inconclusive"
		}
		minCap := maxTokens
		if maxCompletion < minCap {
			minCap = maxCompletion
		}
		if finishReasonIsLength(finishReason) || completionTokensNearCap(completionTokens, minCap) {
			if completionTokensNearCap(completionTokens, maxTokens) && maxTokens <= maxCompletion {
				return "max_tokens"
			}
			if completionTokensNearCap(completionTokens, maxCompletion) && maxCompletion <= maxTokens {
				return "max_completion_tokens"
			}
			if completionTokensNearCap(completionTokens, minCap) {
				return "min_wins"
			}
		}
		return "inconclusive"
	}
	if hasMaxTokens || hasMaxCompletion {
		return "single_field_only"
	}
	return "inconclusive"
}

func outputLengthCapPrecedenceLabel(profile string) string {
	switch profile {
	case "max_tokens":
		return "max_tokens 生效"
	case "max_completion_tokens":
		return "max_completion_tokens 生效"
	case "min_wins":
		return "取较小上限"
	case "rejected":
		return "双参被拒绝"
	case "single_field_only":
		return "仅单字段"
	case "inconclusive":
		return "未能判定"
	default:
		return profile
	}
}

func evaluateResultOutputCapEffective(result RunCaseResult) (bool, string) {
	_, limit, ok := tokenLimit(result.RequestBody)
	if !ok || limit <= 0 {
		return false, "请求未设置输出上限参数"
	}
	completionTokens, hasCompletion := responseCompletionTokens(result.ResponseBody)
	finishReason := responseFinishReason(result.ResponseBody)
	attempt := capacityAttempt{
		Candidate:        limit,
		CompletionTokens: completionTokens,
		FinishReason:     finishReason,
	}
	if !hasCompletion {
		attempt.CompletionTokens = 0
	}
	return evaluateOutputCapEffective(attempt)
}

func populateOutputLengthMetrics(result *RunCaseResult) {
	if result == nil || result.RequestBody == nil {
		return
	}
	_, hasMaxTokens, _, hasMaxCompletion := outputLengthLimits(result.RequestBody)
	if !hasMaxTokens && !hasMaxCompletion {
		return
	}
	if hasMaxTokens && hasMaxCompletion {
		profile := classifyOutputLengthCapPrecedence(result.HTTPStatus, result.RequestBody, result.ResponseBody)
		result.OutputLengthCapPrecedence = &profile
	}
	if _, limit, ok := tokenLimit(result.RequestBody); ok && limit > 0 {
		effective, _ := evaluateResultOutputCapEffective(*result)
		result.OutputCapEffective = &effective
	}
}

func outputLengthCapPrecedenceAssertion(result RunCaseResult, mode string) (CaseAssertion, bool) {
	mode = strings.ToLower(strings.TrimSpace(mode))
	if mode == "" {
		return CaseAssertion{}, false
	}
	profile := classifyOutputLengthCapPrecedence(result.HTTPStatus, result.RequestBody, result.ResponseBody)
	label := outputLengthCapPrecedenceLabel(profile)
	switch mode {
	case "observed":
		return CaseAssertion{
			Name:    "output_length_cap_precedence",
			Pass:    true,
			Message: fmt.Sprintf("观测：%s", label),
		}, true
	case "max_tokens":
		pass := profile == "max_tokens"
		if !pass && profile == "min_wins" {
			mt, hm, mc, hmc := outputLengthLimits(result.RequestBody)
			pass = hm && hmc && mt <= mc
		}
		return CaseAssertion{
			Name:    "output_length_cap_precedence",
			Pass:    pass,
			Message: fmt.Sprintf("预期 max_tokens 生效，实际 %s", label),
		}, true
	case "max_completion_tokens":
		pass := profile == "max_completion_tokens"
		if !pass && profile == "min_wins" {
			mt, hm, mc, hmc := outputLengthLimits(result.RequestBody)
			pass = hm && hmc && mc <= mt
		}
		return CaseAssertion{
			Name:    "output_length_cap_precedence",
			Pass:    pass,
			Message: fmt.Sprintf("预期 max_completion_tokens 生效，实际 %s", label),
		}, true
	default:
		return CaseAssertion{}, false
	}
}

func outputCapEffectiveAssertion(result RunCaseResult, mode string) (CaseAssertion, bool) {
	mode = strings.ToLower(strings.TrimSpace(mode))
	if mode == "" {
		return CaseAssertion{}, false
	}
	effective, detail := evaluateResultOutputCapEffective(result)
	switch mode {
	case "required":
		return CaseAssertion{
			Name:    "output_cap_effective",
			Pass:    effective,
			Message: detail,
		}, true
	case "observed":
		message := fmt.Sprintf("观测：输出 cap 未生效（%s）", detail)
		if effective {
			message = fmt.Sprintf("观测：输出 cap 生效（%s）", detail)
		}
		return CaseAssertion{
			Name:    "output_cap_effective",
			Pass:    true,
			Message: message,
		}, true
	default:
		return CaseAssertion{}, false
	}
}

func intFromMap(object map[string]any, key string) (int, bool) {
	value, ok := object[key]
	if !ok || value == nil {
		return 0, false
	}
	return intValue(value)
}

func boolFromMap(object map[string]any, key string) (bool, bool) {
	value, ok := object[key]
	if !ok || value == nil {
		return false, false
	}
	typed, ok := value.(bool)
	return typed, ok
}

func intValue(value any) (int, bool) {
	switch typed := value.(type) {
	case float64:
		return int(typed), true
	case int:
		return typed, true
	case int64:
		return int(typed), true
	case json.Number:
		number, err := typed.Int64()
		return int(number), err == nil
	default:
		return 0, false
	}
}

func floatValue(value any) (float64, bool) {
	switch typed := value.(type) {
	case float64:
		return typed, true
	case float32:
		return float64(typed), true
	case int:
		return float64(typed), true
	case int64:
		return float64(typed), true
	case json.Number:
		number, err := typed.Float64()
		return number, err == nil
	default:
		return 0, false
	}
}

func nestedInt(value any, path []string) (int, bool) {
	current, ok := valueAt(value, path)
	if !ok {
		return 0, false
	}
	return intValue(current)
}

func nestedString(object map[string]any, path []string) (string, bool) {
	value, ok := valueAt(object, path)
	if !ok {
		return "", false
	}
	text, ok := value.(string)
	return text, ok
}

func stringAt(value any, path []string) (string, bool) {
	current, ok := valueAt(value, path)
	if !ok {
		return "", false
	}
	text, ok := current.(string)
	return text, ok
}

func valueAt(value any, path []string) (any, bool) {
	current := value
	for _, part := range path {
		object, ok := current.(map[string]any)
		if !ok {
			return nil, false
		}
		current, ok = object[part]
		if !ok {
			return nil, false
		}
	}
	return current, true
}

func choicesArray(value any) ([]any, bool) {
	object, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	choices, ok := object["choices"].([]any)
	return choices, ok
}

func firstStringAt(value any, path []string) (string, bool) {
	if len(path) < 2 {
		return stringAt(value, path)
	}
	object, ok := value.(map[string]any)
	if !ok {
		return "", false
	}
	array, ok := object[path[0]].([]any)
	if !ok || len(array) == 0 {
		return "", false
	}
	item, ok := array[0].(map[string]any)
	if !ok {
		return "", false
	}
	return nestedString(item, path[1:])
}

func firstValueAt(value any, path []string) (any, bool) {
	if len(path) < 2 {
		return valueAt(value, path)
	}
	object, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	array, ok := object[path[0]].([]any)
	if !ok || len(array) == 0 {
		return nil, false
	}
	item, ok := array[0].(map[string]any)
	if !ok {
		return nil, false
	}
	return valueAt(item, path[1:])
}

func firstPathExists(value any, path []string) bool {
	if len(path) < 2 {
		_, ok := valueAt(value, path)
		return ok
	}
	object, ok := value.(map[string]any)
	if !ok {
		return false
	}
	array, ok := object[path[0]].([]any)
	if !ok || len(array) == 0 {
		return false
	}
	item, ok := array[0].(map[string]any)
	if !ok {
		return false
	}
	_, ok = valueAt(item, path[1:])
	return ok
}

func isMessagesResponse(value any) bool {
	object, ok := value.(map[string]any)
	if !ok {
		return false
	}
	if _, ok := object["content"].([]any); !ok {
		return false
	}
	_, hasChoices := object["choices"]
	return !hasChoices
}

func containsString(values []string, needle string) bool {
	for _, value := range values {
		if value == needle {
			return true
		}
	}
	return false
}

func schemaRequiredFields(responseFormat map[string]any) []string {
	jsonSchema, ok := responseFormat["json_schema"].(map[string]any)
	if !ok {
		return nil
	}
	schema, ok := jsonSchema["schema"].(map[string]any)
	if !ok {
		return nil
	}
	return stringSlice(schema["required"])
}

func responseHasToolCalls(value any) bool {
	calls, ok := firstToolCalls(value)
	return ok && len(calls) > 0
}

func firstToolCalls(value any) ([]any, bool) {
	choices, ok := choicesArray(value)
	if ok && len(choices) > 0 {
		if choice, ok := choices[0].(map[string]any); ok {
			if message, ok := choice["message"].(map[string]any); ok {
				if calls, ok := message["tool_calls"].([]any); ok {
					return calls, true
				}
			}
		}
	}
	object, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	content, ok := object["content"].([]any)
	if !ok {
		return nil, false
	}
	calls := make([]any, 0)
	for _, item := range content {
		part, ok := item.(map[string]any)
		if !ok {
			continue
		}
		if part["type"] == "tool_use" {
			calls = append(calls, part)
		}
	}
	return calls, len(calls) > 0
}

func firstToolCallName(value any) (string, bool) {
	calls, ok := firstToolCalls(value)
	if !ok || len(calls) == 0 {
		return "", false
	}
	call, ok := calls[0].(map[string]any)
	if !ok {
		return "", false
	}
	if function, ok := call["function"].(map[string]any); ok {
		if name, ok := function["name"].(string); ok {
			return name, true
		}
	}
	if name, ok := call["name"].(string); ok {
		return name, true
	}
	return "", false
}

func invalidToolCallArguments(value any) []string {
	calls, ok := firstToolCalls(value)
	if !ok {
		return nil
	}
	invalid := make([]string, 0)
	for index, item := range calls {
		call, ok := item.(map[string]any)
		if !ok {
			invalid = append(invalid, fmt.Sprintf("tool_call[%d] 不是 object", index))
			continue
		}
		if input, ok := call["input"]; ok {
			if _, ok := input.(map[string]any); !ok {
				invalid = append(invalid, fmt.Sprintf("tool_call[%d].input 不是 object", index))
			}
			continue
		}
		function, ok := call["function"].(map[string]any)
		if !ok {
			continue
		}
		arguments, ok := function["arguments"].(string)
		if ok && arguments != "" && !json.Valid([]byte(arguments)) {
			invalid = append(invalid, fmt.Sprintf("tool_call[%d].function.arguments 不是合法 JSON", index))
		}
	}
	return invalid
}

func invalidToolArgumentsMessage(invalid []string) string {
	if len(invalid) == 0 {
		return "tool call 参数结构通过"
	}
	return strings.Join(invalid, "；")
}

func maxTopLogprobsSeen(value any) (int, bool) {
	choices, ok := choicesArray(value)
	if !ok || len(choices) == 0 {
		return 0, false
	}
	maxSeen := 0
	seen := false
	walkJSON(choices[0], func(key string, value any) {
		if key != "top_logprobs" {
			return
		}
		if array, ok := value.([]any); ok {
			seen = true
			if len(array) > maxSeen {
				maxSeen = len(array)
			}
		}
	})
	return maxSeen, seen
}

func walkJSON(value any, visit func(key string, value any)) {
	switch typed := value.(type) {
	case map[string]any:
		for key, child := range typed {
			visit(key, child)
			walkJSON(child, visit)
		}
	case []any:
		for _, child := range typed {
			walkJSON(child, visit)
		}
	}
}

func walkJSONPath(value any, path []string, visit func(path []string, key string, value any)) {
	switch typed := value.(type) {
	case map[string]any:
		for key, child := range typed {
			visit(path, key, child)
			walkJSONPath(child, append(path, key), visit)
		}
	case []any:
		for index, child := range typed {
			walkJSONPath(child, append(path, fmt.Sprintf("[%d]", index)), visit)
		}
	}
}

func firstFinishOrStopReason(value any) string {
	if text, ok := firstStringAt(value, []string{"choices", "finish_reason"}); ok {
		return text
	}
	if text, ok := firstStringAt(value, []string{"choices", "stop_reason"}); ok {
		return text
	}
	if text, ok := stringAt(value, []string{"stop_reason"}); ok {
		return text
	}
	return ""
}

func includeUsageRequested(request map[string]any) bool {
	options, ok := request["stream_options"].(map[string]any)
	if !ok {
		return false
	}
	enabled, ok := options["include_usage"].(bool)
	return ok && enabled
}

func sseHasUsage(raw string) bool {
	for _, line := range strings.Split(raw, "\n") {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		line = strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if line == "" || line == "[DONE]" {
			continue
		}
		parsed, ok := parseJSON([]byte(line))
		if !ok {
			continue
		}
		if _, ok := valueAt(parsed, []string{"usage"}); ok {
			return true
		}
	}
	return false
}

func sseUsageRequiredFieldsAssertion(name string, raw string, fields []string) CaseAssertion {
	fields = fieldsRelativeToPath(fields, []string{"usage"})
	seenUsage := false
	var firstMissing []string
	for _, line := range strings.Split(raw, "\n") {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		line = strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if line == "" || line == "[DONE]" {
			continue
		}
		parsed, ok := parseJSON([]byte(line))
		if !ok {
			continue
		}
		usage, ok := valueAt(parsed, []string{"usage"})
		if !ok {
			continue
		}
		seenUsage = true
		object, ok := usage.(map[string]any)
		if !ok {
			if firstMissing == nil {
				firstMissing = fields
			}
			continue
		}
		missing := missingFields(object, fields)
		if len(missing) == 0 {
			return CaseAssertion{Name: name, Pass: true, Message: "通过"}
		}
		if firstMissing == nil {
			firstMissing = missing
		}
	}
	if !seenUsage {
		return CaseAssertion{Name: name, Pass: false, Message: "SSE chunk 中未找到 usage"}
	}
	return CaseAssertion{Name: name, Pass: false, Message: missingMessage(firstMissing)}
}

func emptyDash(value string) string {
	if value == "" {
		return "—"
	}
	return value
}

func missingFields(object map[string]any, fields []string) []string {
	missing := make([]string, 0)
	for _, field := range fields {
		if _, ok := valueAt(object, strings.Split(field, ".")); !ok {
			missing = append(missing, field)
		}
	}
	return missing
}

func fieldsRelativeToPath(fields []string, path []string) []string {
	if len(path) == 0 {
		return fields
	}
	prefix := strings.Join(path, ".") + "."
	out := make([]string, 0, len(fields))
	for _, field := range fields {
		if strings.HasPrefix(field, prefix) {
			out = append(out, strings.TrimPrefix(field, prefix))
			continue
		}
		out = append(out, field)
	}
	return out
}

func missingMessage(missing []string) string {
	if len(missing) == 0 {
		return "通过"
	}
	return "缺少字段：" + strings.Join(missing, ", ")
}

func stringSlice(value any) []string {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	out := make([]string, 0, len(items))
	for _, item := range items {
		if text, ok := item.(string); ok && text != "" {
			out = append(out, text)
		}
	}
	return out
}

func looksLikeSSE(raw string) bool {
	return strings.Contains(raw, "data:")
}

func effectiveStreamIncrementalExpect(expect map[string]any) (minSSEChunks, minContentChunks int, maxFirstChunkMS, minChunkSpreadMS int64) {
	if enabled, ok := expect["stream_incremental"].(bool); ok && enabled {
		minSSEChunks = 2
		minContentChunks = 2
	}
	if value, ok := intFromExpect(expect["min_sse_chunks"]); ok && value > 0 {
		minSSEChunks = value
	}
	if value, ok := intFromExpect(expect["min_content_chunks"]); ok && value > 0 {
		minContentChunks = value
	}
	if value, ok := intFromExpect(expect["max_first_chunk_latency_ms"]); ok && value > 0 {
		maxFirstChunkMS = int64(value)
	}
	if value, ok := intFromExpect(expect["min_chunk_spread_ms"]); ok && value > 0 {
		minChunkSpreadMS = int64(value)
	}
	return minSSEChunks, minContentChunks, maxFirstChunkMS, minChunkSpreadMS
}

func appendSSEStreamAssertions(assertions []CaseAssertion, result RunCaseResult, expect map[string]any) []CaseAssertion {
	minSSEChunks, minContentChunks, maxFirstChunkMS, minChunkSpreadMS := effectiveStreamIncrementalExpect(expect)
	if minSSEChunks == 0 && minContentChunks == 0 && maxFirstChunkMS == 0 && minChunkSpreadMS == 0 {
		return assertions
	}
	if len(result.StreamProbeAttempts) > 0 {
		assertions = append(assertions, streamProbeAttemptsAssertion(result.StreamProbeAttempts, expect))
		return assertions
	}
	if result.StreamMetrics == nil {
		return append(assertions, CaseAssertion{
			Name:    "stream_metrics",
			Pass:    false,
			Message: "未收集到流式指标",
		})
	}
	return append(assertions, streamMetricsAssertions(*result.StreamMetrics, expect)...)
}

func streamMetricsAssertions(metrics StreamMetrics, expect map[string]any) []CaseAssertion {
	minSSEChunks, minContentChunks, maxFirstChunkMS, minChunkSpreadMS := effectiveStreamIncrementalExpect(expect)
	assertions := make([]CaseAssertion, 0, 4)
	if minSSEChunks > 0 {
		assertions = append(assertions, CaseAssertion{
			Name:    "min_sse_chunks",
			Pass:    metrics.SSEChunkCount >= minSSEChunks,
			Message: fmt.Sprintf("预期 >= %d 个 SSE chunk，实际 %d", minSSEChunks, metrics.SSEChunkCount),
		})
	}
	if minContentChunks > 0 {
		incremental := streamIncrementalChunkCount(metrics)
		assertions = append(assertions, CaseAssertion{
			Name:    "min_content_chunks",
			Pass:    incremental >= minContentChunks,
			Message: streamIncrementalChunkMessage(metrics, minContentChunks),
		})
	}
	if maxFirstChunkMS > 0 {
		assertions = append(assertions, CaseAssertion{
			Name:    "max_first_chunk_latency_ms",
			Pass:    metrics.FirstChunkMS <= maxFirstChunkMS,
			Message: fmt.Sprintf("预期首包 <= %dms，实际 %dms", maxFirstChunkMS, metrics.FirstChunkMS),
		})
	}
	if minChunkSpreadMS > 0 {
		assertions = append(assertions, CaseAssertion{
			Name:    "min_chunk_spread_ms",
			Pass:    metrics.ChunkSpreadMS >= minChunkSpreadMS,
			Message: fmt.Sprintf("预期 content chunk 时间跨度 >= %dms，实际 %dms", minChunkSpreadMS, metrics.ChunkSpreadMS),
		})
	}
	return assertions
}

func streamProbeAttemptsAssertion(attempts []StreamProbeAttempt, expect map[string]any) CaseAssertion {
	minSSEChunks, minContentChunks, maxFirstChunkMS, minChunkSpreadMS := effectiveStreamIncrementalExpect(expect)
	required := streamProbeAttemptsCount(expect)
	for _, attempt := range attempts {
		if attempt.Error != "" {
			return CaseAssertion{
				Name:    "stream_probe_attempts",
				Pass:    false,
				Message: fmt.Sprintf("第 %d/%d 次探测请求失败：%s", attempt.Attempt, required, attempt.Error),
			}
		}
		if attempt.StreamMetrics == nil {
			return CaseAssertion{
				Name:    "stream_probe_attempts",
				Pass:    false,
				Message: fmt.Sprintf("第 %d/%d 次探测未收集到流式指标", attempt.Attempt, required),
			}
		}
		metrics := *attempt.StreamMetrics
		if minSSEChunks > 0 && metrics.SSEChunkCount < minSSEChunks {
			return CaseAssertion{
				Name:    "stream_probe_attempts",
				Pass:    false,
				Message: fmt.Sprintf("第 %d/%d 次探测 SSE chunk 不足（实际 %d，预期 >= %d）", attempt.Attempt, required, metrics.SSEChunkCount, minSSEChunks),
			}
		}
		if minContentChunks > 0 && streamIncrementalChunkCount(metrics) < minContentChunks {
			return CaseAssertion{
				Name:    "stream_probe_attempts",
				Pass:    false,
				Message: fmt.Sprintf("第 %d/%d 次探测 %s", attempt.Attempt, required, streamIncrementalChunkMessage(metrics, minContentChunks)),
			}
		}
		if maxFirstChunkMS > 0 && metrics.FirstChunkMS > maxFirstChunkMS {
			return CaseAssertion{
				Name:    "stream_probe_attempts",
				Pass:    false,
				Message: fmt.Sprintf("第 %d/%d 次探测首包延迟过高（实际 %dms，预期 <= %dms）", attempt.Attempt, required, metrics.FirstChunkMS, maxFirstChunkMS),
			}
		}
		if minChunkSpreadMS > 0 && metrics.ChunkSpreadMS < minChunkSpreadMS {
			return CaseAssertion{
				Name:    "stream_probe_attempts",
				Pass:    false,
				Message: fmt.Sprintf("第 %d/%d 次探测 content chunk 时间跨度过短（实际 %dms，预期 >= %dms）", attempt.Attempt, required, metrics.ChunkSpreadMS, minChunkSpreadMS),
			}
		}
	}
	return CaseAssertion{
		Name:    "stream_probe_attempts",
		Pass:    true,
		Message: fmt.Sprintf("%d 次探测均满足增量流式要求", len(attempts)),
	}
}

func firstSSEJSON(raw string) any {
	for _, line := range strings.Split(raw, "\n") {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		line = strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if line == "" || line == "[DONE]" {
			continue
		}
		if parsed, ok := parseJSON([]byte(line)); ok {
			return parsed
		}
	}
	return nil
}

func assistantContent(value any) (string, bool) {
	object, ok := value.(map[string]any)
	if !ok {
		return "", false
	}
	choices, ok := object["choices"].([]any)
	if !ok || len(choices) == 0 {
		return "", false
	}
	choice, ok := choices[0].(map[string]any)
	if !ok {
		return "", false
	}
	message, ok := choice["message"].(map[string]any)
	if !ok {
		return "", false
	}
	content, ok := message["content"].(string)
	return content, ok
}

func providerErrorMessage(responseBody any, rawResponse, status string) string {
	if object, ok := responseBody.(map[string]any); ok {
		if errorObject, ok := object["error"].(map[string]any); ok {
			if message, ok := errorObject["message"].(string); ok && message != "" {
				return message
			}
		}
		if message, ok := object["message"].(string); ok && message != "" {
			return message
		}
	}
	rawResponse = strings.TrimSpace(rawResponse)
	if rawResponse != "" {
		if len(rawResponse) > 300 {
			rawResponse = rawResponse[:300] + "..."
		}
		return rawResponse
	}
	return status
}

func readJSONFile(path string, out any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return fmt.Errorf("%s not found", path)
		}
		return err
	}
	return json.Unmarshal(data, out)
}

func safeJSONName(name string) bool {
	return name == filepath.Base(name) && strings.HasSuffix(name, ".json") && name != "manifest.json"
}

func sortedKeys(set map[string]bool) []string {
	keys := make([]string, 0, len(set))
	for key := range set {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("write json: %v", err)
	}
}

func writeRunStreamEvent(w http.ResponseWriter, flusher http.Flusher, event RunStreamEvent) error {
	if err := json.NewEncoder(w).Encode(event); err != nil {
		log.Printf("write run stream event: %v", err)
		return err
	}
	flusher.Flush()
	return nil
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]any{"error": message})
}
