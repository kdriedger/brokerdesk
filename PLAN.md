# BrokerDesk — Insurance Broker Policy Platform

**Status:** Draft v0.1 · **Date:** 2026-08-22 · **Owner:** Kevin (with LinuxClaw)
**Repo:** `~/src/brokerdesk`

---

## 1. Vision & Problem Statement

Insurance brokers write policies for clients using products from large insurance
providers (carriers). The software that does this well today — Applied Epic,
AMS360, EZLynx-class agency management systems — is expensive (thousands of
$/month + per-user licensing), dated, and overkill for small-to-mid brokerages.

**BrokerDesk** is a modern, affordable, API-first alternative that lets a broker:

1. **Manage client interactions** (CRM: clients, contacts, tasks, documents, notes)
2. **Connect clients to available products** from carriers (product catalog +
   eligibility matching)
3. **Write up policies** (quote → bind → issue → policy record → renewals)
4. **Enumerate policies** (portfolio views, expiry lists, reporting)

**Differentiators vs. incumbents:** modern UX (Flutter, mobile + desktop + web),
per-brokerage flat pricing, open API + type-safe SDK, AI-friendly codebase that
brokers' developers can extend, no legacy lock-in.

---

## 2. Research Summary — Existing Software (Competitive Scan)

| Product | Vendor | Core Strengths | Known Gaps / Cost |
|---|---|---|---|
| **Applied Epic** | Applied Systems | Deep carrier integrations (downloads), enterprise policy/commission mgmt, custom reporting | Steep learning curve, very expensive, legacy UX |
| **AMS360** | Vertafore | Mature policy lifecycle, accounting & commissions, carrier download | Dated interface, limited customization, enterprise pricing |
| **EZLynx** | EZLynx | Comparative rating, CRM, marketing automation, document storage | Reporting depth varies, cost scales with usage |
| **NowCerts** | NowCerts | Modern cloud UX, affordable for SMBs, renewals + reminders, CRM | Fewer legacy carrier integrations |
| **Insly** | Insly | Policy admin + endorsements, quoting/underwriting workflow, API-first, multi-currency | Configuration requires planning; weak for tiny agencies |
| **AgencyBloc** | AgencyBloc | Health/life/benefits focus, compliance tracking, commission mgmt | Limited for P&C-heavy agencies |
| **BriteCore** | BriteCore | Cloud-native, policy + claims, billing, workflow automation, API-first | Implementation effort high; mid-market+ |
| **BindHQ** | BindHQ | Clean UI, automated renewals, commissions, built-in CRM | Fewer advanced enterprise features |
| **Sapiens AgentConnect** | Sapiens | Enterprise distribution, agent lifecycle, compliance | Overkill/costly for SMBs |
| **BrokerEdge** | Damco | Policy mgmt, quoting, renewals, service automation | Enterprise-oriented |

**Feature categories every serious IBMS/AMS has** (the de-facto requirements list):

- Client & prospect CRM (contacts, activities, notes, pipeline)
- Policy lifecycle management (bind, issue, endorse, cancel, renew)
- Quoting / comparative rating
- Carrier connectivity (downloads, submissions)
- Commission tracking & accounting/billing
- Document management (ACORD forms, COIs, schedules)
- Automated renewals & reminders
- Compliance: audit trails, role-based access, retention, licensing alerts
- Reporting & dashboards
- Client self-service portal
- API / integrations

**Pricing reality:** Applied Epic ≈ $6k–$20k+/yr per agency seat-dependent; AMS360
similar; even SMB tools run $100–$500/seat/mo. BrokerDesk targets a flat,
per-brokerage price with unlimited seats — a fraction of incumbents.

---

## 3. Target Users & Personas

| Persona | Needs |
|---|---|
| **Agency Admin** | Users, roles, carriers, products, commission schedules, reporting, compliance |
| **Producer / Broker** | Clients, quotes, submissions, policy issuance, renewals, pipeline |
| **CSR / Service rep** | Client servicing, endorsements, documents, tasks |
| **Client (self-service portal)** | View policies/documents, request changes, upload docs, e-sign |

Multi-tenant: every record belongs to exactly one **Organization** (brokerage).

---

## 4. Feature Inventory (Modules)

### M-AUTH — Identity & Access
- Org-scoped accounts, JWT auth (+ refresh), password reset, e-mail verification
- Roles: `ADMIN`, `PRODUCER`, `CSR`, `CLIENT` (portal)
- Permission checks per route; audit log of all mutations

### M-CRM — Clients & Interactions
- Clients (individual / business), contacts, addresses, tags, status, notes
- Activities (calls, e-mails, meetings) + timeline feed
- Tasks & follow-ups with due dates and assignees
- Client documents (attachments, versioned)
- Pipeline: prospect → quoted → bound → active → lost

### M-CARRIERS — Providers & Products
- Carrier directory: name, code, AM Best rating, contacts, appointment info
- Product catalog per carrier with line-of-business (Auto, Home, Commercial,
  Life, Health, Liability, Marine…)
- Products carry: eligibility rules (JSON), rating inputs schema, commission
  schedule, forms list, active/inactive
- Broker/carrier licensing & appointment expiry tracking (compliance)

### M-QUOTING — Connect Clients to Products
- Create quote from client + one or more products
- Dynamic rating inputs per product (coverage options, limits, deductibles,
  risk questions) with server-validated schema
- Premium calculation: manual entry + formula engine (rate × units, tiered
  tables) — carrier APIs plug in later
- Comparative quote view across carriers
- Quote states: `draft → priced → submitted → bound → declined → expired`
- Quote documents (proposal/schedule) generated from templates
- Submission log to carriers (status, carrier ref #, messages)

### M-POLICY — Writing Up Policies
- Bind quote → create policy with policy number (carrier + org numbering),
  term dates, statuses `active / cancelled / expired / lapsed`
- Coverage schedules with limits & premiums per line item
- Endorsements (mid-term changes, premium deltas, effective dates)
- Renewals: automated renewal offers (n-days before expiry), accept/renew or
  non-renew, renewal history per policy
- Cancellation / reinstatement workflows with reasons & effective dates
- Policy documents (schedules, COIs, certificates, full policy PDFs)

### M-BILLING — Finance
- Invoices per policy/payment plan (annual, semi, monthly)
- Payments (method, date, reference) & outstanding balances
- Commission tracking: carrier → agency split, producer split, rates, status
  (`due / paid`), statement export
- Broker fee lines (where applicable)

### M-DOCS — Document Engine
- Template engine (variable substitution + repeating sections) for:
  quote proposals, policy schedules, COIs, certificates, ACORD-style forms
- Rendered output exported as PDF (server-side)
- Document store: local disk / S3-compatible, checksums, versioning, retention
- E-signature placeholder (record of signer, timestamp; provider swap-in later)

### M-OPS — Compliance, Reporting, Notifications
- Audit log (who, what, when, before/after)
- Notifications: renewal alerts, task due, submission status — in-app + e-mail
- Dashboards: pipeline, new business, expiries, revenue by carrier/producer,
  active portfolio
- Reports: expiry list, production report, commission statement, book of business

---

## 5. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Backend** | **AutoBE-generated**: TypeScript + NestJS + Prisma + typia (typed DTOs, OpenAPI spec) | Kevin's requirement; AI-agent-built, 100%-compilable guarantee, E2E tests, type-safe SDK out of the box |
| **Database** | PostgreSQL 16+ (local PG 18 available; Docker for dev) | Relational fit, Prisma first-class |
| **Auth** | JWT (access+refresh), bcrypt/argon2, org-scoped guards | Simple, standard, SWA-able |
| **File storage** | Local disk (dev) → S3-compatible (prod), signed URLs | Cheapest path to start |
| **PDF** | `pdfkit`/`puppeteer` or typst for template → PDF | Client-friendly documents |
| **Frontend** | **Flutter (Dart)** — responsive: Android/iOS/Linux desktop/Web | Kevin's requirement; one codebase for broker desktop app + client portal |
| **State mgmt** | Riverpod (or Bloc) | Pragmatic, testable |
| **API client** | AutoBE-generated typed SDK (typia fetch) — hand-rolled Dart client mirroring OpenAPI spec | Zero drift between FE/BE |
| **Infra/dev** | Docker compose (pg + backend), git, Makefile, seed data | Reproducible |

**Architecture**

```
┌────────────────────────────┐        ┌──────────────────────────────┐
│  Flutter App (broker)      │        │  Flutter App (client portal) │
│  - Riverpod state          │        └──────────────────────────────┘
└─────────────┬──────────────┘                    │
              │ HTTPS + JSON (typed SDK)          │
┌─────────────▼──────────────────────────────────▼──────────────────┐
│                    NestJS API (AutoBE-generated)                  │
│  Controllers (typia-validated) → Providers (business logic)      │
│  Guards: JWT + Org + Role          Interceptors: audit, logging  │
├───────────────────────────────────────────────────────────────────┤
│  Prisma ORM  →  PostgreSQL 18        File store → PDF generator  │
└───────────────────────────────────────────────────────────────────┘
```

---

## 6. Data Model (Core Entities — Prisma)

```
Organization 1─* User            (role, email, active)
Organization 1─* Client          (type individual|business, status, tags)
Client       1─* Contact / Address / Activity / Task / Document
Organization 1─* Carrier
Carrier      1─* Product         (lineOfBusiness, eligibility Json, ratingSchema Json, commissionRate)
Product      1─* CoverageItem
Client       1─* Quote           (status, effectiveDate, totalPremium)
Quote        1─* QuoteLine       (product, coverages Json, premium)
Quote        1─* Submission      (carrier, status, carrierRef, messages)
Quote        1─* Policy          (policyNumber, carrierPolicyNumber, termStart/End, status)
Policy       1─* CoverageItem / Endorsement / Renewal / Invoice / Commission / Document
Invoice      1─* Payment
User         1─* Task / Notification / AuditLog (entity, action, before/after Json)
Organization 1─* DocumentTemplate (kind, templateBody, variables)
```

All queries scoped by `organizationId` (multi-tenant). Soft-delete + audit for
compliance-critical entities (Policy, Quote, Client).

---

## 7. API Surface (Modules → Routes)

| Module | Endpoints (REST, `/api/v1/...`) |
|---|---|
| auth | POST /auth/register, /auth/login, /auth/refresh, /auth/logout, POST /auth/reset-password |
| users | GET/POST /users, PATCH/DELETE /users/:id, PATCH /users/:id/role |
| clients | CRUD /clients, GET /clients/:id/timeline, POST /clients/:id/contacts, /activities, /tasks, /documents |
| carriers | CRUD /carriers (+products nested) |
| products | CRUD /products, GET /products/eligible?clientId=&lineOfBusiness= |
| quotes | POST /quotes (draft), PATCH /quotes/:id (price), POST /quotes/:id/submit, POST /quotes/:id/bind, POST /quotes/:id/documents |
| policies | GET /policies (filter: expiring, byClient, byCarrier), POST /policies/:id/endorsements, /renewals, /cancellations, /documents |
| billing | CRUD /invoices, POST /invoices/:id/payments, GET /commissions, POST /commissions/:id/status, GET /statements |
| documents | CRUD /templates, POST /documents/render (template+data→PDF), GET /documents/:id |
| notifications | GET /notifications, POST /notifications/mark-read; e-mail jobs |
| dashboard | GET /dashboard/summary, /dashboard/expiries, /dashboard/revenue-by-producer, /reports/... |
| audit | GET /audit-logs (org-scoped, filterable) |

---

## 8. Implementation Roadmap

> Order chosen so every milestone is independently shippable & demoable.
> Backend is *generated by AutoBE* (requirements analysis → ERD → API spec →
> E2E tests → implementation); we review each generated stage before moving on.

| Milestone | Scope | Acceptance Criteria |
|---|---|---|
| **M0 — Foundations** | Repo, docker-compose (pg), AutoBE backend skeleton, Flutter app skeleton, CI lint | `docker compose up` boots; `flutter run` boots; backend `/health` responds; OpenAPI spec generated |
| **M1 — Auth & Org** | Register org + admin, login/refresh, RBAC guards, audit log | E2E: admin creates producer; producer can't manage users; every mutation audit-logged |
| **M2 — CRM** | Clients, contacts, activities, tasks, documents, dashboard | E2E: full client lifecycle; timeline shows activity; search/filter works |
| **M3 — Carriers & Products** | Carrier CRUD, product catalog, eligibility matching, appointment expiry alerts | Product eligibility returns only valid products for a client; commissions inherited |
| **M4 — Quoting** | Quote builder, rating inputs + formula engine, comparative quotes, submissions, proposal PDF | Quote goes draft→priced→submitted→bound; PDF renders from template |
| **M5 — Policy Lifecycle** | Bind→policy, coverages, endorsements, cancellation, renewals (offer→accept), policy docs | Policy number assigned; renewal generated from template; endorsement changes premium |
| **M6 — Billing & Commissions** | Invoices, payment plans, payments, commission splits, statements | Balances correct; producer statement sums match commissions |
| **M7 — Ops** | Notifications (in-app+email), expiry reports, revenue dashboards, audit UI | Renewal alert fires at configured D-days; reports match raw data |
| **M8 — Client Portal & Polish** | Client login, view policies/docs, request endorsement, e-sign placeholder | Portal read-only + request flows; roles enforced end-to-end |

**Out of scope (v1):** real-time carrier API integrations (rate/download) — abstracted
behind submission/import interfaces; claims management; full ACORD XML; payment
gateway (record-only).

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| AutoBE output needs fixing | It generates E2E tests + compilers validate; we review per stage; nestjs code is standard and patchable |
| LLM key needed to drive AutoBE | Use existing xAI/grok credential from OpenClaw auth (or fresh xAI API key); configurable via env |
| Scope creep (huge domain) | Strict milestone gates; out-of-scope list explicit |
| Compliance sensitivity | Audit log + RBAC from M1; encryption at rest; retention settings configurable |
| Flutter ↔ API drift | AutoBE emits OpenAPI; generate Dart client from it (openapi-generator) or hand-written mirror kept CI-checked |
| Premiumcalc correctness | Formula engine unit-tested with golden cases; manual override always allowed |

---

## 10. Open Questions (for Kevin)

1. **Product name:** "BrokerDesk" OK, or something else? (trivial to rename)
2. **Jurisdiction:** which market first (Canada? US?) — affects ACORD forms,
   tax/broker-fee fields, currency.
3. **Client portal:** needed in v1 or later?
4. **LLM provider for AutoBE:** reuse grok/xAI key, or a different provider?
5. **Deployment target:** self-hosted Linux (Docker) vs cloud — affects storage/email.

---

## 11. Repo Layout

```
brokerdesk/
├── PLAN.md              ← this document
├── README.md
├── docs/                (research notes, ERD, API docs, out of scope)
├── backend/             ← AutoBE-generated NestJS+Prisma app
├── frontend/            ← Flutter app (broker + portal)
├── docker-compose.yml   (postgres, backend)
└── Makefile
```