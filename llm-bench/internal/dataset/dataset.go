package dataset

import (
	"errors"
	"math"
	"math/rand"
	"strings"
)

const TokenApproximationNote = "Token counts are estimated using char/4 approximation, not a real tokenizer."

type Config struct {
	Name              string
	Path              string
	NumPrompts        int
	RandomInputLen    int
	RandomOutputLen   int
	RandomRangeRatio  float64
	RandomPrefixLen   int
	SonnetInputLen    int
	SonnetOutputLen   int
	SonnetPrefixLen   int
	ShareGPTOutputLen int
	Seed              int64
}

type Sample struct {
	Prompt       string `json:"prompt"`
	InputTokens  int    `json:"input_tokens"`
	OutputTokens int    `json:"output_tokens"`
}

func Load(cfg Config) ([]Sample, error) {
	if cfg.NumPrompts <= 0 {
		return nil, errors.New("num-prompts must be positive")
	}
	switch strings.ToLower(strings.TrimSpace(cfg.Name)) {
	case "", "random":
		return Random(cfg)
	case "sharegpt":
		return ShareGPT(cfg)
	case "sonnet":
		return Sonnet(cfg)
	default:
		return nil, errors.New("dataset-name must be one of random, sharegpt, sonnet")
	}
}

func EstimateTokens(text string) int {
	runes := len([]rune(text))
	if runes == 0 {
		return 0
	}
	return int(math.Ceil(float64(runes) / 4.0))
}

func sampleCount(rng *rand.Rand, mean int, ratio float64) int {
	if mean <= 0 {
		return 1
	}
	if ratio < 0 {
		ratio = 0
	}
	if ratio > 1 {
		ratio = 1
	}
	low := int(math.Floor(float64(mean) * (1 - ratio)))
	high := int(math.Ceil(float64(mean) * (1 + ratio)))
	if low < 1 {
		low = 1
	}
	if high < low {
		high = low
	}
	return low + rng.Intn(high-low+1)
}

func placeholderPrompt(tokens int) string {
	if tokens <= 0 {
		return ""
	}
	var b strings.Builder
	b.Grow(tokens * 5)
	for i := 0; i < tokens; i++ {
		if i > 0 {
			b.WriteByte(' ')
		}
		b.WriteString("tok")
	}
	return b.String()
}

func chooseSamples(rng *rand.Rand, samples []Sample, n int) []Sample {
	if len(samples) == 0 || n <= 0 {
		return nil
	}
	out := make([]Sample, 0, n)
	for len(out) < n {
		out = append(out, samples[rng.Intn(len(samples))])
	}
	return out
}
