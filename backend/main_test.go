package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestLoadThinkingProviderCases(t *testing.T) {
	root, err := findProjectRoot()
	if err != nil {
		t.Fatalf("find project root: %v", err)
	}
	server := &Server{root: root}
	manifest, cases, err := server.loadProvider("thinking")
	if err != nil {
		t.Fatalf("load thinking provider: %v", err)
	}
	if manifest.Provider != "thinking" {
		t.Fatalf("expected thinking provider, got %q", manifest.Provider)
	}
	if len(cases) != 34 {
		t.Fatalf("expected 34 thinking probe cases, got %d", len(cases))
	}
	if cases[0].CaseID != "thinking_baseline_no_thinking" {
		t.Fatalf("unexpected first case %q", cases[0].CaseID)
	}
}

func TestLoadToolsProviderCases(t *testing.T) {
	root, err := findProjectRoot()
	if err != nil {
		t.Fatalf("find project root: %v", err)
	}
	server := &Server{root: root}
	manifest, cases, err := server.loadProvider("tools")
	if err != nil {
		t.Fatalf("load tools provider: %v", err)
	}
	if manifest.Provider != "tools" {
		t.Fatalf("expected tools provider, got %q", manifest.Provider)
	}
	if len(cases) != 7 {
		t.Fatalf("expected 7 tools probe cases, got %d", len(cases))
	}
	if cases[0].CaseID != "tools_auto" {
		t.Fatalf("unexpected first case %q", cases[0].CaseID)
	}
}

func TestLoadResponseFormatProvider(t *testing.T) {
	root, err := findProjectRoot()
	if err != nil {
		t.Fatalf("find project root: %v", err)
	}
	server := &Server{root: root}
	manifest, cases, err := server.loadProvider("response_format")
	if err != nil {
		t.Fatalf("load response_format provider: %v", err)
	}
	if manifest.Provider != "response_format" {
		t.Fatalf("expected response_format provider, got %q", manifest.Provider)
	}
	if len(cases) != 3 {
		t.Fatalf("expected 3 response_format probe cases, got %d", len(cases))
	}
	if cases[0].CaseID != "response_format_text" {
		t.Fatalf("unexpected first case %q", cases[0].CaseID)
	}
}

func TestLoadToolsMessagesProviderForEndpoint(t *testing.T) {
	root, err := findProjectRoot()
	if err != nil {
		t.Fatalf("find project root: %v", err)
	}
	server := &Server{root: root}
	manifest, cases, err := server.loadProviderForEndpoint("tools", "anthropic_messages")
	if err != nil {
		t.Fatalf("load tools_messages provider: %v", err)
	}
	if manifest.Provider != "tools_messages" {
		t.Fatalf("expected tools_messages provider, got %q", manifest.Provider)
	}
	if manifest.Endpoint != "/v1/messages" {
		t.Fatalf("expected /v1/messages endpoint, got %q", manifest.Endpoint)
	}
	if len(cases) != 5 {
		t.Fatalf("expected 5 tools messages probe cases, got %d", len(cases))
	}
	if cases[0].CaseID != "tools_auto" {
		t.Fatalf("unexpected first case %q", cases[0].CaseID)
	}
}

func TestLoadThinkingMessagesProviderForEndpoint(t *testing.T) {
	root, err := findProjectRoot()
	if err != nil {
		t.Fatalf("find project root: %v", err)
	}
	server := &Server{root: root}
	manifest, cases, err := server.loadProviderForEndpoint("thinking", "anthropic_messages")
	if err != nil {
		t.Fatalf("load thinking_messages provider: %v", err)
	}
	if manifest.Provider != "thinking_messages" {
		t.Fatalf("expected thinking_messages provider, got %q", manifest.Provider)
	}
	if manifest.Endpoint != "/messages" {
		t.Fatalf("expected /messages endpoint, got %q", manifest.Endpoint)
	}
	if len(cases) != 7 {
		t.Fatalf("expected 7 thinking messages probe cases, got %d", len(cases))
	}
	if cases[0].CaseID != "thinking_baseline_no_thinking" {
		t.Fatalf("unexpected first case %q", cases[0].CaseID)
	}
}

func TestLoadResponseFormatMessagesProviderForEndpoint(t *testing.T) {
	root, err := findProjectRoot()
	if err != nil {
		t.Fatalf("find project root: %v", err)
	}
	server := &Server{root: root}
	manifest, cases, err := server.loadProviderForEndpoint("response_format", "anthropic_messages")
	if err != nil {
		t.Fatalf("load response_format_messages provider: %v", err)
	}
	if manifest.Provider != "response_format_messages" {
		t.Fatalf("expected response_format_messages provider, got %q", manifest.Provider)
	}
	if manifest.Endpoint != "/messages" {
		t.Fatalf("expected /messages endpoint, got %q", manifest.Endpoint)
	}
	if len(cases) != 3 {
		t.Fatalf("expected 3 response_format messages probe cases, got %d", len(cases))
	}
	if cases[0].CaseID != "response_format_text" {
		t.Fatalf("unexpected first case %q", cases[0].CaseID)
	}
}

func TestBuildEndpointURLDoesNotDuplicateExistingEndpoint(t *testing.T) {
	got := buildEndpointURL("https://dashscope-us.aliyuncs.com/compatible-mode/v1/chat/completions", "/chat/completions")
	want := "https://dashscope-us.aliyuncs.com/compatible-mode/v1/chat/completions"
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestBuildEndpointURLAppendsEndpointToBaseURL(t *testing.T) {
	got := buildEndpointURL("https://dashscope-us.aliyuncs.com/compatible-mode/v1", "/chat/completions")
	want := "https://dashscope-us.aliyuncs.com/compatible-mode/v1/chat/completions"
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestDoProviderRequestRetries429UntilSuccessWithBackoff(t *testing.T) {
	var calls int32
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		call := atomic.AddInt32(&calls, 1)
		if call <= 4 {
			http.Error(w, "rate limited", http.StatusTooManyRequests)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"ok"}`))
	}))
	defer upstream.Close()

	var delays []time.Duration
	oldSleep := providerRetrySleep
	providerRetrySleep = func(ctx context.Context, delay time.Duration) bool {
		delays = append(delays, delay)
		return true
	}
	defer func() { providerRetrySleep = oldSleep }()

	resp, err := doProviderRequest(
		context.Background(),
		upstream.Client(),
		upstream.URL,
		"test-key",
		Manifest{Provider: "openai"},
		nil,
		[]byte(`{"model":"test","messages":[]}`),
		http.StatusOK,
	)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected final status 200, got %d", resp.StatusCode)
	}
	if got := atomic.LoadInt32(&calls); got != 5 {
		t.Fatalf("expected 5 upstream calls, got %d", got)
	}
	wantDelays := []time.Duration{30 * time.Second, time.Minute, 2 * time.Minute, 4 * time.Minute}
	if len(delays) != len(wantDelays) {
		t.Fatalf("expected %d retry delays, got %d: %v", len(wantDelays), len(delays), delays)
	}
	for i, want := range wantDelays {
		if delays[i] != want {
			t.Fatalf("delay %d: expected %s, got %s", i, want, delays[i])
		}
	}
}

func TestRunCaseConcurrencyUsesRequestedLimit(t *testing.T) {
	tests := []struct {
		name      string
		total     int
		requested int
		want      int
	}{
		{name: "requested limit", total: 10, requested: 3, want: 3},
		{name: "total below requested", total: 2, requested: 3, want: 2},
		{name: "default limit", total: defaultRunCaseConcurrency + 5, requested: 0, want: defaultRunCaseConcurrency},
		{name: "requested above cap", total: defaultRunCaseConcurrency + 5, requested: defaultRunCaseConcurrency + 10, want: defaultRunCaseConcurrency},
		{name: "empty run", total: 0, requested: 3, want: 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := runCaseConcurrency(tt.total, tt.requested); got != tt.want {
				t.Fatalf("expected %d, got %d", tt.want, got)
			}
		})
	}
}

func TestHandleRunBatchRunsMultipleTargets(t *testing.T) {
	root, err := findProjectRoot()
	if err != nil {
		t.Fatalf("find project root: %v", err)
	}
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" {
			t.Errorf("unexpected upstream path %q", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		io := map[string]any{
			"id":     "chatcmpl-test",
			"object": "chat.completion",
			"model":  "test-model",
			"choices": []map[string]any{{
				"index": 0,
				"message": map[string]any{
					"role":    "assistant",
					"content": "ok",
				},
				"finish_reason": "stop",
			}},
		}
		if err := json.NewEncoder(w).Encode(io); err != nil {
			t.Fatalf("encode upstream response: %v", err)
		}
	}))
	defer upstream.Close()

	reqBody := BatchRunRequest{
		MaxConcurrency: 2,
		Targets: []RunRequest{
			{Provider: "siliconflow", APIKey: "test-key", BaseURL: upstream.URL, Model: "model-a"},
			{Provider: "siliconflow", APIKey: "test-key", BaseURL: upstream.URL, Model: "model-b"},
		},
		CustomCases: []TestCase{{
			CaseID:   "custom_batch",
			Title:    "Custom batch",
			Category: "custom",
			Payload: map[string]any{
				"messages": []map[string]string{{"role": "user", "content": "hi"}},
			},
			Expect: map[string]any{"http_status": 200},
		}},
	}
	rawBody, err := json.Marshal(reqBody)
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}

	server := &Server{root: root}
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/run-batch", bytes.NewReader(rawBody))
	server.handleRunBatch(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	var response BatchRunResponse
	if err := json.NewDecoder(recorder.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(response.Targets) != 2 {
		t.Fatalf("expected 2 targets, got %d", len(response.Targets))
	}
	for _, target := range response.Targets {
		if target.Error != "" {
			t.Fatalf("target %d failed: %s", target.Index, target.Error)
		}
		if len(target.Results) != 1 {
			t.Fatalf("target %d expected 1 result, got %d", target.Index, len(target.Results))
		}
		if target.Results[0].HTTPStatus != http.StatusOK {
			t.Fatalf("target %d expected upstream status 200, got %d", target.Index, target.Results[0].HTTPStatus)
		}
	}
}

func TestHandleRunBatchUsesCaseIDDefaultsForTargets(t *testing.T) {
	root, err := findProjectRoot()
	if err != nil {
		t.Fatalf("find project root: %v", err)
	}
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" {
			t.Errorf("unexpected upstream path %q", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		response := map[string]any{
			"id":     "chatcmpl-test",
			"object": "chat.completion",
			"model":  "test-model",
			"choices": []map[string]any{{
				"index": 0,
				"message": map[string]any{
					"role":    "assistant",
					"content": "ok",
				},
				"finish_reason": "stop",
			}},
			"usage": map[string]int{
				"prompt_tokens":     1,
				"completion_tokens": 1,
				"total_tokens":      2,
			},
		}
		if err := json.NewEncoder(w).Encode(response); err != nil {
			t.Fatalf("encode upstream response: %v", err)
		}
	}))
	defer upstream.Close()

	reqBody := BatchRunRequest{
		EndpointID:     "chat_completions",
		CaseIDs:        []string{"sf_basic_minimal"},
		MaxConcurrency: 2,
		APIKey:         "test-key",
		BaseURL:        upstream.URL,
		Targets:        []RunRequest{{Provider: "siliconflow", Model: "model-a"}, {Provider: "siliconflow", Model: "model-b"}},
	}
	rawBody, err := json.Marshal(reqBody)
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}

	server := &Server{root: root}
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/run-batch", bytes.NewReader(rawBody))
	server.handleRunBatch(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	var response BatchRunResponse
	if err := json.NewDecoder(recorder.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(response.Targets) != 2 {
		t.Fatalf("expected 2 targets, got %d", len(response.Targets))
	}
	for _, target := range response.Targets {
		if target.Error != "" {
			t.Fatalf("target %d failed: %s", target.Index, target.Error)
		}
		if len(target.Results) != 1 {
			t.Fatalf("target %d expected 1 result, got %d", target.Index, len(target.Results))
		}
		if target.Results[0].CaseID != "sf_basic_minimal" {
			t.Fatalf("target %d expected sf_basic_minimal, got %q", target.Index, target.Results[0].CaseID)
		}
	}
}

func TestHandleRunStreamEmitsResultEvents(t *testing.T) {
	root, err := findProjectRoot()
	if err != nil {
		t.Fatalf("find project root: %v", err)
	}
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		response := map[string]any{
			"id":     "chatcmpl-test",
			"object": "chat.completion",
			"model":  "test-model",
			"choices": []map[string]any{{
				"index": 0,
				"message": map[string]any{
					"role":    "assistant",
					"content": "ok",
				},
				"finish_reason": "stop",
			}},
		}
		if err := json.NewEncoder(w).Encode(response); err != nil {
			t.Fatalf("encode upstream response: %v", err)
		}
	}))
	defer upstream.Close()

	reqBody := RunRequest{
		Provider:       "siliconflow",
		APIKey:         "test-key",
		BaseURL:        upstream.URL,
		Model:          "test-model",
		MaxConcurrency: 1,
		CustomCases: []TestCase{
			{
				CaseID:   "custom_stream_a",
				Title:    "Custom stream A",
				Category: "custom",
				Payload: map[string]any{
					"messages": []map[string]string{{"role": "user", "content": "hi"}},
				},
				Expect: map[string]any{"http_status": 200},
			},
			{
				CaseID:   "custom_stream_b",
				Title:    "Custom stream B",
				Category: "custom",
				Payload: map[string]any{
					"messages": []map[string]string{{"role": "user", "content": "hello"}},
				},
				Expect: map[string]any{"http_status": 200},
			},
		},
	}
	rawBody, err := json.Marshal(reqBody)
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}

	server := &Server{root: root}
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/run-stream", bytes.NewReader(rawBody))
	server.handleRunStream(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	decoder := json.NewDecoder(recorder.Body)
	events := []RunStreamEvent{}
	for {
		var event RunStreamEvent
		if err := decoder.Decode(&event); err != nil {
			break
		}
		events = append(events, event)
	}
	if len(events) != 4 {
		t.Fatalf("expected start, 2 results, end events; got %d events", len(events))
	}
	if events[0].Type != "start" || events[0].Total != 2 {
		t.Fatalf("unexpected start event: %#v", events[0])
	}
	resultEvents := 0
	for _, event := range events {
		if event.Type == "result" {
			resultEvents += 1
			if event.Result == nil || event.Result.HTTPStatus != http.StatusOK {
				t.Fatalf("unexpected result event: %#v", event)
			}
		}
	}
	if resultEvents != 2 {
		t.Fatalf("expected 2 result events, got %d", resultEvents)
	}
	if events[len(events)-1].Type != "end" {
		t.Fatalf("expected end event, got %#v", events[len(events)-1])
	}
}

func TestHandleRunBatchStreamEmitsTargetResultEvents(t *testing.T) {
	root, err := findProjectRoot()
	if err != nil {
		t.Fatalf("find project root: %v", err)
	}
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" {
			t.Errorf("unexpected upstream path %q", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		response := map[string]any{
			"id":     "chatcmpl-test",
			"object": "chat.completion",
			"model":  "test-model",
			"choices": []map[string]any{{
				"index": 0,
				"message": map[string]any{
					"role":    "assistant",
					"content": "ok",
				},
				"finish_reason": "stop",
			}},
		}
		if err := json.NewEncoder(w).Encode(response); err != nil {
			t.Fatalf("encode upstream response: %v", err)
		}
	}))
	defer upstream.Close()

	reqBody := BatchRunRequest{
		MaxConcurrency: 2,
		Targets: []RunRequest{
			{Provider: "siliconflow", APIKey: "test-key", BaseURL: upstream.URL, Model: "model-a"},
			{Provider: "siliconflow", APIKey: "test-key", BaseURL: upstream.URL, Model: "model-b"},
		},
		CustomCases: []TestCase{{
			CaseID:   "custom_batch_stream",
			Title:    "Custom batch stream",
			Category: "custom",
			Payload: map[string]any{
				"messages": []map[string]string{{"role": "user", "content": "hi"}},
			},
			Expect: map[string]any{"http_status": 200},
		}},
	}
	rawBody, err := json.Marshal(reqBody)
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}

	server := &Server{root: root}
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/run-batch-stream", bytes.NewReader(rawBody))
	server.handleRunBatchStream(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	decoder := json.NewDecoder(recorder.Body)
	events := []RunStreamEvent{}
	for {
		var event RunStreamEvent
		if err := decoder.Decode(&event); err != nil {
			break
		}
		events = append(events, event)
	}
	if len(events) != 8 {
		t.Fatalf("expected start, 2 target_start, 2 result, 2 target_end, end events; got %d events: %#v", len(events), events)
	}
	if events[0].Type != "start" || events[0].Total != 2 || events[0].TargetTotal != 2 {
		t.Fatalf("unexpected start event: %#v", events[0])
	}
	resultTargets := map[int]bool{}
	resultEvents := 0
	for _, event := range events {
		if event.Type != "result" {
			continue
		}
		resultEvents += 1
		resultTargets[event.TargetIndex] = true
		if event.Result == nil || event.Result.HTTPStatus != http.StatusOK {
			t.Fatalf("unexpected result event: %#v", event)
		}
	}
	if resultEvents != 2 {
		t.Fatalf("expected 2 result events, got %d", resultEvents)
	}
	if !resultTargets[0] || !resultTargets[1] {
		t.Fatalf("expected result events for target 0 and 1, got %#v", resultTargets)
	}
	if events[len(events)-1].Type != "end" {
		t.Fatalf("expected end event, got %#v", events[len(events)-1])
	}
}

func TestHandleRunRunsCasesConcurrently(t *testing.T) {
	root, err := findProjectRoot()
	if err != nil {
		t.Fatalf("find project root: %v", err)
	}

	var active atomic.Int64
	var maxActive atomic.Int64
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		current := active.Add(1)
		defer active.Add(-1)
		for {
			observed := maxActive.Load()
			if current <= observed || maxActive.CompareAndSwap(observed, current) {
				break
			}
		}
		time.Sleep(50 * time.Millisecond)
		w.Header().Set("Content-Type", "application/json")
		response := map[string]any{
			"id":     "chatcmpl-test",
			"object": "chat.completion",
			"model":  "test-model",
			"choices": []map[string]any{{
				"index": 0,
				"message": map[string]any{
					"role":    "assistant",
					"content": "ok",
				},
				"finish_reason": "stop",
			}},
		}
		if err := json.NewEncoder(w).Encode(response); err != nil {
			t.Fatalf("encode upstream response: %v", err)
		}
	}))
	defer upstream.Close()

	customCases := make([]TestCase, defaultRunCaseConcurrency+5)
	for index := range customCases {
		customCases[index] = TestCase{
			CaseID:   fmt.Sprintf("custom_concurrent_%02d", index),
			Title:    "Custom concurrent",
			Category: "custom",
			Payload: map[string]any{
				"messages": []map[string]string{{"role": "user", "content": "hi"}},
			},
			Expect: map[string]any{"http_status": 200},
		}
	}
	reqBody := RunRequest{
		Provider:    "siliconflow",
		APIKey:      "test-key",
		BaseURL:     upstream.URL,
		Model:       "test-model",
		CustomCases: customCases,
	}
	rawBody, err := json.Marshal(reqBody)
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}

	server := &Server{root: root}
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/run", bytes.NewReader(rawBody))
	server.handleRun(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	var response RunResponse
	if err := json.NewDecoder(recorder.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(response.Results) != len(customCases) {
		t.Fatalf("expected %d results, got %d", len(customCases), len(response.Results))
	}
	if got := maxActive.Load(); got <= 1 {
		t.Fatalf("expected concurrent upstream requests, max active was %d", got)
	} else if got > defaultRunCaseConcurrency {
		t.Fatalf("expected max active <= %d, got %d", defaultRunCaseConcurrency, got)
	}
	for index, result := range response.Results {
		if result.CaseID != customCases[index].CaseID {
			t.Fatalf("result %d order changed: expected %q, got %q", index, customCases[index].CaseID, result.CaseID)
		}
	}
}

func TestAssistantContentNonEmptyAssertionPasses(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"choices": []any{
				map[string]any{
					"message": map[string]any{
						"content": "A mountain landscape.",
					},
				},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"assistant_content_non_empty": true,
	})
	assertion, ok := findAssertion(assertions, "assistant_content_non_empty")
	if !ok {
		t.Fatal("assistant_content_non_empty assertion was not emitted")
	}
	if !assertion.Pass {
		t.Fatalf("expected assertion to pass, got message %q", assertion.Message)
	}
}

func TestAssistantContentNonEmptyAssertionFailsOnBlankContent(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"choices": []any{
				map[string]any{
					"message": map[string]any{
						"content": "  ",
					},
				},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"assistant_content_non_empty": true,
	})
	assertion, ok := findAssertion(assertions, "assistant_content_non_empty")
	if !ok {
		t.Fatal("assistant_content_non_empty assertion was not emitted")
	}
	if assertion.Pass {
		t.Fatal("expected assertion to fail for blank assistant content")
	}
}

func TestAssistantContentStartsWithAssertionPasses(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"choices": []any{
				map[string]any{
					"message": map[string]any{
						"content": "兼容性测试的目标是减少接入差异。",
					},
				},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"assistant_content_starts_with": "兼容性测试的目标是",
	})
	assertion, ok := findAssertion(assertions, "assistant_content_starts_with")
	if !ok {
		t.Fatal("assistant_content_starts_with assertion was not emitted")
	}
	if !assertion.Pass {
		t.Fatalf("expected assertion to pass, got message %q", assertion.Message)
	}
}

func TestAssistantContentStartsWithAssertionFails(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"choices": []any{
				map[string]any{
					"message": map[string]any{
						"content": "测试目标是减少接入差异。",
					},
				},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"assistant_content_starts_with": "兼容性测试的目标是",
	})
	assertion, ok := findAssertion(assertions, "assistant_content_starts_with")
	if !ok {
		t.Fatal("assistant_content_starts_with assertion was not emitted")
	}
	if assertion.Pass {
		t.Fatal("expected assertion to fail when assistant content does not start with prefix")
	}
}

func TestSSEUsageRequiredFieldsAssertionPasses(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		RawResponse: `data: {"id":"chunk","object":"chat.completion.chunk","created":1,"model":"model","choices":[],"usage":{"prompt_tokens":15,"completion_tokens":1540,"total_tokens":1555,"completion_tokens_details":{"reasoning_tokens":1190},"prompt_tokens_details":{"cached_tokens":0},"prompt_cache_hit_tokens":0,"prompt_cache_miss_tokens":15}}
data: [DONE]`,
	}
	assertions := evaluateAssertions(result, map[string]any{
		"response_mode": "sse",
		"usage_required_fields": []any{
			"prompt_tokens",
			"completion_tokens",
			"total_tokens",
			"completion_tokens_details.reasoning_tokens",
			"prompt_tokens_details.cached_tokens",
			"prompt_cache_hit_tokens",
			"prompt_cache_miss_tokens",
		},
	})
	assertion, ok := findAssertion(assertions, "usage_required_fields")
	if !ok {
		t.Fatal("usage_required_fields assertion was not emitted")
	}
	if !assertion.Pass {
		t.Fatalf("expected assertion to pass, got message %q", assertion.Message)
	}
}

func TestSSEUsageRequiredFieldsAssertionFailsOnMissingNestedField(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		RawResponse: `data: {"id":"chunk","object":"chat.completion.chunk","created":1,"model":"model","choices":[],"usage":{"prompt_tokens":15,"completion_tokens":1540,"total_tokens":1555,"completion_tokens_details":{},"prompt_tokens_details":{"cached_tokens":0},"prompt_cache_hit_tokens":0,"prompt_cache_miss_tokens":15}}
data: [DONE]`,
	}
	assertions := evaluateAssertions(result, map[string]any{
		"response_mode": "sse",
		"usage_required_fields": []any{
			"completion_tokens_details.reasoning_tokens",
		},
	})
	assertion, ok := findAssertion(assertions, "usage_required_fields")
	if !ok {
		t.Fatal("usage_required_fields assertion was not emitted")
	}
	if assertion.Pass {
		t.Fatal("expected assertion to fail for missing nested usage field")
	}
}

func TestNonStreamUsageRequiredFieldsAssertionPassesNestedFields(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"usage": map[string]any{
				"prompt_tokens":     float64(15),
				"completion_tokens": float64(1540),
				"total_tokens":      float64(1555),
				"completion_tokens_details": map[string]any{
					"reasoning_tokens": float64(1190),
				},
				"prompt_tokens_details": map[string]any{
					"cached_tokens": float64(0),
				},
				"prompt_cache_hit_tokens":  float64(0),
				"prompt_cache_miss_tokens": float64(15),
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"usage_required_fields": []any{
			"prompt_tokens",
			"completion_tokens",
			"total_tokens",
			"completion_tokens_details.reasoning_tokens",
			"prompt_tokens_details.cached_tokens",
			"prompt_cache_hit_tokens",
			"prompt_cache_miss_tokens",
		},
	})
	assertion, ok := findAssertion(assertions, "usage_required_fields")
	if !ok {
		t.Fatal("usage_required_fields assertion was not emitted")
	}
	if !assertion.Pass {
		t.Fatalf("expected assertion to pass, got message %q", assertion.Message)
	}
}

func TestNonStreamUsageRequiredFieldsAssertionAcceptsFullyQualifiedFields(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"usage": map[string]any{
				"prompt_tokens":     float64(52),
				"completion_tokens": float64(80),
				"total_tokens":      float64(132),
				"total_characters":  float64(0),
				"prompt_tokens_details": map[string]any{
					"cached_tokens": float64(32),
				},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"usage_required_fields": []any{
			"usage.prompt_tokens",
			"usage.completion_tokens",
			"usage.total_tokens",
			"usage.total_characters",
			"usage.prompt_tokens_details.cached_tokens",
		},
	})
	assertion, ok := findAssertion(assertions, "usage_required_fields")
	if !ok {
		t.Fatal("usage_required_fields assertion was not emitted")
	}
	if !assertion.Pass {
		t.Fatalf("expected assertion to pass, got message %q", assertion.Message)
	}
}

func TestMiniMaxUsageRequiredFieldsAssertionPassesObservedShape(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"base_resp": map[string]any{
				"status_code": float64(0),
				"status_msg":  "success",
			},
			"choices": []any{
				map[string]any{
					"finish_reason": "length",
					"index":         float64(0),
					"message": map[string]any{
						"content": "<think>We need to understand the conversation.</think>\n\n",
						"role":    "assistant",
					},
				},
			},
			"created":               float64(1780391813),
			"id":                    "066dd284d54fd5099e82ca0a85b80e84",
			"input_sensitive":       false,
			"input_sensitive_type":  float64(0),
			"model":                 "MiniMax-M2.7",
			"object":                "chat.completion",
			"output_sensitive":      false,
			"output_sensitive_int":  float64(0),
			"output_sensitive_type": float64(0),
			"usage": map[string]any{
				"completion_tokens": float64(80),
				"prompt_tokens":     float64(52),
				"prompt_tokens_details": map[string]any{
					"cached_tokens": float64(32),
				},
				"total_characters": float64(0),
				"total_tokens":     float64(132),
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"usage_required_fields": []any{
			"prompt_tokens",
			"completion_tokens",
			"total_tokens",
			"total_characters",
			"prompt_tokens_details.cached_tokens",
		},
	})
	assertion, ok := findAssertion(assertions, "usage_required_fields")
	if !ok {
		t.Fatal("usage_required_fields assertion was not emitted")
	}
	if !assertion.Pass {
		t.Fatalf("expected assertion to pass, got message %q", assertion.Message)
	}
}

func TestMessagesThinkingRequiredAssertionPasses(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"id":    "msg_123",
			"type":  "message",
			"role":  "assistant",
			"model": "claude-sonnet-4-6",
			"content": []any{
				map[string]any{
					"type":      "thinking",
					"thinking":  "I should compare the protocol shape first.",
					"signature": "sig_123",
				},
				map[string]any{
					"type": "text",
					"text": "Protocol tests need response-shape assertions.",
				},
			},
			"usage": map[string]any{
				"input_tokens":  float64(20),
				"output_tokens": float64(140),
				"output_tokens_details": map[string]any{
					"thinking_tokens": float64(100),
				},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"thinking_required":          true,
		"thinking_location":          "messages.content_block",
		"thinking_must_precede_text": true,
		"thinking_required_fields":   []any{"type", "thinking", "signature"},
		"usage_required_fields":      []any{"input_tokens", "output_tokens", "output_tokens_details.thinking_tokens"},
	})
	thinking, ok := findAssertion(assertions, "thinking_required")
	if !ok {
		t.Fatal("thinking_required assertion was not emitted")
	}
	if !thinking.Pass {
		t.Fatalf("expected thinking assertion to pass, got message %q", thinking.Message)
	}
	usage, ok := findAssertion(assertions, "usage_required_fields")
	if !ok {
		t.Fatal("usage_required_fields assertion was not emitted")
	}
	if !usage.Pass {
		t.Fatalf("expected usage assertion to pass, got message %q", usage.Message)
	}
}

func TestMessagesThinkingRequiredAssertionFailsWhenMissing(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"content": []any{
				map[string]any{
					"type": "text",
					"text": "No thinking block here.",
				},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"thinking_required": true,
		"thinking_location": "messages.content_block",
	})
	assertion, ok := findAssertion(assertions, "thinking_required")
	if !ok {
		t.Fatal("thinking_required assertion was not emitted")
	}
	if assertion.Pass {
		t.Fatal("expected thinking_required to fail when thinking block is missing")
	}
}

func TestThinkingAbsentAssertionFailsWhenChatReasoningContentPresent(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"choices": []any{
				map[string]any{
					"message": map[string]any{
						"content":           "Final answer.",
						"reasoning_content": "Hidden chain should not be present for this case.",
					},
				},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"thinking_absent": true,
	})
	assertion, ok := findAssertion(assertions, "thinking_absent")
	if !ok {
		t.Fatal("thinking_absent assertion was not emitted")
	}
	if assertion.Pass {
		t.Fatal("expected thinking_absent to fail when chat reasoning_content is present")
	}
}

func TestThinkingEvidenceRequiredPassesForChatReasoningObject(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"choices": []any{
				map[string]any{
					"message": map[string]any{
						"content": "Final answer.",
						"reasoning": map[string]any{
							"summary": "I checked the arithmetic.",
						},
					},
				},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"thinking_location_probe":    true,
		"thinking_evidence_required": true,
	})
	probe, ok := findAssertion(assertions, "thinking_location_probe")
	if !ok {
		t.Fatal("thinking_location_probe assertion was not emitted")
	}
	if !probe.Pass || probe.Message == "" {
		t.Fatalf("expected location probe diagnostic to pass with a message, got %#v", probe)
	}
	evidence, ok := findAssertion(assertions, "thinking_evidence_required")
	if !ok {
		t.Fatal("thinking_evidence_required assertion was not emitted")
	}
	if !evidence.Pass {
		t.Fatalf("expected reasoning object to count as thinking evidence, got message %q", evidence.Message)
	}
}

func TestThinkingEvidenceRequiredPassesForReasoningTokens(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"choices": []any{
				map[string]any{
					"message": map[string]any{"content": "Final answer."},
				},
			},
			"usage": map[string]any{
				"completion_tokens_details": map[string]any{
					"reasoning_tokens": float64(12),
				},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"thinking_evidence_required": true,
	})
	assertion, ok := findAssertion(assertions, "thinking_evidence_required")
	if !ok {
		t.Fatal("thinking_evidence_required assertion was not emitted")
	}
	if !assertion.Pass {
		t.Fatalf("expected reasoning tokens to count as thinking evidence, got message %q", assertion.Message)
	}
}

func TestThinkingEvidenceRequiredFailsWhenNoEvidence(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"choices": []any{
				map[string]any{
					"message": map[string]any{"content": "Final answer."},
				},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"thinking_evidence_required": true,
	})
	assertion, ok := findAssertion(assertions, "thinking_evidence_required")
	if !ok {
		t.Fatal("thinking_evidence_required assertion was not emitted")
	}
	if assertion.Pass {
		t.Fatal("expected thinking_evidence_required to fail without thinking content or token evidence")
	}
}

func TestThinkingAbsentAssertionPassesForMessagesTextOnly(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"content": []any{
				map[string]any{
					"type": "text",
					"text": "No thinking block here.",
				},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"thinking_absent": true,
	})
	assertion, ok := findAssertion(assertions, "thinking_absent")
	if !ok {
		t.Fatal("thinking_absent assertion was not emitted")
	}
	if !assertion.Pass {
		t.Fatalf("expected thinking_absent to pass, got message %q", assertion.Message)
	}
}

func TestThinkingAbsentAssertionFailsForRedactedThinking(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"content": []any{
				map[string]any{
					"type": "redacted_thinking",
					"data": "opaque",
				},
				map[string]any{
					"type": "text",
					"text": "Final answer.",
				},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"thinking_absent": true,
	})
	assertion, ok := findAssertion(assertions, "thinking_absent")
	if !ok {
		t.Fatal("thinking_absent assertion was not emitted")
	}
	if assertion.Pass {
		t.Fatal("expected thinking_absent to fail when redacted_thinking is present")
	}
}

func TestThinkingAbsentAssertionFailsForReasoningTokens(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"choices": []any{
				map[string]any{
					"message": map[string]any{"content": "Final answer."},
				},
			},
			"usage": map[string]any{
				"completion_tokens_details": map[string]any{
					"reasoning_tokens": float64(12),
				},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"thinking_absent": true,
	})
	assertion, ok := findAssertion(assertions, "thinking_absent")
	if !ok {
		t.Fatal("thinking_absent assertion was not emitted")
	}
	if assertion.Pass {
		t.Fatal("expected thinking_absent to fail when reasoning token evidence is present")
	}
}

func TestSSEUsageRequiredFieldsAssertionAcceptsFullyQualifiedFields(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		RawResponse: `data: {"id":"chunk","object":"chat.completion.chunk","created":1,"model":"model","choices":[],"usage":{"prompt_tokens":52,"completion_tokens":80,"total_tokens":132,"total_characters":0,"prompt_tokens_details":{"cached_tokens":32}}}
data: [DONE]`,
	}
	assertions := evaluateAssertions(result, map[string]any{
		"response_mode": "sse",
		"usage_required_fields": []any{
			"usage.prompt_tokens",
			"usage.completion_tokens",
			"usage.total_tokens",
			"usage.total_characters",
			"usage.prompt_tokens_details.cached_tokens",
		},
	})
	assertion, ok := findAssertion(assertions, "usage_required_fields")
	if !ok {
		t.Fatal("usage_required_fields assertion was not emitted")
	}
	if !assertion.Pass {
		t.Fatalf("expected assertion to pass, got message %q", assertion.Message)
	}
}

func TestStreamIncrementalAssertionFailsOnSingleContentChunk(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		RawResponse: `data: {"id":"chunk","object":"chat.completion.chunk","created":1,"model":"glm-5","choices":[{"index":0,"delta":{"content":"你好，我是 GLM。"},"finish_reason":null}]}
data: [DONE]`,
		StreamMetrics: &StreamMetrics{
			SSEChunkCount:     1,
			ContentChunkCount: 1,
			FirstChunkMS:      4200,
			LastChunkMS:       4200,
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"response_mode":      "sse",
		"stream_incremental": true,
	})
	assertion, ok := findAssertion(assertions, "min_content_chunks")
	if !ok {
		t.Fatal("min_content_chunks assertion was not emitted")
	}
	if assertion.Pass {
		t.Fatal("expected single content chunk to fail stream_incremental")
	}
	if !strings.Contains(assertion.Message, "伪流式") {
		t.Fatalf("expected pseudo-stream message, got %q", assertion.Message)
	}
}

func TestStreamIncrementalAssertionPassesOnMultipleContentChunks(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		RawResponse: `data: {"id":"chunk","object":"chat.completion.chunk","created":1,"model":"glm-5","choices":[{"index":0,"delta":{"content":"你"},"finish_reason":null}]}
data: {"id":"chunk","object":"chat.completion.chunk","created":1,"model":"glm-5","choices":[{"index":0,"delta":{"content":"好"},"finish_reason":null}]}
data: [DONE]`,
		StreamMetrics: &StreamMetrics{
			SSEChunkCount:     2,
			ContentChunkCount: 2,
			FirstChunkMS:      120,
			LastChunkMS:       180,
			ChunkSpreadMS:     60,
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"response_mode":      "sse",
		"stream_incremental": true,
	})
	for _, name := range []string{"min_sse_chunks", "min_content_chunks"} {
		assertion, ok := findAssertion(assertions, name)
		if !ok {
			t.Fatalf("%s assertion was not emitted", name)
		}
		if !assertion.Pass {
			t.Fatalf("expected %s to pass, got %q", name, assertion.Message)
		}
	}
}

func TestReadProviderSSEStreamCollectsMetrics(t *testing.T) {
	body := strings.NewReader(`data: {"choices":[{"delta":{"content":"A"}}]}
data: {"choices":[{"delta":{"content":"B"}}]}
data: [DONE]
`)
	started := time.Now().Add(-200 * time.Millisecond)
	raw, metrics, err := readProviderSSEStream(body, started)
	if err != nil {
		t.Fatalf("readProviderSSEStream failed: %v", err)
	}
	if !strings.Contains(raw, "data:") {
		t.Fatal("expected raw SSE body")
	}
	if metrics.SSEChunkCount != 2 {
		t.Fatalf("expected 2 sse chunks, got %d", metrics.SSEChunkCount)
	}
	if metrics.ContentChunkCount != 2 {
		t.Fatalf("expected 2 content chunks, got %d", metrics.ContentChunkCount)
	}
	if metrics.ChunkSpreadMS < 0 {
		t.Fatalf("expected non-negative chunk spread, got %d", metrics.ChunkSpreadMS)
	}
}

func TestStreamProbeAttemptsAssertionFailsWhenAnyAttemptIsPseudoStream(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		RawResponse: `data: {"choices":[{"delta":{"content":"only once"}}]}
data: [DONE]`,
		StreamMetrics: &StreamMetrics{SSEChunkCount: 1, ContentChunkCount: 1},
		StreamProbeAttempts: []StreamProbeAttempt{
			{
				Attempt:       1,
				HTTPStatus:    200,
				StreamMetrics: &StreamMetrics{SSEChunkCount: 3, ContentChunkCount: 3},
			},
			{
				Attempt:       2,
				HTTPStatus:    200,
				StreamMetrics: &StreamMetrics{SSEChunkCount: 1, ContentChunkCount: 1},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"response_mode":         "sse",
		"stream_incremental":    true,
		"stream_probe_attempts": 3,
	})
	assertion, ok := findAssertion(assertions, "stream_probe_attempts")
	if !ok {
		t.Fatal("stream_probe_attempts assertion was not emitted")
	}
	if assertion.Pass {
		t.Fatal("expected stream_probe_attempts to fail when one attempt is pseudo-stream")
	}
	if !strings.Contains(assertion.Message, "第 2/3 次") {
		t.Fatalf("expected attempt index in message, got %q", assertion.Message)
	}
}

func TestStreamUsageInSSEAssertionRequiredPassesWithUsage(t *testing.T) {
	raw := `data: {"choices":[{"delta":{"content":"hi"}}]}
data: {"choices":[],"usage":{"prompt_tokens":1,"completion_tokens":2,"total_tokens":3}}
data: [DONE]`
	assertion, ok := streamUsageInSSEAssertion(raw, "required")
	if !ok {
		t.Fatal("expected stream_usage_in_sse assertion")
	}
	if !assertion.Pass {
		t.Fatalf("expected pass, got %q", assertion.Message)
	}
}

func TestStreamUsageInSSEAssertionRequiredFailsWithoutUsage(t *testing.T) {
	raw := `data: {"choices":[{"delta":{"content":"hi"}}]}
data: [DONE]`
	assertion, ok := streamUsageInSSEAssertion(raw, "required")
	if !ok || assertion.Pass {
		t.Fatal("expected required mode to fail without usage")
	}
}

func TestStreamUsageInSSEAssertionForbiddenFailsWithUsage(t *testing.T) {
	raw := `data: {"choices":[],"usage":{"prompt_tokens":1,"completion_tokens":2,"total_tokens":3}}
data: [DONE]`
	assertion, ok := streamUsageInSSEAssertion(raw, "forbidden")
	if !ok || assertion.Pass {
		t.Fatal("expected forbidden mode to fail when usage present")
	}
}

func TestStreamUsageInSSEAssertionObservedAlwaysPasses(t *testing.T) {
	for _, raw := range []string{
		`data: {"choices":[{"delta":{"content":"hi"}}]}
data: [DONE]`,
		`data: {"choices":[],"usage":{"prompt_tokens":1,"completion_tokens":2,"total_tokens":3}}
data: [DONE]`,
	} {
		assertion, ok := streamUsageInSSEAssertion(raw, "observed")
		if !ok || !assertion.Pass {
			t.Fatalf("expected observed mode to always pass for %q", raw)
		}
	}
}

func TestPopulateStreamUsagePresent(t *testing.T) {
	present := true
	result := RunCaseResult{
		RequestBody: map[string]any{"stream": true},
		RawResponse: `data: {"usage":{"prompt_tokens":1}}
data: [DONE]`,
	}
	populateStreamUsagePresent(&result)
	if result.StreamUsagePresent == nil || *result.StreamUsagePresent != present {
		t.Fatalf("expected stream_usage_present=true, got %v", result.StreamUsagePresent)
	}
}

func TestClassifyStreamUsageChunkProfileDedicated(t *testing.T) {
	raw := `data: {"choices":[{"delta":{"content":"hi"},"finish_reason":null}],"usage":null}
data: {"choices":[{"delta":{"content":""},"finish_reason":"stop"}],"usage":null}
data: {"choices":[],"usage":{"prompt_tokens":1,"completion_tokens":2,"total_tokens":3}}
data: [DONE]`
	parsed := parseSSEChunks(raw)
	profile := classifyStreamUsageChunkProfile(parsed.chunks)
	if profile != "dedicated" {
		t.Fatalf("expected dedicated profile, got %q", profile)
	}
}

func TestClassifyStreamUsageChunkProfileMergedFinishReason(t *testing.T) {
	raw := `data: {"choices":[{"delta":{"content":"hi"}}],"usage":null}
data: {"choices":[{"delta":{"content":""},"finish_reason":"length"}],"usage":{"prompt_tokens":12,"completion_tokens":80,"total_tokens":92}}
data: [DONE]`
	parsed := parseSSEChunks(raw)
	profile := classifyStreamUsageChunkProfile(parsed.chunks)
	if profile != "merged_finish_reason" {
		t.Fatalf("expected merged_finish_reason profile, got %q", profile)
	}
}

func TestClassifyStreamUsageChunkProfileMissing(t *testing.T) {
	raw := `data: {"choices":[{"delta":{"content":"hi"}}],"usage":null}
data: {"choices":[{"delta":{"content":""},"finish_reason":"stop"}],"usage":null}
data: [DONE]`
	parsed := parseSSEChunks(raw)
	profile := classifyStreamUsageChunkProfile(parsed.chunks)
	if profile != "missing" {
		t.Fatalf("expected missing profile, got %q", profile)
	}
}

func TestParseSSEChunksIgnoresUsageNull(t *testing.T) {
	raw := `data: {"choices":[{"delta":{"content":"hi"}}],"usage":null}
data: [DONE]`
	parsed := parseSSEChunks(raw)
	if len(parsed.chunks) != 1 || parsed.chunks[0].hasRealUsage {
		t.Fatal("expected usage:null chunk not to count as real usage")
	}
}

func TestStreamUsageChunkShapeAssertionOpenAIDedicatedPasses(t *testing.T) {
	raw := `data: {"choices":[{"delta":{"content":"hi"}}],"usage":null}
data: {"choices":[{"delta":{"content":""},"finish_reason":"stop"}],"usage":null}
data: {"choices":[],"usage":{"prompt_tokens":1,"completion_tokens":2,"total_tokens":3}}
data: [DONE]`
	assertion, ok := streamUsageChunkShapeAssertion(raw, "openai_dedicated")
	if !ok || !assertion.Pass {
		t.Fatalf("expected pass, got %q", assertion.Message)
	}
}

func TestStreamUsageChunkShapeAssertionOpenAIDedicatedFailsOnMerged(t *testing.T) {
	raw := `data: {"choices":[{"delta":{"content":"hi"}}],"usage":null}
data: {"choices":[{"delta":{"content":""},"finish_reason":"length"}],"usage":{"prompt_tokens":12,"completion_tokens":80,"total_tokens":92}}
data: [DONE]`
	assertion, ok := streamUsageChunkShapeAssertion(raw, "openai_dedicated")
	if !ok || assertion.Pass {
		t.Fatal("expected merged usage chunk to fail openai_dedicated assertion")
	}
}

func TestStreamUsageChunkShapeAssertionOpenAIDedicatedFailsWhenUsageNotLast(t *testing.T) {
	raw := `data: {"choices":[],"usage":{"prompt_tokens":1,"completion_tokens":2,"total_tokens":3}}
data: {"choices":[{"delta":{"content":""},"finish_reason":"stop"}],"usage":null}
data: [DONE]`
	assertion, ok := streamUsageChunkShapeAssertion(raw, "openai_dedicated")
	if !ok || assertion.Pass {
		t.Fatal("expected usage chunk before finish_reason to fail")
	}
}

func TestStreamUsageChunkShapeAssertionObservedAlwaysPasses(t *testing.T) {
	for _, raw := range []string{
		`data: {"choices":[{"delta":{"content":"hi"}}]}
data: [DONE]`,
		`data: {"choices":[],"usage":{"prompt_tokens":1,"completion_tokens":2,"total_tokens":3}}
data: [DONE]`,
	} {
		assertion, ok := streamUsageChunkShapeAssertion(raw, "observed")
		if !ok || !assertion.Pass {
			t.Fatalf("expected observed mode to always pass for %q", raw)
		}
	}
}

func TestPopulateStreamUsageChunkProfile(t *testing.T) {
	result := RunCaseResult{
		RequestBody: map[string]any{"stream": true},
		RawResponse: `data: {"choices":[{"delta":{"content":""},"finish_reason":"stop"}],"usage":null}
data: {"choices":[],"usage":{"prompt_tokens":1,"completion_tokens":2,"total_tokens":3}}
data: [DONE]`,
	}
	populateStreamUsageChunkProfile(&result)
	if result.StreamUsageChunkProfile == nil || *result.StreamUsageChunkProfile != "dedicated" {
		t.Fatalf("expected dedicated profile, got %v", result.StreamUsageChunkProfile)
	}
	if result.StreamDoneMarkerPresent == nil || !*result.StreamDoneMarkerPresent {
		t.Fatal("expected done marker present")
	}
}

func TestEvaluateAssertionsStreamUsageChunkShape(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus:  200,
		RequestBody: map[string]any{"stream": true, "stream_options": map[string]any{"include_usage": true}},
		RawResponse: `data: {"choices":[{"delta":{"content":""},"finish_reason":"stop"}],"usage":null}
data: {"choices":[],"usage":{"prompt_tokens":1,"completion_tokens":2,"total_tokens":3}}
data: [DONE]`,
	}
	assertions := evaluateAssertions(result, map[string]any{
		"response_mode":            "sse",
		"stream_usage_chunk_shape": "openai_dedicated",
	})
	assertion, ok := findAssertion(assertions, "stream_usage_chunk_shape")
	if !ok || !assertion.Pass {
		t.Fatalf("expected stream_usage_chunk_shape to pass, got %v", assertion)
	}
}

func TestClassifyOutputLengthCapPrecedenceMaxTokensWins(t *testing.T) {
	request := map[string]any{"max_tokens": 64, "max_completion_tokens": 512}
	response := map[string]any{
		"choices": []any{map[string]any{"finish_reason": "length"}},
		"usage":   map[string]any{"completion_tokens": 62},
	}
	profile := classifyOutputLengthCapPrecedence(200, request, response)
	if profile != "max_tokens" {
		t.Fatalf("expected max_tokens, got %q", profile)
	}
}

func TestClassifyOutputLengthCapPrecedenceMaxCompletionWins(t *testing.T) {
	request := map[string]any{"max_tokens": 512, "max_completion_tokens": 64}
	response := map[string]any{
		"choices": []any{map[string]any{"finish_reason": "length"}},
		"usage":   map[string]any{"completion_tokens": 63},
	}
	profile := classifyOutputLengthCapPrecedence(200, request, response)
	if profile != "max_completion_tokens" {
		t.Fatalf("expected max_completion_tokens, got %q", profile)
	}
}

func TestClassifyOutputLengthCapPrecedenceRejected(t *testing.T) {
	request := map[string]any{"max_tokens": 64, "max_completion_tokens": 512}
	profile := classifyOutputLengthCapPrecedence(400, request, nil)
	if profile != "rejected" {
		t.Fatalf("expected rejected, got %q", profile)
	}
}

func TestClassifyOutputLengthCapPrecedenceSingleField(t *testing.T) {
	request := map[string]any{"max_tokens": 64}
	response := map[string]any{
		"choices": []any{map[string]any{"finish_reason": "stop"}},
		"usage":   map[string]any{"completion_tokens": 20},
	}
	profile := classifyOutputLengthCapPrecedence(200, request, response)
	if profile != "single_field_only" {
		t.Fatalf("expected single_field_only, got %q", profile)
	}
}

func TestOutputLengthCapPrecedenceAssertionObservedAlwaysPasses(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus:  200,
		RequestBody: map[string]any{"max_tokens": 64, "max_completion_tokens": 512},
		ResponseBody: map[string]any{
			"choices": []any{map[string]any{"finish_reason": "length"}},
			"usage":   map[string]any{"completion_tokens": 64},
		},
	}
	assertion, ok := outputLengthCapPrecedenceAssertion(result, "observed")
	if !ok || !assertion.Pass {
		t.Fatalf("expected observed to pass, got %v", assertion)
	}
}

func TestPopulateOutputLengthMetrics(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		RequestBody: map[string]any{
			"max_tokens":            64,
			"max_completion_tokens": 512,
		},
		ResponseBody: map[string]any{
			"choices": []any{map[string]any{"finish_reason": "length"}},
			"usage":   map[string]any{"completion_tokens": 60},
		},
	}
	populateOutputLengthMetrics(&result)
	if result.OutputLengthCapPrecedence == nil || *result.OutputLengthCapPrecedence != "max_tokens" {
		t.Fatalf("expected max_tokens precedence, got %v", result.OutputLengthCapPrecedence)
	}
	if result.OutputCapEffective == nil || !*result.OutputCapEffective {
		t.Fatalf("expected output cap effective, got %v", result.OutputCapEffective)
	}
}

func TestEvaluateAssertionsStreamUsageObserved(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus:  200,
		RequestBody: map[string]any{"stream": true},
		RawResponse: `data: {"choices":[{"delta":{"content":"x"}}]}
data: [DONE]`,
	}
	assertions := evaluateAssertions(result, map[string]any{
		"response_mode":       "sse",
		"stream_usage_in_sse": "observed",
	})
	assertion, ok := findAssertion(assertions, "stream_usage_in_sse")
	if !ok || !assertion.Pass {
		t.Fatal("expected observed stream_usage_in_sse to pass")
	}
	if !strings.Contains(assertion.Message, "不含") {
		t.Fatalf("expected message about missing usage, got %q", assertion.Message)
	}
}

func TestValidateFeishuDocumentURLAllowsWikiPage(t *testing.T) {
	parsed, err := validateFeishuDocumentURL("https://bytedance.larkoffice.com/wiki/ILuTww7Xcimb6GkhH0mcK2f4nS7")
	if err != nil {
		t.Fatalf("expected feishu wiki url to validate: %v", err)
	}
	if parsed.Hostname() != "bytedance.larkoffice.com" {
		t.Fatalf("unexpected hostname %q", parsed.Hostname())
	}
}

func TestValidateFeishuDocumentURLAllowsDocxPage(t *testing.T) {
	_, err := validateFeishuDocumentURL("https://example.feishu.cn/docx/ABCDEF")
	if err != nil {
		t.Fatalf("expected feishu docx url to validate: %v", err)
	}
}

func TestValidateFeishuDocumentURLRejectsNonFeishuHost(t *testing.T) {
	_, err := validateFeishuDocumentURL("https://example.com/wiki/example-token")
	if err == nil {
		t.Fatal("expected non-feishu host to be rejected")
	}
}

func TestNormalizeFeishuDocumentMode(t *testing.T) {
	if mode, err := normalizeFeishuDocumentMode(""); err != nil || mode != "append" {
		t.Fatalf("expected default append mode, got %q err=%v", mode, err)
	}
	if mode, err := normalizeFeishuDocumentMode("overwrite"); err != nil || mode != "overwrite" {
		t.Fatalf("expected overwrite mode, got %q err=%v", mode, err)
	}
	if _, err := normalizeFeishuDocumentMode("delete"); err == nil {
		t.Fatal("expected invalid mode to be rejected")
	}
}

func TestOptionalCapabilityMismatchIsIgnored(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus:  404,
		RawResponse: `{"error":{"message":"No endpoints found that support input video"}}`,
	}
	expect := map[string]any{
		"http_status":                  200,
		"optional_capability_mismatch": true,
	}
	assertions := evaluateAssertions(result, expect)
	assertion, ok := findAssertion(assertions, "optional_capability_mismatch")
	if !ok {
		t.Fatal("optional_capability_mismatch assertion was not emitted")
	}
	if !assertion.Pass {
		t.Fatalf("expected optional capability mismatch assertion to pass, got %q", assertion.Message)
	}
	if conclusion := finalizeSupportConclusionForResult(result, nil, expect); conclusion != "ignored" {
		t.Fatalf("expected ignored conclusion, got %q", conclusion)
	}
}

func TestCapacityTotalContextUsesSafetyMargin(t *testing.T) {
	candidate := 256 * 1024
	probe := capacityProbe{
		Kind:                     "total_context",
		ContextOutputTokens:      8,
		ContextSafetyMarginRatio: 0.05,
	}
	payload, estimatedInputTokens, requestedOutputTokens, testedTotalContextTokens, appliedMargin := capacityAttemptPayload(
		Manifest{Provider: "siliconflow"},
		probe,
		"test-model",
		candidate,
	)
	wantMargin := int(float64(candidate)*0.05 + 0.5)
	wantTestedTotal := candidate - wantMargin
	if testedTotalContextTokens != wantTestedTotal {
		t.Fatalf("expected 256k tier to be tested at 95%%, got %d", testedTotalContextTokens)
	}
	if appliedMargin != wantMargin {
		t.Fatalf("expected 5%% applied margin, got %d", appliedMargin)
	}
	if estimatedInputTokens != wantTestedTotal-8 {
		t.Fatalf("expected input estimate to subtract output budget, got %d", estimatedInputTokens)
	}
	if requestedOutputTokens != 8 {
		t.Fatalf("expected output budget 8, got %d", requestedOutputTokens)
	}
	if got := payload["max_tokens"]; got != 8 {
		t.Fatalf("expected max_tokens=8 in payload, got %#v", got)
	}
}

func TestCapacityTotalContextSafetyMarginAppliesToEveryTier(t *testing.T) {
	for _, candidate := range []int{1024 * 1024, 512 * 1024, 128 * 1024, 32 * 1024} {
		testedTotalContextTokens, appliedMargin := capacityTestedTotalContextTokens(candidate, 0.05, 8)
		wantMargin := int(float64(candidate)*0.05 + 0.5)
		if appliedMargin != wantMargin {
			t.Fatalf("candidate %d expected 5%% margin %d, got %d", candidate, wantMargin, appliedMargin)
		}
		if testedTotalContextTokens != candidate-wantMargin {
			t.Fatalf("candidate %d expected tested total %d, got %d", candidate, candidate-wantMargin, testedTotalContextTokens)
		}
	}
}

func TestCapacityMaxInputPayloadFixesOutput(t *testing.T) {
	candidate := 128 * 1024
	probe := capacityProbe{Kind: "max_input", ContextSafetyMarginRatio: 0.05}
	payload, estimatedInputTokens, requestedOutputTokens, _, appliedMargin := capacityAttemptPayload(
		Manifest{Provider: "siliconflow"}, probe, "test-model", candidate)
	wantMargin := int(float64(candidate)*0.05 + 0.5)
	if appliedMargin != wantMargin {
		t.Fatalf("expected margin %d, got %d", wantMargin, appliedMargin)
	}
	if estimatedInputTokens != candidate-wantMargin {
		t.Fatalf("expected input %d, got %d", candidate-wantMargin, estimatedInputTokens)
	}
	if requestedOutputTokens != 16 {
		t.Fatalf("expected fixed output 16, got %d", requestedOutputTokens)
	}
	if got := payload["max_tokens"]; got != 16 {
		t.Fatalf("expected max_tokens=16, got %#v", got)
	}
}

func TestCapacityThinkingBudgetPayloadDialects(t *testing.T) {
	cases := []struct {
		field    string
		enable   bool
		provider string
		check    func(t *testing.T, payload map[string]any)
	}{
		{
			field: "thinking_budget", enable: true, provider: "siliconflow",
			check: func(t *testing.T, payload map[string]any) {
				if payload["thinking_budget"] != 4096 {
					t.Fatalf("expected thinking_budget=4096, got %#v", payload["thinking_budget"])
				}
				if payload["enable_thinking"] != true {
					t.Fatalf("expected enable_thinking=true, got %#v", payload["enable_thinking"])
				}
			},
		},
		{
			field: "thinking.budget_tokens", provider: "deepseek",
			check: func(t *testing.T, payload map[string]any) {
				thinking, ok := payload["thinking"].(map[string]any)
				if !ok || thinking["budget_tokens"] != 4096 {
					t.Fatalf("expected thinking.budget_tokens=4096, got %#v", payload["thinking"])
				}
			},
		},
		{
			field: "reasoning.max_tokens", provider: "openrouter",
			check: func(t *testing.T, payload map[string]any) {
				reasoning, ok := payload["reasoning"].(map[string]any)
				if !ok || reasoning["max_tokens"] != 4096 {
					t.Fatalf("expected reasoning.max_tokens=4096, got %#v", payload["reasoning"])
				}
			},
		},
	}
	for _, tc := range cases {
		probe := capacityProbe{Kind: "thinking_budget", ThinkingField: tc.field, EnableThinking: tc.enable}
		payload, _, requestedOutputTokens, _, _ := capacityAttemptPayload(
			Manifest{Provider: tc.provider}, probe, "test-model", 4096)
		tc.check(t, payload)
		if requestedOutputTokens != 4096+2048 {
			t.Fatalf("provider %s expected output headroom, got %d", tc.provider, requestedOutputTokens)
		}
	}
}

func TestCapacityBalancedContextSplitRespectsCaps(t *testing.T) {
	probe := capacityProbe{
		Kind:                     "total_context",
		ContextSafetyMarginRatio: 0.05,
		BalancedMaxInputTokens:   96 * 1024,
		BalancedMaxOutputTokens:  64 * 1024,
	}
	candidate := 128 * 1024
	in, out, total, _ := capacityBalancedContextSplit(candidate, probe)
	if in > probe.BalancedMaxInputTokens {
		t.Fatalf("input %d exceeds cap %d", in, probe.BalancedMaxInputTokens)
	}
	if out > probe.BalancedMaxOutputTokens {
		t.Fatalf("output %d exceeds cap %d", out, probe.BalancedMaxOutputTokens)
	}
	if in+out != total {
		t.Fatalf("expected input+output==tested total, got %d+%d != %d", in, out, total)
	}
	// 128k context with a 96k input cap must still reach beyond the input cap.
	if total <= probe.BalancedMaxInputTokens {
		t.Fatalf("balanced total %d did not exceed input cap %d", total, probe.BalancedMaxInputTokens)
	}
}

func TestEvaluateOutputCapEffective(t *testing.T) {
	eff, _ := evaluateOutputCapEffective(capacityAttempt{Candidate: 512, FinishReason: "length", CompletionTokens: 510})
	if !eff {
		t.Fatal("expected length finish_reason to be effective")
	}
	ineff, _ := evaluateOutputCapEffective(capacityAttempt{Candidate: 512, FinishReason: "stop", CompletionTokens: 12})
	if ineff {
		t.Fatal("expected early stop to be ineffective")
	}
}

func TestCapacitySummaryThinkingBudgetEffective(t *testing.T) {
	probe := capacityProbe{Kind: "thinking_budget", ThinkingField: "thinking_budget", Candidates: []int{8192, 1024}}
	attempts := []capacityAttempt{
		{Candidate: 8192, Conclusion: "supported", ReasoningTokens: 4000},
		{Candidate: 1024, Conclusion: "supported", ReasoningTokens: 900},
	}
	summary := capacitySummary(probe, attempts, false)
	if summary["budget_accepted"] != true {
		t.Fatalf("expected budget_accepted=true, got %#v", summary["budget_accepted"])
	}
	if summary["effective"] != true {
		t.Fatalf("expected effective=true (reasoning scales with budget), got %#v", summary["effective"])
	}
	if summary["budget_max"] != 8192 {
		t.Fatalf("expected budget_max=8192, got %#v", summary["budget_max"])
	}
}

func TestReasoningTokensMinAssertionPasses(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"usage": map[string]any{
				"completion_tokens_details": map[string]any{
					"reasoning_tokens": float64(48),
				},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"reasoning_tokens_min": float64(32),
	})
	assertion, ok := findAssertion(assertions, "reasoning_tokens_min")
	if !ok {
		t.Fatal("reasoning_tokens_min assertion was not emitted")
	}
	if !assertion.Pass {
		t.Fatalf("expected reasoning_tokens_min to pass, got %q", assertion.Message)
	}
}

func TestReasoningTokensMaxAssertionFails(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"usage": map[string]any{
				"completion_tokens_details": map[string]any{
					"reasoning_tokens": float64(96),
				},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"reasoning_tokens_max": float64(64),
	})
	assertion, ok := findAssertion(assertions, "reasoning_tokens_max")
	if !ok {
		t.Fatal("reasoning_tokens_max assertion was not emitted")
	}
	if assertion.Pass {
		t.Fatal("expected reasoning_tokens_max to fail when actual exceeds max")
	}
}

func TestCompletionTokensMaxAssertionPasses(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"usage": map[string]any{
				"completion_tokens": float64(500),
				"completion_tokens_details": map[string]any{
					"reasoning_tokens": float64(29),
				},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"completion_tokens_max": float64(500),
	})
	assertion, ok := findAssertion(assertions, "completion_tokens_max")
	if !ok {
		t.Fatal("completion_tokens_max assertion was not emitted")
	}
	if !assertion.Pass {
		t.Fatalf("expected completion_tokens_max to pass at cap, got %q", assertion.Message)
	}
}

func TestCompletionTokensMaxAssertionFailsOffByOne(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"usage": map[string]any{
				"completion_tokens": float64(501),
				"completion_tokens_details": map[string]any{
					"reasoning_tokens": float64(29),
				},
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"completion_tokens_max": float64(500),
	})
	assertion, ok := findAssertion(assertions, "completion_tokens_max")
	if !ok {
		t.Fatal("completion_tokens_max assertion was not emitted")
	}
	if assertion.Pass {
		t.Fatal("expected completion_tokens_max to fail when completion_tokens exceeds cap by 1")
	}
}

func TestCompletionTokensMaxInfersCapFromRequest(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		RequestBody: map[string]any{
			"max_tokens": float64(500),
		},
		ResponseBody: map[string]any{
			"usage": map[string]any{
				"completion_tokens": float64(480),
			},
		},
	}
	assertions := evaluateAssertions(result, map[string]any{
		"completion_tokens_max": "request",
	})
	assertion, ok := findAssertion(assertions, "completion_tokens_max")
	if !ok {
		t.Fatal("completion_tokens_max assertion was not emitted")
	}
	if !assertion.Pass {
		t.Fatalf("expected completion_tokens_max to pass with request-inferred cap, got %q", assertion.Message)
	}
}

func TestPopulateThinkingTokenMetrics(t *testing.T) {
	result := RunCaseResult{
		ResponseBody: map[string]any{
			"usage": map[string]any{
				"completion_tokens_details": map[string]any{
					"reasoning_tokens": float64(24),
					"thinking_tokens":  float64(8),
				},
			},
		},
	}
	populateThinkingTokenMetrics(&result)
	if result.ReasoningTokens == nil || *result.ReasoningTokens != 24 {
		t.Fatalf("expected reasoning_tokens=24, got %#v", result.ReasoningTokens)
	}
	if result.ThinkingTokens == nil || *result.ThinkingTokens != 8 {
		t.Fatalf("expected thinking_tokens=8, got %#v", result.ThinkingTokens)
	}
}

func findAssertion(assertions []CaseAssertion, name string) (CaseAssertion, bool) {
	for _, assertion := range assertions {
		if assertion.Name == name {
			return assertion, true
		}
	}
	return CaseAssertion{}, false
}

func TestExtractCacheHitMetricsCachedTokens(t *testing.T) {
	usage := map[string]any{
		"prompt_tokens": float64(200),
		"prompt_tokens_details": map[string]any{
			"cached_tokens": float64(128),
		},
	}
	hit, miss, prompt, field, hasField := extractCacheHitMetrics(usage)
	if !hasField || field != "usage.prompt_tokens_details.cached_tokens" {
		t.Fatalf("unexpected field detection: field=%q hasField=%v", field, hasField)
	}
	if hit != 128 || miss != 0 || prompt != 200 {
		t.Fatalf("unexpected metrics: hit=%d miss=%d prompt=%d", hit, miss, prompt)
	}
	if rate := cacheHitRate(hit, miss, prompt); rate != 1.0 {
		t.Fatalf("expected hit rate 1.0 when only cached_tokens reported, got %f", rate)
	}
}

func TestExtractCacheHitMetricsDeepSeekFields(t *testing.T) {
	usage := map[string]any{
		"prompt_tokens":            float64(100),
		"prompt_cache_hit_tokens":  float64(0),
		"prompt_cache_miss_tokens": float64(100),
	}
	hit, miss, prompt, field, hasField := extractCacheHitMetrics(usage)
	if !hasField || field != "usage.prompt_cache_hit_tokens" {
		t.Fatalf("unexpected field detection: field=%q hasField=%v", field, hasField)
	}
	if hit != 0 || miss != 100 || prompt != 100 {
		t.Fatalf("unexpected metrics: hit=%d miss=%d prompt=%d", hit, miss, prompt)
	}
}

func TestCacheProbeConclusionHitSupported(t *testing.T) {
	attempts := []cacheProbeAttempt{
		{Attempt: 1, HTTPStatus: 200},
		{
			Attempt:    2,
			HTTPStatus: 200,
			Usage: map[string]any{
				"prompt_tokens": float64(120),
				"prompt_tokens_details": map[string]any{
					"cached_tokens": float64(80),
				},
			},
			HitTokens: 80,
			HitRate:   80.0 / 120.0,
			HitField:  "usage.prompt_tokens_details.cached_tokens",
		},
	}
	conclusion, _, pass := cacheProbeConclusion(cacheProbe{}, attempts, attempts[1])
	if conclusion != "supported" || !pass {
		t.Fatalf("expected supported pass, got conclusion=%q pass=%v", conclusion, pass)
	}
}

func TestCacheProbeConclusionZeroHitIgnored(t *testing.T) {
	attempts := []cacheProbeAttempt{
		{Attempt: 1, HTTPStatus: 200},
		{
			Attempt:    2,
			HTTPStatus: 200,
			Usage: map[string]any{
				"prompt_tokens":            float64(100),
				"prompt_cache_hit_tokens":  float64(0),
				"prompt_cache_miss_tokens": float64(100),
			},
			HitTokens: 0,
			HitField:  "usage.prompt_cache_hit_tokens",
		},
	}
	conclusion, message, pass := cacheProbeConclusion(cacheProbe{}, attempts, attempts[1])
	if conclusion != "ignored" || !pass {
		t.Fatalf("expected ignored pass, got conclusion=%q pass=%v", conclusion, pass)
	}
	if !strings.Contains(message, "未观测到缓存命中") {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestCacheProbeConclusionMissingFieldsIgnored(t *testing.T) {
	attempts := []cacheProbeAttempt{
		{Attempt: 1, HTTPStatus: 200},
		{
			Attempt:    2,
			HTTPStatus: 200,
			Usage: map[string]any{
				"prompt_tokens": float64(50),
			},
		},
	}
	conclusion, message, pass := cacheProbeConclusion(cacheProbe{}, attempts, attempts[1])
	if conclusion != "ignored" || !pass {
		t.Fatalf("expected ignored pass, got conclusion=%q pass=%v", conclusion, pass)
	}
	if !strings.Contains(message, "未暴露缓存统计") {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestCacheProbeSpecMinHitRate(t *testing.T) {
	probe, ok := cacheProbeSpec(map[string]any{
		"__cache_probe": map[string]any{
			"kind":         "passive",
			"min_hit_rate": 0.85,
		},
	})
	if !ok || probe.MinHitRate != 0.85 {
		t.Fatalf("unexpected probe: %#v ok=%v", probe, ok)
	}
}

func TestCacheProbeConclusionThresholdMet(t *testing.T) {
	probe := cacheProbe{MinHitRate: 0.85}
	attempts := []cacheProbeAttempt{
		{Attempt: 1, HTTPStatus: 200},
		{
			Attempt:    2,
			HTTPStatus: 200,
			Usage: map[string]any{
				"prompt_tokens": float64(100),
				"prompt_tokens_details": map[string]any{
					"cached_tokens": float64(90),
				},
			},
			HitTokens: 90,
			HitRate:   0.9,
			HitField:  "usage.prompt_tokens_details.cached_tokens",
		},
	}
	conclusion, _, pass := cacheProbeConclusion(probe, attempts, attempts[1])
	if conclusion != "supported" || !pass {
		t.Fatalf("expected supported pass, got conclusion=%q pass=%v", conclusion, pass)
	}
}

func TestCacheProbeConclusionThresholdBelow(t *testing.T) {
	probe := cacheProbe{MinHitRate: 0.85}
	attempts := []cacheProbeAttempt{
		{Attempt: 1, HTTPStatus: 200},
		{
			Attempt:    2,
			HTTPStatus: 200,
			Usage: map[string]any{
				"prompt_tokens":            float64(100),
				"prompt_cache_hit_tokens":  float64(42),
				"prompt_cache_miss_tokens": float64(58),
			},
			HitTokens: 42,
			HitRate:   0.42,
			HitField:  "usage.prompt_cache_hit_tokens",
		},
	}
	conclusion, message, pass := cacheProbeConclusion(probe, attempts, attempts[1])
	if conclusion != "schema_mismatch" || pass {
		t.Fatalf("expected schema_mismatch fail, got conclusion=%q pass=%v message=%q", conclusion, pass, message)
	}
	if !strings.Contains(message, "低于阈值") {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestCacheProbeConclusionThresholdMissingFields(t *testing.T) {
	probe := cacheProbe{MinHitRate: 0.85}
	attempts := []cacheProbeAttempt{
		{Attempt: 1, HTTPStatus: 200},
		{
			Attempt:    2,
			HTTPStatus: 200,
			Usage: map[string]any{
				"prompt_tokens": float64(50),
			},
		},
	}
	conclusion, message, pass := cacheProbeConclusion(probe, attempts, attempts[1])
	if conclusion != "schema_mismatch" || pass {
		t.Fatalf("expected schema_mismatch fail, got conclusion=%q pass=%v", conclusion, pass)
	}
	if !strings.Contains(message, "无法判定是否达到") {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestCacheProbeSpec(t *testing.T) {
	probe, ok := cacheProbeSpec(map[string]any{
		"__cache_probe": map[string]any{
			"kind": "passive",
		},
	})
	if !ok || probe.Kind != "passive" || probe.WarmupDelayMS != 400 {
		t.Fatalf("unexpected probe: %#v ok=%v", probe, ok)
	}
	if _, ok := cacheProbeSpec(map[string]any{"__cache_probe": "bad"}); ok {
		t.Fatal("expected invalid spec to fail")
	}
}

func TestCacheAttemptPayloadKinds(t *testing.T) {
	manifest := Manifest{Provider: "openai", Endpoint: "/chat/completions"}
	passive := cacheAttemptPayload(manifest, cacheProbe{Kind: "passive"}, "gpt-4o-mini")
	if passive["prompt_cache_key"] != nil {
		t.Fatal("passive payload should not include prompt_cache_key")
	}
	keyed := cacheAttemptPayload(manifest, cacheProbe{Kind: "prompt_cache_key"}, "gpt-4o-mini")
	if keyed["prompt_cache_key"] != "provider-diff-cache-probe" {
		t.Fatalf("expected prompt_cache_key, got %#v", keyed["prompt_cache_key"])
	}
	control := cacheAttemptPayload(manifest, cacheProbe{Kind: "cache_control"}, "gpt-4o-mini")
	messages, ok := control["messages"].([]map[string]any)
	if !ok || len(messages) == 0 {
		t.Fatal("expected messages in cache_control payload")
	}
	content, ok := messages[0]["content"].([]map[string]any)
	if !ok || len(content) == 0 {
		t.Fatal("expected content array in cache_control payload")
	}
	if controlBlock, ok := content[0]["cache_control"].(map[string]any); !ok || controlBlock["type"] != "ephemeral" {
		t.Fatalf("expected cache_control ephemeral, got %#v", content[0]["cache_control"])
	}
}
