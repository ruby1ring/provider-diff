package dataset

import (
	"encoding/json"
	"errors"
	"os"
	"strings"
)

type shareGPTRecord struct {
	Conversations []shareGPTMessage `json:"conversations"`
}

type shareGPTMessage struct {
	From  string `json:"from"`
	Value string `json:"value"`
}

func ShareGPT(cfg Config) ([]Sample, error) {
	if strings.TrimSpace(cfg.Path) == "" {
		return nil, errors.New("dataset-path is required for sharegpt")
	}
	data, err := os.ReadFile(cfg.Path)
	if err != nil {
		return nil, err
	}
	var records []shareGPTRecord
	if err := json.Unmarshal(data, &records); err != nil {
		return nil, err
	}
	filtered := make([]Sample, 0, len(records))
	for _, record := range records {
		var human, assistant string
		for _, message := range record.Conversations {
			switch strings.ToLower(strings.TrimSpace(message.From)) {
			case "human", "user":
				if human == "" {
					human = strings.TrimSpace(message.Value)
				}
			case "gpt", "assistant":
				if human != "" && assistant == "" {
					assistant = strings.TrimSpace(message.Value)
				}
			}
			if human != "" && assistant != "" {
				break
			}
		}
		inputTokens := EstimateTokens(human)
		outputTokens := EstimateTokens(assistant)
		if cfg.ShareGPTOutputLen > 0 {
			outputTokens = cfg.ShareGPTOutputLen
		}
		if inputTokens > 0 && outputTokens > 0 {
			filtered = append(filtered, Sample{
				Prompt:       human,
				InputTokens:  inputTokens,
				OutputTokens: outputTokens,
			})
		}
	}
	if len(filtered) == 0 {
		return nil, errors.New("sharegpt dataset has no usable prompt/output pairs")
	}
	return chooseSamples(newSeededRand(cfg.Seed), filtered, cfg.NumPrompts), nil
}
