.DEFAULT_GOAL := help

.PHONY: help install ci test watch audit clean riak-up riak-down verify

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

ci: ## Clean install from the lockfile (what CI runs)
	npm ci

test: ## Run the test suite
	npm test

watch: ## Re-run tests on file changes
	node --test --watch

audit: ## Check dependencies for known vulnerabilities
	npm audit

clean: ## Remove installed dependencies
	rm -rf node_modules

riak-up: ## Start a local Riak KV node in Docker (pb port 8087)
	docker run -d --name rihawk-riak -p 8087:8087 -p 8098:8098 basho/riak-kv
	@echo "Waiting for Riak to accept protocol buffer connections..."
	@until docker exec rihawk-riak riak-admin test > /dev/null 2>&1; do sleep 2; done
	@echo "Riak is up on 127.0.0.1:8087"

riak-down: ## Stop and remove the local Riak container
	docker rm -f rihawk-riak

verify: ## Round-trip put/get against a local Riak node
	node -e "\
	const rihawk = require('./lib/client'); \
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
