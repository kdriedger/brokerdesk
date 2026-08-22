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
make backend     # run AutoBE-generated API (http://localhost:3000)
make frontend    # flutter run -d linux
```

## Milestones

| # | Scope | Status |
|---|---|---|
| M0 | Foundations (repo, DB, skeleton apps) | 🚧 in progress |
| M1 | Auth & org/RBAC + audit | ⬜ |
| M2 | CRM (clients, contacts, tasks, docs) | ⬜ |
| M3 | Carriers & products | ⬜ |
| M4 | Quoting engine | ⬜ |
| M5 | Policy lifecycle | ⬜ |
| M6 | Billing & commissions | ⬜ |
| M7 | Notifications & reporting | ⬜ |
| M8 | Client portal | ⬜ |