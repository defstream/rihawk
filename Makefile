.DEFAULT_GOAL := help

.PHONY: help install hooks ci build test coverage watch lint typecheck check-package audit clean riak-up riak-down verify bench

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

hooks: ## Enable the pre-commit hook (lint + typecheck)
	git config core.hooksPath .githooks
	chmod +x .githooks/pre-commit
	@echo "pre-commit hook enabled"

ci: ## Clean install from the lockfile (what CI runs)
	npm ci

build: ## Compile TypeScript from src/ to dist/
	npm run build

test: ## Build and run the test suite
	npm test

coverage: ## Run the test suite with a coverage report
	npm run test:coverage

watch: ## Re-run tests on file changes (requires a prior build)
	node --test --watch 'build/**/*.test.js' test/esm.test.mjs

lint: ## Run ESLint
	npm run lint

typecheck: ## Type-check src/ and test/ without emitting
	npm run typecheck

check-package: ## Validate exports map and shipped types (publint + attw)
	npm run check:package

audit: ## Check dependencies for known vulnerabilities
	npm audit

clean: ## Remove installed dependencies and build output
	rm -rf node_modules dist build

riak-up: ## Start a local Riak KV node in Docker (pb port 8087)
	docker run -d --name rihawk-riak -p 8087:8087 -p 8098:8098 basho/riak-kv
	@echo "Waiting for Riak to accept protocol buffer connections..."
	@until docker exec rihawk-riak riak-admin test > /dev/null 2>&1; do sleep 2; done
	@echo "Riak is up on 127.0.0.1:8087"

riak-down: ## Stop and remove the local Riak container
	docker rm -f rihawk-riak

verify: build ## Round-trip put/get against a local Riak node (retries until up)
	node scripts/verify.mjs

bench: build ## Throughput benchmark sweeping concurrency against a local Riak node
	node bench/bench.mjs
