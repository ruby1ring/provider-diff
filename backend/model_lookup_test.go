package main

import "testing"

func TestScoreMatchGlm52(t *testing.T) {
	queryNorm := normalizeModelName("glm 5.2")
	queryCompact := compactModelName("glm 5.2")
	score := scoreMatch(queryNorm, queryCompact, "z-ai/glm-5.2")
	if score < 72 {
		t.Fatalf("expected glm 5.2 to match z-ai/glm-5.2, got %v", score)
	}
}

func TestScoreMatchVersionGuard(t *testing.T) {
	queryNorm := normalizeModelName("glm 5.2")
	queryCompact := compactModelName("glm 5.2")
	score := scoreMatch(queryNorm, queryCompact, "glm-5")
	if score != 0 {
		t.Fatalf("expected glm 5.2 not to match glm-5, got %v", score)
	}
}
