package reporter

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"provider-diff/llm-bench/internal/metrics"
)

func Print(summary metrics.Summary) {
	fmt.Println("============ Serving Benchmark Result ============")
	fmt.Printf("Successful requests:     %d\n", summary.Completed)
	fmt.Printf("Failed requests:         %d\n", summary.Failed)
	fmt.Printf("Benchmark duration (s):  %.2f\n", summary.BenchmarkDuration)
	fmt.Printf("Total input tokens:      %d\n", summary.TotalInputTokens)
	fmt.Printf("Total generated tokens:  %d\n", summary.TotalOutputTokens)
	fmt.Printf("Request throughput (req/s):          %.2f\n", summary.RequestThroughput)
	fmt.Printf("Output token throughput (tok/s):     %.2f\n", summary.OutputThroughput)
	fmt.Printf("Total Token throughput (tok/s):      %.2f\n", summary.TotalTokenThroughput)
	if summary.Goodput != nil {
		fmt.Printf("Goodput (req/s):                      %.2f\n", *summary.Goodput)
	}
	for _, name := range summary.PercentileMetrics {
		printMetricSection(name, summary)
	}
	fmt.Println("==================================================")
}

func Save(summary metrics.Summary, dir, filename string) (string, error) {
	if strings.TrimSpace(dir) == "" {
		dir = "."
	}
	if strings.TrimSpace(filename) == "" {
		filename = "benchmark-" + time.Now().Format("20060102-150405") + ".json"
	}
	if filepath.Ext(filename) == "" {
		filename += ".json"
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	path := filepath.Join(dir, filename)
	data, err := json.MarshalIndent(toJSON(summary), "", "  ")
	if err != nil {
		return "", err
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return "", err
	}
	return path, nil
}

func toJSON(summary metrics.Summary) map[string]any {
	out := map[string]any{
		"benchmark_duration":     round(summary.BenchmarkDuration),
		"completed":              summary.Completed,
		"failed":                 summary.Failed,
		"total_input_tokens":     summary.TotalInputTokens,
		"total_output_tokens":    summary.TotalOutputTokens,
		"request_throughput":     round(summary.RequestThroughput),
		"output_throughput":      round(summary.OutputThroughput),
		"total_token_throughput": round(summary.TotalTokenThroughput),
		"goodput":                summary.Goodput,
		"metadata":               summary.Metadata,
		"note":                   summary.Note,
	}
	for key, value := range summary.MetricValues {
		out[key] = round(value)
	}
	return out
}

func printMetricSection(name string, summary metrics.Summary) {
	title := map[string]string{
		"ttft": "---------------Time to First Token----------------",
		"tpot": "-----Time per Output Token (excl. 1st token)------",
		"itl":  "---------------Inter-token Latency----------------",
		"e2el": "----------------End-to-end Latency----------------",
	}[name]
	if title == "" {
		return
	}
	upper := strings.ToUpper(name)
	fmt.Println(title)
	fmt.Printf("Mean %s (ms):    %.2f\n", upper, summary.MetricValues["mean_"+name+"_ms"])
	fmt.Printf("Median %s (ms):  %.2f\n", upper, summary.MetricValues["median_"+name+"_ms"])
	for _, p := range summary.MetricPercentiles {
		key := percentileKey(p, name)
		label := "P" + percentileLabel(p)
		fmt.Printf("%s %s (ms):     %.2f\n", label, upper, summary.MetricValues[key])
	}
}

func percentileKey(p float64, name string) string {
	text := percentileLabel(p)
	if strings.Contains(text, ".") {
		text = strings.ReplaceAll(text, ".", "_")
	}
	return "p" + text + "_" + name + "_ms"
}

func percentileLabel(value float64) string {
	if math.Mod(value, 1) == 0 {
		return strconv.FormatInt(int64(value), 10)
	}
	return strings.TrimSuffix(strings.TrimSuffix(strconv.FormatFloat(value, 'f', 4, 64), "0"), ".")
}

func round(value float64) float64 {
	return float64(int(value*100+0.5)) / 100
}
