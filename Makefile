.PHONY: setup db backend frontend autobe-install autobe-generate autobe-status status

setup: db
	cd frontend && flutter pub get

db:
	docker compose up -d postgres

backend:
	cd backend && pnpm dev

frontend:
	cd frontend && flutter run -d linux

autobe-install:
	@test -d .tools/autobe || (echo "cloning autobe..." && git clone --depth=1 https://github.com/wrtnlabs/autobe .tools/autobe)
	cd .tools/autobe && pnpm install

# Requires OPENCODE_API_KEY in the environment (OpenCode Go).
# Do NOT use --transpile-only — typia transformers must run.
autobe-generate:
	mkdir -p .autobe-state backend
	cd .tools/autobe && pnpm --filter @autobe/agent run build:prompt
	cd .tools/autobe/test && \
	  OPENCODE_BASE_URL=$${OPENCODE_BASE_URL:-https://opencode.ai/zen/go/v1} \
	  AUTOBE_MODEL=$${AUTOBE_MODEL:-ox-alpha-free} \
	  SEMAPHORE=$${SEMAPHORE:-4} \
	  node --max-old-space-size=8192 -r ts-node/register src/archive/brokerdesk.ts \
	    --model $${AUTOBE_MODEL:-ox-alpha-free} \
	    --from $${FROM:-analyze} \
	    --to $${TO:-realize} \
	    --semaphore $${SEMAPHORE:-4}

autobe-status:
	@tail -n 40 .autobe-state/generate.log 2>/dev/null || echo "no generate.log yet"
	@echo "---"
	@ls -la backend 2>/dev/null | head || true
	@ls .autobe-state/phases 2>/dev/null || true

status:
	docker compose ps
	@$(MAKE) autobe-status