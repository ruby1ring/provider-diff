package dataset

import "math/rand"

func Random(cfg Config) ([]Sample, error) {
	rng := rand.New(rand.NewSource(cfg.Seed))
	prefix := placeholderPrompt(cfg.RandomPrefixLen)
	samples := make([]Sample, 0, cfg.NumPrompts)
	for i := 0; i < cfg.NumPrompts; i++ {
		inputTokens := sampleCount(rng, cfg.RandomInputLen, cfg.RandomRangeRatio)
		outputTokens := sampleCount(rng, cfg.RandomOutputLen, cfg.RandomRangeRatio)
		bodyTokens := inputTokens - cfg.RandomPrefixLen
		if bodyTokens < 0 {
			bodyTokens = 0
		}
		prompt := placeholderPrompt(bodyTokens)
		if prefix != "" {
			if prompt != "" {
				prompt = prefix + " " + prompt
			} else {
				prompt = prefix
			}
		}
		samples = append(samples, Sample{
			Prompt:       prompt,
			InputTokens:  inputTokens,
			OutputTokens: outputTokens,
		})
	}
	return samples, nil
}
