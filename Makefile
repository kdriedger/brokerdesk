.PHONY: setup db backend frontend autobe-install status

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

status:
	docker compose ps