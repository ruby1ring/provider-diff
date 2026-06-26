package main

import "testing"

func TestParseModelListOpenAI(t *testing.T) {
	body := []byte(`{"data":[{"id":"GLM-5.2","name":"GLM-5.2"},{"id":"ep-abc-123","name":"DeepSeek-V4-Flash"}]}`)
	models, err := parseModelList(body)
	if err != nil {
		t.Fatalf("parseModelList: %v", err)
	}
	if len(models) != 2 {
		t.Fatalf("expected 2 models, got %d", len(models))
	}
	if models[0].ID != "GLM-5.2" || models[1].DisplayName != "DeepSeek-V4-Flash" {
		t.Fatalf("unexpected models: %+v", models)
	}
}

func TestSourceAuthEnvsStreamLake(t *testing.T) {
	envs := sourceAuthEnvs(channelModelListSource{Key: "streamlake-cn", AuthEnv: "WQ_API_KEY"})
	if len(envs) != 2 || envs[0] != "WQ_API_KEY" || envs[1] != "STREAMLAKE_API_KEY" {
		t.Fatalf("unexpected streamlake auth envs: %v", envs)
	}
}

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
