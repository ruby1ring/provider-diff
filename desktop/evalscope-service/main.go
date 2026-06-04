package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type serviceConfig struct {
	Host    string
	Port    string
	Outputs string
	WebDist string
}

func main() {
	cfg, err := parseConfig(os.Args[1:])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
	if err := os.MkdirAll(cfg.Outputs, 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "create outputs dir: %v\n", err)
		os.Exit(1)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"service":   "evalscope",
			"status":    "ok",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	})
	mux.HandleFunc("/api/v1/config", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"outputs_root": cfg.Outputs})
	})
	mux.HandleFunc("/api/v1/eval/benchmarks", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"text":       []any{},
			"multimodal": []any{},
		})
	})
	mux.HandleFunc("/api/v1/eval/invoke", unavailableTask)
	mux.HandleFunc("/api/v1/perf/invoke", unavailableTask)
	mux.HandleFunc("/api/v1/eval/stop", stoppedTask)
	mux.HandleFunc("/api/v1/perf/stop", stoppedTask)
	mux.HandleFunc("/api/v1/eval/log", emptyLog)
	mux.HandleFunc("/api/v1/perf/log", emptyLog)
	mux.HandleFunc("/api/v1/eval/progress", idleProgress)
	mux.HandleFunc("/api/v1/perf/progress", idleProgress)
	mux.HandleFunc("/api/v1/eval/report", emptyHTML)
	mux.HandleFunc("/api/v1/perf/report", emptyHTML)
	mux.HandleFunc("/api/v1/reports/scan", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"reports": []any{}})
	})
	mux.HandleFunc("/api/v1/reports/list", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"items":       []any{},
			"reports":     []any{},
			"total":       0,
			"page":        1,
			"page_size":   20,
			"models":      []any{},
			"datasets":    []any{},
			"score_range": []any{},
		})
	})
	mux.HandleFunc("/api/v1/reports/load", notFoundJSON)
	mux.HandleFunc("/api/v1/reports/load_multi", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"reports": []any{}})
	})
	mux.HandleFunc("/api/v1/reports/dataframe", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"columns": []any{}, "rows": []any{}})
	})
	mux.HandleFunc("/api/v1/reports/predictions", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"predictions": []any{}})
	})
	mux.HandleFunc("/api/v1/reports/analysis", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"analysis": ""})
	})
	mux.HandleFunc("/api/v1/reports/html", emptyHTML)
	mux.HandleFunc("/api/v1/reports/chart", emptyHTML)
	mux.HandleFunc("/api/v1/reports/media/file", notFoundJSON)
	mux.HandleFunc("/", staticHandler(cfg.WebDist))

	addr := cfg.Host + ":" + cfg.Port
	fmt.Printf("EvalScope lite service listening on http://%s/dashboard\n", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		fmt.Fprintf(os.Stderr, "listen: %v\n", err)
		os.Exit(1)
	}
}

func parseConfig(args []string) (serviceConfig, error) {
	if len(args) > 0 && args[0] == "service" {
		args = args[1:]
	}
	exe, err := os.Executable()
	if err != nil {
		return serviceConfig{}, err
	}
	base := filepath.Dir(exe)
	cfg := serviceConfig{
		Host:    "127.0.0.1",
		Port:    "9000",
		Outputs: filepath.Join(base, "outputs"),
		WebDist: filepath.Join(base, "web", "dist"),
	}
	fs := flag.NewFlagSet("evalscope-service", flag.ContinueOnError)
	fs.StringVar(&cfg.Host, "host", cfg.Host, "host to bind")
	fs.StringVar(&cfg.Port, "port", cfg.Port, "port to bind")
	fs.StringVar(&cfg.Outputs, "outputs", cfg.Outputs, "outputs directory")
	if err := fs.Parse(args); err != nil {
		return serviceConfig{}, err
	}
	if cfg.Port == "" {
		return serviceConfig{}, errors.New("port is required")
	}
	return cfg, nil
}

func staticHandler(webDist string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" || path == "dashboard" {
			path = "index.html"
		}
		file := filepath.Join(webDist, filepath.Clean(path))
		if !strings.HasPrefix(file, webDist) {
			http.NotFound(w, r)
			return
		}
		if stat, err := os.Stat(file); err != nil || stat.IsDir() {
			file = filepath.Join(webDist, "index.html")
		}
		if ext := filepath.Ext(file); ext != "" {
			if typ := mime.TypeByExtension(ext); typ != "" {
				w.Header().Set("Content-Type", typ)
			}
		}
		http.ServeFile(w, r, file)
	}
}

func unavailableTask(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusNotImplemented, map[string]any{
		"status":  "error",
		"error":   "ProviderX bundled EvalScope lite service only serves dashboard and report browsing APIs.",
		"message": "完整 eval/perf 任务执行需要单独安装 EvalScope Python 环境。",
	})
}

func stoppedTask(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"status": "stopped"})
}

func emptyLog(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"text":        "",
		"head_line":   0,
		"tail_line":   0,
		"total_lines": 0,
	})
}

func idleProgress(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":   "idle",
		"progress": 0,
	})
}

func emptyHTML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte("<!doctype html><meta charset=\"utf-8\"><body></body>"))
}

func notFoundJSON(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusNotFound, map[string]any{"error": "not found"})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
