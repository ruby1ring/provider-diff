package main

import "testing"

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
	if len(cases) != 13 {
		t.Fatalf("expected 13 thinking probe cases, got %d", len(cases))
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
