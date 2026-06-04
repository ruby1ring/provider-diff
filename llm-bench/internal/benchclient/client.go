package benchclient

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"provider-diff/llm-bench/internal/dataset"
)

type Config struct {
	Backend  string
	BaseURL  string
	Endpoint string
	Model    string
	APIKey   string
}

type Result struct {
	Success      bool
	Error        string
	InputTokens  int
	OutputTokens int
	Start        time.Time
	FirstToken   time.Time
	End          time.Time
	TokenTimes   []time.Time
}

func (r Result) TTFT() time.Duration {
	if r.FirstToken.IsZero() || r.Start.IsZero() {
		return 0
	}
	return r.FirstToken.Sub(r.Start)
}

func (r Result) E2EL() time.Duration {
	if r.End.IsZero() || r.Start.IsZero() {
		return 0
	}
	return r.End.Sub(r.Start)
}

func Send(ctx context.Context, httpClient *http.Client, cfg Config, sample dataset.Sample) Result {
	start := time.Now()
	body, err := requestBody(cfg, sample)
	if err != nil {
		return Result{Success: false, Error: err.Error(), InputTokens: sample.InputTokens, Start: start, End: time.Now()}
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return Result{Success: false, Error: err.Error(), InputTokens: sample.InputTokens, Start: start, End: time.Now()}
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpointURL(cfg), bytes.NewReader(payload))
	if err != nil {
		return Result{Success: false, Error: err.Error(), InputTokens: sample.InputTokens, Start: start, End: time.Now()}
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")
	if strings.TrimSpace(cfg.APIKey) != "" {
		req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(cfg.APIKey))
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return Result{Success: false, Error: err.Error(), InputTokens: sample.InputTokens, Start: start, End: time.Now()}
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		text, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return Result{
			Success:     false,
			Error:       fmt.Sprintf("HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(text))),
			InputTokens: sample.InputTokens,
			Start:       start,
			End:         time.Now(),
		}
	}
	tokenTimes, firstToken, outputTokens, err := readSSE(resp.Body)
	end := time.Now()
	if err != nil {
		return Result{Success: false, Error: err.Error(), InputTokens: sample.InputTokens, OutputTokens: outputTokens, Start: start, FirstToken: firstToken, End: end, TokenTimes: tokenTimes}
	}
	if outputTokens == 0 {
		outputTokens = sample.OutputTokens
	}
	return Result{
		Success:      true,
		InputTokens:  sample.InputTokens,
		OutputTokens: outputTokens,
		Start:        start,
		FirstToken:   firstToken,
		End:          end,
		TokenTimes:   tokenTimes,
	}
}

func requestBody(cfg Config, sample dataset.Sample) (map[string]any, error) {
	if strings.TrimSpace(cfg.Model) == "" {
		return nil, errors.New("model is required")
	}
	maxTokens := sample.OutputTokens
	if maxTokens <= 0 {
		maxTokens = 1
	}
	switch strings.ToLower(strings.TrimSpace(cfg.Backend)) {
	case "openai":
		return map[string]any{
			"model":      cfg.Model,
			"prompt":     sample.Prompt,
			"max_tokens": maxTokens,
			"stream":     true,
		}, nil
	case "", "openai-chat", "vllm", "sglang":
		return map[string]any{
			"model": cfg.Model,
			"messages": []map[string]string{
				{"role": "user", "content": sample.Prompt},
			},
			"max_tokens": maxTokens,
			"stream":     true,
		}, nil
	default:
		return nil, errors.New("backend must be one of openai, openai-chat, vllm, sglang")
	}
}

func endpointURL(cfg Config) string {
	base := strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/")
	endpoint := strings.TrimSpace(cfg.Endpoint)
	if endpoint == "" {
		if strings.EqualFold(cfg.Backend, "openai") {
			endpoint = "/v1/completions"
		} else {
			endpoint = "/v1/chat/completions"
		}
	}
	if !strings.HasPrefix(endpoint, "/") {
		endpoint = "/" + endpoint
	}
	return base + endpoint
}

func readSSE(body io.Reader) ([]time.Time, time.Time, int, error) {
	scanner := bufio.NewScanner(body)
	scanner.Buffer(make([]byte, 0, 64*1024), 4*1024*1024)
	tokenTimes := make([]time.Time, 0)
	var firstToken time.Time
	outputTokens := 0
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		dataLine := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if dataLine == "" {
			continue
		}
		if dataLine == "[DONE]" {
			return tokenTimes, firstToken, outputTokens, nil
		}
		content := contentFromChunk(dataLine)
		if content == "" {
			continue
		}
		now := time.Now()
		if firstToken.IsZero() {
			firstToken = now
		}
		tokens := dataset.EstimateTokens(content)
		if tokens < 1 {
			tokens = 1
		}
		for i := 0; i < tokens; i++ {
			tokenTimes = append(tokenTimes, now)
		}
		outputTokens += tokens
	}
	if err := scanner.Err(); err != nil {
		return tokenTimes, firstToken, outputTokens, err
	}
	return tokenTimes, firstToken, outputTokens, nil
}

func contentFromChunk(line string) string {
	var chunk struct {
		Choices []struct {
			Text  string `json:"text"`
			Delta struct {
				Content any `json:"content"`
			} `json:"delta"`
		} `json:"choices"`
	}
	if err := json.Unmarshal([]byte(line), &chunk); err != nil || len(chunk.Choices) == 0 {
		return ""
	}
	if chunk.Choices[0].Text != "" {
		return chunk.Choices[0].Text
	}
	switch value := chunk.Choices[0].Delta.Content.(type) {
	case string:
		return value
	case []any:
		var b strings.Builder
		for _, item := range value {
			if m, ok := item.(map[string]any); ok {
				if text, ok := m["text"].(string); ok {
					b.WriteString(text)
				}
			}
		}
		return b.String()
	default:
		return ""
	}
}
