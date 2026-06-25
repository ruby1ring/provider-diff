.PHONY: dev test build-icon backend-test bench-test

dev:
	npm run dev

test: backend-test bench-test

backend-test:
	cd backend && go test ./...

bench-test:
	cd llm-bench && go test ./...

build-icon:
	bash scripts/build-mac-icon.sh
