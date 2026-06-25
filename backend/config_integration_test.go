package main

import (
	"path/filepath"
	"testing"
)

func TestProjectConfigYAMLWhenPresent(t *testing.T) {
	root, err := findProjectRoot()
	if err != nil {
		t.Skip(err)
	}
	providers, err := loadLocalConfig(root)
	if err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"deepseek", "siliconflow-cn", "siliconflow-com", "openrouter", "aliyun-cn"} {
		entry, ok := providers[name]
		if !ok {
			t.Logf("%s: section missing", name)
			continue
		}
		hasKey := entry.APIKey != "" && entry.APIKey != "token-abc123"
		t.Logf("%s: key present=%v len=%d", name, hasKey, len(entry.APIKey))
	}
	_ = filepath.Join(root, "config.yaml")
}
