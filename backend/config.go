package main

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

type localProviderConfig struct {
	BaseURL string
	APIKey  string
}

type localConfigStore struct {
	mu       sync.RWMutex
	root     string
	modTime  int64
	providers map[string]localProviderConfig
}

var localConfig localConfigStore

func parseLocalConfigFile(path string) (map[string]localProviderConfig, error) {
	file, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]localProviderConfig{}, nil
		}
		return nil, err
	}
	defer file.Close()

	providers := map[string]localProviderConfig{}
	current := ""
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if strings.HasSuffix(line, ":") && !strings.Contains(line, " ") {
			current = strings.TrimSuffix(line, ":")
			if current != "" {
				providers[current] = localProviderConfig{}
			}
			continue
		}
		if current == "" {
			continue
		}
		entry := providers[current]
		if strings.HasPrefix(line, "http://") || strings.HasPrefix(line, "https://") {
			entry.BaseURL = line
		} else if entry.APIKey == "" {
			entry.APIKey = line
		}
		providers[current] = entry
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return providers, nil
}

func loadLocalConfig(root string) (map[string]localProviderConfig, error) {
	path := filepath.Join(root, "config.yaml")
	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]localProviderConfig{}, nil
		}
		return nil, err
	}

	localConfig.mu.RLock()
	if localConfig.root == root && localConfig.modTime == info.ModTime().UnixNano() && localConfig.providers != nil {
		cached := localConfig.providers
		localConfig.mu.RUnlock()
		return cached, nil
	}
	localConfig.mu.RUnlock()

	providers, err := parseLocalConfigFile(path)
	if err != nil {
		return nil, err
	}

	localConfig.mu.Lock()
	localConfig.root = root
	localConfig.modTime = info.ModTime().UnixNano()
	localConfig.providers = providers
	localConfig.mu.Unlock()
	return providers, nil
}

func isPlaceholderAPIKey(key string) bool {
	trimmed := strings.TrimSpace(key)
	if trimmed == "" || trimmed == "token-abc123" {
		return true
	}
	return strings.Contains(strings.ToLower(trimmed), "your-")
}

// platformConfigKeyAliases maps 测评渠道 platform id → config.yaml section ids (first match wins).
var platformConfigKeyAliases = map[string][]string{
	"deepseek":       {"deepseek"},
	"moonshot":       {"moonshot"},
	"zhipu":          {"zhipu"},
	"minimax":        {"minimax"},
	"aliyun-cn":      {"aliyun-cn", "aliyun", "ali"},
	"aliyun-us":      {"aliyun-us", "aliyun", "ali"},
	"siliconflow-cn": {"siliconflow-cn", "sf-router-cn", "siliconflow"},
	"siliconflow-com": {"siliconflow-com", "sf-router-com", "siliconflow"},
	"openrouter":     {"openrouter"},
	"sf-router-cn":   {"sf-router-cn", "siliconflow-cn", "siliconflow"},
	"sf-router-com":  {"sf-router-com", "siliconflow-com", "siliconflow"},
	"streamlake-cn":  {"streamlake-cn", "streamlake"},
}

func maskAPIKey(key string) string {
	trimmed := strings.TrimSpace(key)
	if trimmed == "" || isPlaceholderAPIKey(trimmed) {
		return ""
	}
	runes := []rune(trimmed)
	if len(runes) <= 1 {
		return "****"
	}
	if len(runes) <= 8 {
		return string(runes[:1]) + "****" + string(runes[len(runes)-1:])
	}
	return string(runes[:4]) + "****" + string(runes[len(runes)-4:])
}

func configKeysForPlatform(platformID string) []string {
	platformID = strings.TrimSpace(platformID)
	if platformID == "" {
		return nil
	}
	if keys, ok := platformConfigKeyAliases[platformID]; ok {
		return keys
	}
	return []string{platformID}
}

func resolveLocalProviderConfig(root, platformID string) (localProviderConfig, bool) {
	providers, err := loadLocalConfig(root)
	if err != nil {
		return localProviderConfig{}, false
	}
	for _, configKey := range configKeysForPlatform(platformID) {
		entry := providers[configKey]
		key := strings.TrimSpace(entry.APIKey)
		if key != "" && !isPlaceholderAPIKey(key) {
			return entry, true
		}
	}
	return localProviderConfig{}, false
}

func resolveProviderAPIKey(root string, configKeys []string, authEnvs ...string) string {
	if len(configKeys) > 0 {
		providers, err := loadLocalConfig(root)
		if err == nil {
			for _, configKey := range configKeys {
				key := strings.TrimSpace(providers[configKey].APIKey)
				if key != "" && !isPlaceholderAPIKey(key) {
					return key
				}
			}
		}
	}
	for _, authEnv := range authEnvs {
		if authEnv == "" {
			continue
		}
		key := strings.TrimSpace(os.Getenv(authEnv))
		if key != "" && !isPlaceholderAPIKey(key) {
			return key
		}
	}
	return ""
}
