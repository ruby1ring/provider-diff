package main

import "testing"

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

func findAssertion(assertions []CaseAssertion, name string) (CaseAssertion, bool) {
	for _, assertion := range assertions {
		if assertion.Name == name {
			return assertion, true
		}
	}
	return CaseAssertion{}, false
}
