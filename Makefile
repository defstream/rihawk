.DEFAULT_GOAL := help

.PHONY: help install ci build test coverage watch lint typecheck audit clean riak-up riak-down verify

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

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

verify: build ## Round-trip put/get against a local Riak node
	node -e "\
	const rihawk = require('./dist/client'); \
	const c = rihawk({ connectionString: '127.0.0.1:8087' }); \
	c.put('rihawk_verify', 'k1', { ok: true }) \
	  .on('error', (e) => { console.error('PUT FAILED:', e.message); process.exit(1); }) \
	  .on('data', (d) => console.log('put:', d.bucket, d.key)) \
	  .on('end', () => { \
	    c.get('rihawk_verify', 'k1') \
	      .on('error', (e) => { console.error('GET FAILED:', e.message); process.exit(1); }) \
	      .on('data', (d) => console.log('get:', JSON.stringify(d.content[0].value))) \
	      .on('end', () => c.end().then(() => console.log('verify: OK'))); \
	  });"
