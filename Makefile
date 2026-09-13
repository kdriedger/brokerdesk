.PHONY: setup db backend frontend autobe-install autobe-generate autobe-status status

setup: db
	cd frontend && flutter pub get

db:
	docker compose up -d postgres

backend:
	cd backend && DATABASE_URL=$${DATABASE_URL:-postgresql://brokerdesk:brokerdesk@127.0.0.1:5432/brokerdesk} pnpm start

frontend:
	cd frontend && flutter run -d linux

autobe-install:
	@test -d .tools/autobe || (echo "cloning autobe..." && git clone --depth=1 https://github.com/wrtnlabs/autobe .tools/autobe)
	cd .tools/autobe && pnpm install

# Requires OPENCODE_API_KEY in the environment — the Zen key from
# ~/.hermes/.env (OPENCODE_ZEN_API_KEY), NOT the Go key. See
# .autobe-state/opencode.env for the driver's env file.
#
# Verify the model slug before starting a long run: the Zen catalog changes
# (`GET https://opencode.ai/zen/v1/models`). Notes as of 2026-09-10:
#   * free slugs (*-free) only work inside the OpenCode client — a plain API
#     client gets "MissingSessionID ... free tier can only be used in OpenCode"
#   * paid slugs need workspace credits (else CreditsError: insufficient balance)
#   * the Go route (zen/go/v1) also requires x-opencode-session
autobe-generate:
	mkdir -p .autobe-state backend
	cd .tools/autobe && pnpm --filter @autobe/agent run build:prompt
	cd .tools/autobe/test && \
	  OPENCODE_BASE_URL=$${OPENCODE_BASE_URL:-https://opencode.ai/zen/v1} \
	  AUTOBE_MODEL=$${AUTOBE_MODEL:-deepseek-v4-flash} \
	  SEMAPHORE=$${SEMAPHORE:-4} \
	  node --max-old-space-size=$${NODE_HEAP:-8192} -r ts-node/register src/archive/brokerdesk.ts \
	    --model $${AUTOBE_MODEL:-deepseek-v4-flash} \
	    --from $${FROM:-database} \
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