package main

import "testing"

func TestResponseFormatAssertionChecksSchemaShortcutForChat(t *testing.T) {
	result := RunCaseResult{
		RequestBody: map[string]any{
			"response_format": map[string]any{
				"type": "json_schema",
				"schema": map[string]any{
					"required": []any{"result"},
				},
			},
		},
		ResponseBody: map[string]any{
			"choices": []any{map[string]any{
				"message": map[string]any{"content": `{"status":"ok"}`},
			}},
		},
	}

	assertion, ok := responseFormatAssertion(result)
	if !ok {
		t.Fatal("response_format assertion was not emitted")
	}
	if assertion.Pass {
		t.Fatalf("expected missing shortcut required field to fail, got %q", assertion.Message)
	}
}

func TestResponseFormatAssertionChecksMessagesOutputConfig(t *testing.T) {
	result := RunCaseResult{
		RequestBody: map[string]any{
			"output_config": map[string]any{
				"format": map[string]any{
					"type": "json_schema",
					"json_schema": map[string]any{
						"schema": map[string]any{
							"required": []any{"status", "endpoint"},
						},
					},
				},
			},
		},
		ResponseBody: map[string]any{
			"content": []any{map[string]any{
				"type": "text",
				"text": `{"status":"ok","endpoint":"messages"}`,
			}},
		},
	}

	assertion, ok := responseFormatAssertion(result)
	if !ok {
		t.Fatal("response_format assertion was not emitted")
	}
	if !assertion.Pass {
		t.Fatalf("expected Messages output_config schema assertion to pass, got %q", assertion.Message)
	}
}

func TestContentShouldParseAsJSONUsesMessagesTextBlock(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"content": []any{map[string]any{
				"type": "text",
				"text": `{"status":"ok"}`,
			}},
		},
	}

	assertions := evaluateAssertions(result, map[string]any{"content_should_parse_as_json": true})
	assertion, ok := findAssertion(assertions, "content_should_parse_as_json")
	if !ok || !assertion.Pass {
		t.Fatalf("expected Messages JSON assertion to pass, got %#v", assertion)
	}
}

func TestAssistantContentContainsChecksMessagesTextBlock(t *testing.T) {
	result := RunCaseResult{
		HTTPStatus: 200,
		ResponseBody: map[string]any{
			"content": []any{map[string]any{
				"type": "text",
				"text": "The marker is TP-MSG-ROLE-42.",
			}},
		},
	}

	assertions := evaluateAssertions(result, map[string]any{"assistant_content_contains": "TP-MSG-ROLE-42"})
	assertion, ok := findAssertion(assertions, "assistant_content_contains")
	if !ok || !assertion.Pass {
		t.Fatalf("expected Messages content assertion to pass, got %#v", assertion)
	}
}
