package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

type channelModelLookupMatch struct {
	PlatformID  string  `json:"platform_id"`
	ApiModelID  string  `json:"api_model_id"`
	DisplayName string  `json:"display_name,omitempty"`
	MatchScore  float64 `json:"match_score"`
	MatchedVia  string  `json:"matched_via"`
	LiveSource  string  `json:"live_source"`
}

type channelModelLookupResponse struct {
	Query        string                       `json:"query"`
	Matches      []channelModelLookupMatch    `json:"matches"`
	SourceStatus map[string]string            `json:"source_status,omitempty"`
}

type modelCandidate struct {
	ID          string
	DisplayName string
}

type channelModelListSource struct {
	Key          string
	ListURL      string
	ConfigKeys   []string
	AuthEnv      string
	RequiresAuth bool
	PlatformIDs  []string
}

// ConfigKeys align with platform IDs on the 测评渠道 / 测评模型 pages (see lib/channel-catalog.js).
var channelModelListSources = []channelModelListSource{
	{
		Key:          "openrouter",
		ListURL:      "https://openrouter.ai/api/v1/models",
		ConfigKeys:   []string{"openrouter"},
		AuthEnv:      "OPENROUTER_API_KEY",
		RequiresAuth: false,
		PlatformIDs:  []string{"openrouter"},
	},
	{
		Key:          "siliconflow-cn",
		ListURL:      "https://api.siliconflow.cn/v1/models",
		ConfigKeys:   []string{"siliconflow-cn", "sf-router-cn", "siliconflow"},
		AuthEnv:      "SILICONFLOW_API_KEY",
		RequiresAuth: true,
		PlatformIDs:  []string{"siliconflow-cn", "sf-router-cn"},
	},
	{
		Key:          "siliconflow-com",
		ListURL:      "https://api.siliconflow.com/v1/models",
		ConfigKeys:   []string{"siliconflow-com", "sf-router-com", "siliconflow"},
		AuthEnv:      "SILICONFLOW_API_KEY",
		RequiresAuth: true,
		PlatformIDs:  []string{"siliconflow-com", "sf-router-com"},
	},
	{
		Key:          "deepseek",
		ListURL:      "https://api.deepseek.com/v1/models",
		ConfigKeys:   []string{"deepseek"},
		AuthEnv:      "DEEPSEEK_API_KEY",
		RequiresAuth: true,
		PlatformIDs:  []string{"deepseek"},
	},
	{
		Key:          "moonshot",
		ListURL:      "https://api.moonshot.cn/v1/models",
		ConfigKeys:   []string{"moonshot"},
		AuthEnv:      "MOONSHOT_API_KEY",
		RequiresAuth: true,
		PlatformIDs:  []string{"moonshot"},
	},
	{
		Key:          "zhipu",
		ListURL:      "https://open.bigmodel.cn/api/paas/v4/models",
		ConfigKeys:   []string{"zhipu"},
		AuthEnv:      "ZHIPU_API_KEY",
		RequiresAuth: true,
		PlatformIDs:  []string{"zhipu"},
	},
	{
		Key:          "minimax",
		ListURL:      "https://api.minimaxi.com/v1/models",
		ConfigKeys:   []string{"minimax"},
		AuthEnv:      "MINIMAX_API_KEY",
		RequiresAuth: true,
		PlatformIDs:  []string{"minimax"},
	},
	{
		Key:          "aliyun-cn",
		ListURL:      "https://dashscope.aliyuncs.com/compatible-mode/v1/models",
		ConfigKeys:   []string{"aliyun-cn", "aliyun", "ali"},
		AuthEnv:      "DASHSCOPE_API_KEY",
		RequiresAuth: true,
		PlatformIDs:  []string{"aliyun-cn"},
	},
	{
		Key:          "aliyun-us",
		ListURL:      "https://dashscope-us.aliyuncs.com/compatible-mode/v1/models",
		ConfigKeys:   []string{"aliyun-us"},
		AuthEnv:      "DASHSCOPE_API_KEY",
		RequiresAuth: true,
		PlatformIDs:  []string{"aliyun-us"},
	},
}

type modelListCacheEntry struct {
	models    []modelCandidate
	fetchedAt time.Time
	err       error
}

var (
	modelListCache   sync.Map
	modelListCacheTTL = 10 * time.Minute
	modelListClient   = &http.Client{Timeout: 20 * time.Second}
	numTokenPattern   = regexp.MustCompile(`\d+(?:\.\d+)*`)
)

func (s *Server) handleChannelModelLookup(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/api/channel-model-lookup" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" {
		writeJSON(w, http.StatusOK, channelModelLookupResponse{
			Query:   "",
			Matches: []channelModelLookupMatch{},
		})
		return
	}

	response, err := lookupModelsAcrossChannels(r.Context(), s.root, query)
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func lookupModelsAcrossChannels(ctx context.Context, root, query string) (channelModelLookupResponse, error) {
	queryNorm := normalizeModelName(query)
	queryCompact := compactModelName(query)
	if queryNorm == "" {
		return channelModelLookupResponse{Query: query, Matches: []channelModelLookupMatch{}}, nil
	}

	type sourceResult struct {
		source channelModelListSource
		status string
		models []modelCandidate
	}

	results := make([]sourceResult, len(channelModelListSources))
	var wg sync.WaitGroup
	wg.Add(len(channelModelListSources))

	for i, source := range channelModelListSources {
		i, source := i, source
		go func() {
			defer wg.Done()
			models, status, err := fetchChannelModelList(ctx, root, source)
			if err != nil {
				results[i] = sourceResult{source: source, status: status}
				return
			}
			results[i] = sourceResult{source: source, status: status, models: models}
		}()
	}
	wg.Wait()

	sourceStatus := map[string]string{}
	bestByPlatform := map[string]channelModelLookupMatch{}

	for _, result := range results {
		sourceStatus[result.source.Key] = result.status
		if len(result.models) == 0 {
			continue
		}
		for _, platformID := range result.source.PlatformIDs {
			for _, candidate := range result.models {
				score, via := scoreModelCandidate(queryNorm, queryCompact, candidate)
				if score < 72 {
					continue
				}
				match := channelModelLookupMatch{
					PlatformID:  platformID,
					ApiModelID:  candidate.ID,
					DisplayName: candidate.DisplayName,
					MatchScore:  score,
					MatchedVia:  via,
					LiveSource:  result.source.Key,
				}
				existing, ok := bestByPlatform[platformID]
				if !ok || match.MatchScore > existing.MatchScore {
					bestByPlatform[platformID] = match
				}
			}
		}
	}

	matches := make([]channelModelLookupMatch, 0, len(bestByPlatform))
	for _, match := range bestByPlatform {
		matches = append(matches, match)
	}
	sort.Slice(matches, func(i, j int) bool {
		order := map[string]int{
			"deepseek": 0, "moonshot": 1, "zhipu": 2, "minimax": 3,
			"aliyun-cn": 4, "aliyun-us": 5,
			"siliconflow-cn": 6, "siliconflow-com": 7,
			"openrouter": 8, "sf-router-cn": 9, "sf-router-com": 10,
		}
		oi, oj := order[matches[i].PlatformID], order[matches[j].PlatformID]
		if oi != oj {
			return oi < oj
		}
		return matches[i].MatchScore > matches[j].MatchScore
	})

	return channelModelLookupResponse{
		Query:        query,
		Matches:      matches,
		SourceStatus: sourceStatus,
	}, nil
}

func fetchChannelModelList(ctx context.Context, root string, source channelModelListSource) ([]modelCandidate, string, error) {
	if source.RequiresAuth && resolveProviderAPIKey(root, source.ConfigKeys, source.AuthEnv) == "" {
		return nil, "skipped:no_api_key", nil
	}

	if cached, ok := modelListCache.Load(source.Key); ok {
		entry := cached.(modelListCacheEntry)
		if time.Since(entry.fetchedAt) < modelListCacheTTL {
			if entry.err != nil {
				return nil, "error:cache", entry.err
			}
			return entry.models, "ok:cache", nil
		}
	}

	models, err := downloadModelList(ctx, root, source)
	entry := modelListCacheEntry{models: models, fetchedAt: time.Now(), err: err}
	modelListCache.Store(source.Key, entry)
	if err != nil {
		return nil, "error:fetch", err
	}
	return models, "ok", nil
}

func downloadModelList(ctx context.Context, root string, source channelModelListSource) ([]modelCandidate, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, source.ListURL, nil)
	if err != nil {
		return nil, err
	}
	if token := resolveProviderAPIKey(root, source.ConfigKeys, source.AuthEnv); token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := modelListClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("%s returned %d: %s", source.Key, resp.StatusCode, strings.TrimSpace(string(body)))
	}

	return parseModelList(body)
}

func parseModelList(body []byte) ([]modelCandidate, error) {
	var payload struct {
		Data []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"data"`
		Models []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"models"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}

	rows := payload.Data
	if len(rows) == 0 {
		for _, item := range payload.Models {
			rows = append(rows, struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			}{ID: item.ID, Name: item.Name})
		}
	}

	seen := map[string]bool{}
	out := make([]modelCandidate, 0, len(rows))
	for _, row := range rows {
		id := strings.TrimSpace(row.ID)
		if id == "" || seen[id] {
			continue
		}
		seen[id] = true
		out = append(out, modelCandidate{ID: id, DisplayName: strings.TrimSpace(row.Name)})
	}
	return out, nil
}

func normalizeModelName(value string) string {
	norm := strings.ToLower(strings.TrimSpace(value))
	norm = strings.ReplaceAll(norm, " ", "-")
	norm = strings.ReplaceAll(norm, "_", "-")
	var b strings.Builder
	for _, r := range norm {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '.' || r == '-' || r == '/' {
			b.WriteRune(r)
		}
	}
	norm = b.String()
	for strings.Contains(norm, "--") {
		norm = strings.ReplaceAll(norm, "--", "-")
	}
	return strings.Trim(norm, "-")
}

func compactModelName(value string) string {
	return strings.NewReplacer(".", "", "-", "", "/", "").Replace(normalizeModelName(value))
}

func scoreModelCandidate(queryNorm, queryCompact string, candidate modelCandidate) (float64, string) {
	best := 0.0
	via := ""
	for _, name := range []string{candidate.ID, candidate.DisplayName} {
		if name == "" {
			continue
		}
		score := scoreMatch(queryNorm, queryCompact, name)
		if score > best {
			best = score
			if name == candidate.ID {
				via = "apiModelId"
			} else {
				via = "displayName"
			}
		}
	}
	return best, via
}

func scoreMatch(queryNorm, queryCompact, candidate string) float64 {
	norm := normalizeModelName(candidate)
	compact := compactModelName(candidate)
	if queryNorm == "" || norm == "" {
		return 0
	}
	if queryNorm == norm || queryCompact == compact {
		return 100
	}
	if strings.HasSuffix(norm, queryNorm) || strings.HasSuffix(queryNorm, norm) {
		return 92
	}
	if strings.Contains(compact, queryCompact) || strings.Contains(queryCompact, compact) {
		queryNums := numTokenPattern.FindAllString(queryNorm, -1)
		candNums := numTokenPattern.FindAllString(norm, -1)
		if len(queryNums) > 0 && len(candNums) > 0 && strings.Join(queryNums, "_") != strings.Join(candNums, "_") {
			return 0
		}
		ratio := float64(minInt(len(queryCompact), len(compact))) / float64(maxInt(len(queryCompact), len(compact)))
		if ratio >= 0.72 {
			return 80 + ratio*15
		}
	}
	return 0
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
