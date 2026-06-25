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
