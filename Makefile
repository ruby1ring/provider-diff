.PHONY: dev test build-icon backend-test bench-test lint lint-js lint-go

dev:
	npm run dev

test: backend-test bench-test

backend-test:
	cd backend && go test ./...

bench-test:
	cd llm-bench && go test ./...

lint: lint-js lint-go

lint-js:
	npm run lint

lint-go:
	@bad="$$(gofmt -l backend llm-bench)"; \
	if [ -n "$$bad" ]; then echo "gofmt needed for:"; echo "$$bad"; exit 1; fi
	cd backend && go vet ./...
	cd llm-bench && go vet ./...

build-icon:
	bash scripts/build-mac-icon.sh
