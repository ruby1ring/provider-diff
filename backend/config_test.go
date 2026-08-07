package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseLocalConfigFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	content := `deepseek:
  https://api.deepseek.com
  sk-deepseek-test

siliconflow:
  https://api.siliconflow.cn/v1
  sk-sf-test
`
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}

	providers, err := parseLocalConfigFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if providers["deepseek"].APIKey != "sk-deepseek-test" {
		t.Fatalf("unexpected deepseek key: %q", providers["deepseek"].APIKey)
	}
	if providers["siliconflow"].BaseURL != "https://api.siliconflow.cn/v1" {
		t.Fatalf("unexpected siliconflow base url: %q", providers["siliconflow"].BaseURL)
	}
}

func TestMaskAPIKey(t *testing.T) {
	if got := maskAPIKey("sk-deepseek-test-key"); got != "sk-d****-key" {
		t.Fatalf("unexpected mask: %q", got)
	}
	if got := maskAPIKey("ab"); got != "a****b" {
		t.Fatalf("unexpected short mask: %q", got)
	}
	if maskAPIKey("sk-your-key") != "" {
		t.Fatal("expected placeholder to mask as empty")
	}
}

func TestResolveLocalProviderConfig(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	content := `aliyun-cn:
  https://dashscope.aliyuncs.com/compatible-mode/v1
  sk-aliyun-real-key

siliconflow:
  https://api.siliconflow.cn/v1
  sk-sf-test
`
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}

	entry, ok := resolveLocalProviderConfig(dir, "aliyun-cn")
	if !ok || entry.APIKey != "sk-aliyun-real-key" {
		t.Fatalf("unexpected aliyun-cn config: %+v ok=%v", entry, ok)
	}
	entry, ok = resolveLocalProviderConfig(dir, "sf-router-cn")
	if !ok || entry.APIKey != "sk-sf-test" {
		t.Fatalf("expected sf-router-cn alias to resolve siliconflow: %+v ok=%v", entry, ok)
	}
}

func TestResolveProviderAPIKeyPrefersConfigFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	if err := os.WriteFile(path, []byte("moonshot:\n  https://api.moonshot.cn/v1\n  sk-from-yaml\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("MOONSHOT_API_KEY", "sk-from-env")

	key := resolveProviderAPIKey(dir, []string{"moonshot"}, "MOONSHOT_API_KEY")
	if key != "sk-from-yaml" {
		t.Fatalf("expected config.yaml key, got %q", key)
	}
}

func TestResolveProviderExpect(t *testing.T) {
	base := map[string]any{
		"http_status":        float64(200),
		"support_conclusion": "supported",
		"thinking_absent":    true,
		"provider_expect": map[string]any{
			"aliyun": map[string]any{
				"http_status":        float64(400),
				"support_conclusion": "rejected_400",
				"thinking_absent":    nil,
			},
		},
	}
	resolved := resolveProviderExpect(base, "aliyun-cn", "")
	if resolved["http_status"] != float64(400) || resolved["support_conclusion"] != "rejected_400" {
		t.Fatalf("aliyun-cn 应命中 aliyun 前缀覆盖: %v", resolved)
	}
	if _, exists := resolved["thinking_absent"]; exists {
		t.Fatalf("null 覆盖应删除断言键: %v", resolved)
	}
	if _, exists := resolved["provider_expect"]; exists {
		t.Fatalf("provider_expect 元数据不应保留: %v", resolved)
	}
	untouched := resolveProviderExpect(base, "deepseek", "")
	if untouched["http_status"] != float64(200) || untouched["thinking_absent"] != true {
		t.Fatalf("不匹配的平台应保持基础 expect: %v", untouched)
	}
}

func TestResolveProviderExpectModelScoped(t *testing.T) {
	base := map[string]any{
		"http_status":        float64(200),
		"support_conclusion": "supported",
		"model_expect": map[string]any{
			"qwen": map[string]any{
				"http_status":        float64(400),
				"support_conclusion": "rejected_400",
			},
		},
	}
	for _, model := range []string{"qwen3.8-max", "Qwen/Qwen3.5-397B-A17B", "QWEN3-MAX"} {
		resolved := resolveProviderExpect(base, "aliyun-cn", model)
		if resolved["http_status"] != float64(400) {
			t.Fatalf("模型 %s 应命中 qwen 覆盖: %v", model, resolved)
		}
	}
	for _, model := range []string{"deepseek-v4-pro", "deepseek-ai/DeepSeek-V4-Flash"} {
		resolved := resolveProviderExpect(base, "aliyun-cn", model)
		if resolved["http_status"] != float64(200) {
			t.Fatalf("非 qwen 模型 %s 不应被覆盖: %v", model, resolved)
		}
	}
	if _, exists := resolveProviderExpect(base, "aliyun-cn", "qwen3.8-max")["model_expect"]; exists {
		t.Fatal("model_expect 元数据不应保留")
	}
}
