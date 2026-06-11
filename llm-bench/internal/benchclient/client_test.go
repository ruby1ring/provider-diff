package benchclient

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"provider-diff/llm-bench/internal/dataset"
)

func TestSendRetries429UntilSuccessWithBackoff(t *testing.T) {
	var calls int32
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		call := atomic.AddInt32(&calls, 1)
		if call <= 2 {
			http.Error(w, "rate limited", http.StatusTooManyRequests)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, "data: {\"choices\":[{\"delta\":{\"content\":\"ok\"}}]}\n\n")
		fmt.Fprint(w, "data: [DONE]\n\n")
	}))
	defer upstream.Close()

	var delays []time.Duration
	oldSleep := retrySleep
	retrySleep = func(ctx context.Context, delay time.Duration) bool {
		delays = append(delays, delay)
		return true
	}
	defer func() { retrySleep = oldSleep }()

	result := Send(context.Background(), upstream.Client(), Config{
		Backend:  "openai-chat",
		BaseURL:  upstream.URL,
		Endpoint: "/v1/chat/completions",
		Model:    "test-model",
		APIKey:   "test-key",
	}, dataset.Sample{Prompt: "hello", InputTokens: 1, OutputTokens: 1})

	if !result.Success {
		t.Fatalf("expected success, got error %q", result.Error)
	}
	if got := atomic.LoadInt32(&calls); got != 3 {
		t.Fatalf("expected 3 upstream calls, got %d", got)
	}
	wantDelays := []time.Duration{30 * time.Second, time.Minute}
	if len(delays) != len(wantDelays) {
		t.Fatalf("expected %d retry delays, got %d: %v", len(wantDelays), len(delays), delays)
	}
	for i, want := range wantDelays {
		if delays[i] != want {
			t.Fatalf("delay %d: expected %s, got %s", i, want, delays[i])
		}
	}
}
