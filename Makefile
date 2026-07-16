.PHONY: dev test build-icon backend-test bench-test js-test lint lint-js lint-go

dev:
	npm run dev

test: backend-test bench-test js-test

backend-test:
	cd backend && go test ./...

bench-test:
	cd llm-bench && go test ./...

js-test:
	npm run test:channel-report-intent && npm run test:parameter-diagnosis && npm run test:model-oem-behaviors

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
