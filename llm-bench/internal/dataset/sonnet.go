package dataset

import (
	"errors"
	"math/rand"
	"os"
	"strings"
)

func Sonnet(cfg Config) ([]Sample, error) {
	if strings.TrimSpace(cfg.Path) == "" {
		return nil, errors.New("dataset-path is required for sonnet")
	}
	data, err := os.ReadFile(cfg.Path)
	if err != nil {
		return nil, err
	}
	lines := make([]string, 0)
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line != "" {
			lines = append(lines, line)
		}
	}
	if len(lines) == 0 {
		return nil, errors.New("sonnet dataset has no non-empty lines")
	}
	rng := newSeededRand(cfg.Seed)
	prefix := buildSonnetText(rng, lines, cfg.SonnetPrefixLen)
	samples := make([]Sample, 0, cfg.NumPrompts)
	for i := 0; i < cfg.NumPrompts; i++ {
		bodyLen := cfg.SonnetInputLen - cfg.SonnetPrefixLen
		if bodyLen < 0 {
			bodyLen = 0
		}
		body := buildSonnetText(rng, lines, bodyLen)
		prompt := strings.TrimSpace(strings.TrimSpace(prefix) + "\n" + strings.TrimSpace(body))
		samples = append(samples, Sample{
			Prompt:       prompt,
			InputTokens:  cfg.SonnetInputLen,
			OutputTokens: cfg.SonnetOutputLen,
		})
	}
	return samples, nil
}

func buildSonnetText(rng *rand.Rand, lines []string, tokens int) string {
	if tokens <= 0 {
		return ""
	}
	var b strings.Builder
	for EstimateTokens(b.String()) < tokens {
		if b.Len() > 0 {
			b.WriteByte('\n')
		}
		b.WriteString(lines[rng.Intn(len(lines))])
	}
	return b.String()
}

func newSeededRand(seed int64) *rand.Rand {
	return rand.New(rand.NewSource(seed))
}
