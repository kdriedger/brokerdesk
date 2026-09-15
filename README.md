# BrokerDesk 🦾

Modern insurance-broker platform: client CRM → carrier product catalog → quoting →
policy write-up → renewals, billing & commissions. Cheap, modern alternative to
Applied Epic / AMS360.

- **Backend:** AutoBE-generated (TypeScript + NestJS + Prisma + typia) → `backend/`
- **Frontend:** Flutter / Dart → `frontend/`
- **Database:** PostgreSQL

See **[PLAN.md](PLAN.md)** for the full research summary, feature inventory,
data model, API surface, and milestone roadmap.

## Quickstart (dev)

```bash
make setup       # docker compose up -d postgres, install deps
make backend     # Nest API on http://127.0.0.1:37001
# in another shell:
cd backend && pnpm seed:demo   # maya.chen@northshore.broker / demo
make frontend    # flutter run -d linux (hits the API, not mock)
```

## Milestones

| # | Scope | Status |
|---|---|---|
| M0 | Foundations (repo, DB, skeleton apps) | ✅ |
| M1 | Auth & org/RBAC + audit | 🚧 thin live path |
| M2 | CRM (clients, contacts, tasks, docs) | 🚧 list/create |
| M3 | Carriers & products | 🚧 list/create |
| M4 | Quoting engine | 🚧 quote → price → submit |
| M5 | Policy lifecycle | 🚧 bind |
| M6 | Billing & commissions | 🚧 seed rows |
| M7 | Notifications & reporting | ⬜ |
| M8 | Client portal | ⬜ |