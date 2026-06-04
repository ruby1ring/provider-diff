package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
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
	if len(cases) != 19 {
		t.Fatalf("expected 19 thinking probe cases, got %d", len(cases))
	}
	if cases[0].CaseID != "thinking_baseline_no_thinking" {
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

func findAssertion(assertions []CaseAssertion, name string) (CaseAssertion, bool) {
	for _, assertion := range assertions {
		if assertion.Name == name {
			return assertion, true
		}
	}
	return CaseAssertion{}, false
}
