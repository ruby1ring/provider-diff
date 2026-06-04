package metrics

import (
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"provider-diff/llm-bench/internal/benchclient"
	"provider-diff/llm-bench/internal/dataset"
)

type Summary struct {
	BenchmarkDuration    float64            `json:"benchmark_duration"`
	Completed            int                `json:"completed"`
	Failed               int                `json:"failed"`
	TotalInputTokens     int                `json:"total_input_tokens"`
	TotalOutputTokens    int                `json:"total_output_tokens"`
	RequestThroughput    float64            `json:"request_throughput"`
	OutputThroughput     float64            `json:"output_throughput"`
	TotalTokenThroughput float64            `json:"total_token_throughput"`
	Goodput              *float64           `json:"goodput"`
	MetricValues         map[string]float64 `json:"-"`
	PercentileMetrics    []string           `json:"-"`
	MetricPercentiles    []float64          `json:"-"`
	Metadata             map[string]string  `json:"metadata"`
	Note                 string             `json:"note"`
}

type SLO map[string]float64

func Aggregate(results []benchclient.Result, duration time.Duration, percentileMetrics []string, percentiles []float64, slo SLO, metadata map[string]string) Summary {
	if duration <= 0 {
		duration = time.Nanosecond
	}
	var ttfts []float64
	var tpots []float64
	var itls []float64
	var e2els []float64
	successful := 0
	failed := 0
	inputTokens := 0
	outputTokens := 0
	good := 0
	for _, result := range results {
		if !result.Success {
			failed++
			continue
		}
		successful++
		inputTokens += result.InputTokens
		outputTokens += result.OutputTokens
		ttft := ms(result.TTFT())
		e2el := ms(result.E2EL())
		ttfts = append(ttfts, ttft)
		e2els = append(e2els, e2el)
		tpot := 0.0
		if result.OutputTokens > 1 && !result.FirstToken.IsZero() {
			tpot = ms(result.End.Sub(result.FirstToken)) / float64(result.OutputTokens-1)
			tpots = append(tpots, tpot)
		}
		for i := 1; i < len(result.TokenTimes); i++ {
			itls = append(itls, ms(result.TokenTimes[i].Sub(result.TokenTimes[i-1])))
		}
		if satisfiesSLO(slo, map[string]float64{"ttft": ttft, "tpot": tpot, "e2el": e2el}) {
			good++
		}
	}
	seconds := duration.Seconds()
	values := map[string]float64{}
	addMetricValues(values, "ttft", ttfts, percentiles)
	addMetricValues(values, "tpot", tpots, percentiles)
	addMetricValues(values, "itl", itls, percentiles)
	addMetricValues(values, "e2el", e2els, percentiles)
	var goodput *float64
	if len(slo) > 0 {
		value := float64(good) / seconds
		goodput = &value
	}
	return Summary{
		BenchmarkDuration:    seconds,
		Completed:            successful,
		Failed:               failed,
		TotalInputTokens:     inputTokens,
		TotalOutputTokens:    outputTokens,
		RequestThroughput:    float64(successful) / seconds,
		OutputThroughput:     float64(outputTokens) / seconds,
		TotalTokenThroughput: float64(inputTokens+outputTokens) / seconds,
		Goodput:              goodput,
		MetricValues:         values,
		PercentileMetrics:    percentileMetrics,
		MetricPercentiles:    percentiles,
		Metadata:             metadata,
		Note:                 dataset.TokenApproximationNote,
	}
}

func addMetricValues(values map[string]float64, name string, samples []float64, percentiles []float64) {
	values["mean_"+name+"_ms"] = mean(samples)
	values["median_"+name+"_ms"] = percentile(samples, 50)
	for _, p := range percentiles {
		values[percentileKey(p, name)] = percentile(samples, p)
	}
}

func percentileKey(p float64, name string) string {
	if math.Mod(p, 1) == 0 {
		return "p" + strconv.FormatInt(int64(p), 10) + "_" + name + "_ms"
	}
	return "p" + strings.ReplaceAll(floatToString(p), ".", "_") + "_" + name + "_ms"
}

func floatToString(value float64) string {
	return strconvFormatFloat(value)
}

func mean(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	sum := 0.0
	for _, value := range values {
		sum += value
	}
	return sum / float64(len(values))
}

func percentile(values []float64, p float64) float64 {
	if len(values) == 0 {
		return 0
	}
	copied := append([]float64(nil), values...)
	sort.Float64s(copied)
	if len(copied) == 1 {
		return copied[0]
	}
	if p < 0 {
		p = 0
	}
	if p > 100 {
		p = 100
	}
	rank := (p / 100) * float64(len(copied)-1)
	low := int(math.Floor(rank))
	high := int(math.Ceil(rank))
	if low == high {
		return copied[low]
	}
	weight := rank - float64(low)
	return copied[low]*(1-weight) + copied[high]*weight
}

func ms(duration time.Duration) float64 {
	return float64(duration) / float64(time.Millisecond)
}

func satisfiesSLO(slo SLO, values map[string]float64) bool {
	if len(slo) == 0 {
		return false
	}
	for key, maxValue := range slo {
		if values[strings.ToLower(key)] > maxValue {
			return false
		}
	}
	return true
}
