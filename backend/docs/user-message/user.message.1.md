# BrokerDesk — Backend Requirements (Canada First)

Build a production-ready multi-tenant insurance broker management backend
for independent Canadian insurance brokerages. Currency is CAD. The system
must help brokers manage clients, connect them to carrier products, write
quotes and policies, track renewals, commissions, documents, and compliance.

## Business Context

Insurance brokers place coverage with large insurance carriers on behalf of
clients. Enterprise agency-management systems (Applied Epic, AMS360, EZLynx)
are expensive. BrokerDesk is a modern, affordable alternative focused on:

1. Client relationship management
2. Carrier and product catalog
3. Quoting and comparative proposals
4. Policy write-up, endorsements, renewals
5. Billing, commissions, and reporting
6. Documents and Canadian compliance basics

No real-time carrier rating APIs in v1. Premiums may be entered manually or
computed from simple formula tables stored on products. Carrier submissions
are recorded as workflow status + reference numbers (email/API placeholders).

## Actors & Roles

Multi-tenant: every business record belongs to one Organization (brokerage).

Roles:

- **ADMIN**: manage organization, users, roles, carriers, products, templates,
  commission schedules, reports, audit logs
- **PRODUCER**: own book of business — clients, quotes, submissions, policies,
  renewals, commissions view for self
- **CSR**: service clients, endorsements, documents, tasks; may not manage users
  or org settings
- **CLIENT** (portal, optional later): read own policies/documents and submit
  service requests — implement auth/role scaffolding now even if portal UI is later

## Authentication & Security

- Email + password registration of first ADMIN creates an Organization
- Login returns JWT access token + refresh token
- Password reset and email verification endpoints (token-based; email send can
  be stubbed/logged in dev)
- All non-auth routes require JWT
- Organization scoping on every query (tenant isolation)
- Role-based authorization on sensitive operations
- Append-only audit log for create/update/delete of critical entities
  (Client, Quote, Policy, Endorsement, Invoice, Commission, User, Product)
- Soft-delete for Client, Quote, Policy, Document where appropriate

## Organization & Users

- Organization: legal name, operating name, primary province (ON/QC/AB/BC/…),
  address, phone, HST/GST number, default currency CAD, settings JSON
- User: email, password hash, display name, role, active flag, organizationId
- Producer licensing: list of provincial licences
  (province, licence type e.g. RIBO, licence number, issue date, expiry date,
  status). ADMIN/CSR can manage; system should surface expired/expiring licences
- ADMIN can invite/create users, change roles, deactivate users

## CRM — Clients & Interactions

- Client types: individual | business
- Fields: legal name / first+last, preferred name, primary province, language
  (en/fr), email, phone, mailing address, status
  (prospect | active | inactive | lost), tags[], notes, assigned producer
- Contacts (for business clients): name, title, email, phone, primary flag
- Addresses: type (mailing/billing/risk), line1, line2, city, province, postal
- Activities: type (call/email/meeting/note/other), subject, body, occurredAt,
  createdBy
- Tasks: title, description, dueAt, status (open/done/cancelled), assignee,
  related client/policy optional
- Client documents: metadata + storage key, mime type, size, uploadedBy
- Timeline API: chronological mix of activities, tasks, quotes, policies for a client
- Search/filter clients by name, status, producer, province, tags

## Carriers & Products

- Carrier: name, code, AM Best or financial strength note (optional text),
  website, service email/phone, notes, active
- Product: carrierId, name, code, line of business enum
  (auto | home | commercial_property | commercial_liability | life | health |
   disability | travel | other), description, active
- Product eligibility: JSON rules (e.g. allowed provinces, client types,
  min/max values) — server validates when attaching product to a quote
- Product rating schema: JSON describing required input fields for quoting
  (coverage options, limits, deductibles, risk questions)
- Product commission schedule: default agency rate percent, default producer
  split percent, optional tier table JSON
- Coverage items catalog per product (name, code, default limit, optional)
- Appointment tracking: organization–carrier appointment status and expiry
  (compliance alert source)

## Quoting

- Quote belongs to client + organization, owned by producer
- Status workflow: draft → priced → submitted → bound | declined | expired
- Fields: effective date desired, expiry of quote, notes, total premium CAD,
  total broker fee CAD, tax amount CAD, grand total CAD
- Quote lines: productId, carrierId snapshot, coverage selections JSON,
  rating inputs JSON, premium, broker fee, taxes, commission estimate
- Comparative quoting: multiple lines/carriers on one quote
- Premium calculation helper: if product has formula config, compute; always
  allow manual override
- Submissions: per carrier on a quote — status
  (pending/sent/acknowledged/quoted/declined), carrier reference number,
  messages/notes, timestamps
- Bind action: creates Policy from accepted quote/lines (transactional)
- Quote documents: generate proposal/schedule from template (store Document)

## Policies (Write-up & Lifecycle)

- Policy created from bound quote (or manual entry for book-roll)
- Fields: policy number (org-generated and/or carrier policy number),
  clientId, carrierId, productId, producerId, status
  (active | pending_cancel | cancelled | expired | lapsed),
  termStart, termEnd, billed premium, broker fee, taxes, payment plan
  (annual | semi_annual | quarterly | monthly), province of risk
- Coverage schedule lines with limits/deductibles/premiums
- Endorsements: type, effective date, description, premium delta, fee delta,
  status (draft/issued), createdBy
- Cancellation: effective date, reason, return premium if any
- Reinstatement: reverse cancellation when allowed
- Renewals: renewal record linked to prior policy — offer premium, status
  (scheduled | offered | accepted | rewritten | non_renewed | lost),
  generate next-term policy on accept
- Automated renewal candidates: policies with termEnd within N days
- Policy documents: schedule, certificate/COI, full policy PDF placeholders

## Billing & Commissions

- Invoice: policyId optional, clientId, invoice number, issue date, due date,
  status (draft/sent/partial/paid/void), subtotal, tax, total, currency CAD
- Invoice lines: description, amount, tax code (GST/HST/QST/exempt)
- Payments: invoiceId, amount, method (etransfer|cheque|card|carrier_bill|other),
  paidAt, reference
- Commission: policyId, endorsementId optional, carrierId, producerId,
  premium basis, agency rate, agency amount, producer split rate, producer amount,
  status (estimated|due|paid|clawback), statement period
- Commission statements: list/filter by producer and period; mark paid

## Documents & Templates

- DocumentTemplate: organization-scoped, kind
  (quote_proposal | policy_schedule | coi | certificate | invoice | custom),
  name, body (markdown/HTML with {{variables}}), locale (en/fr)
- Render endpoint: template + entity ids → rendered content + optional PDF bytes
  (PDF generation may be simplified/stubbed if heavy; at minimum store rendered HTML/text)
- Document: polymorphic owner (client/quote/policy/invoice), kind, filename,
  mimeType, storagePath, checksum, version, uploadedBy, createdAt

## Notifications & Dashboard

- Notification: userId, type, title, body, entity refs, readAt, createdAt
- Create notifications for: task due, licence expiring, policy expiring,
  renewal due, submission status change (at least persist; email can be stub)
- Dashboard summary for org/producer:
  - counts: active clients, open quotes, active policies, expiring policies (30/60/90)
  - pipeline: quotes by status
  - revenue: bound premium MTD/YTD, commission due
  - compliance: expired/expiring producer licences, carrier appointments

## Canadian Compliance Notes (v1)

- Currency CAD; money fields as decimal(12,2)
- Province codes on org, client, risk, licences, eligibility
- Tax codes on invoice lines: GST, HST, QST, exempt (store rate used)
- Broker fees explicit and taxable per province rules (rate table configurable
  per org settings; seed Ontario HST 13% as default example)
- PIPEDA-aware: audit access to client PII in audit log where practical
- Do not hard-code full ACORD XML; use templates

## Non-Functional

- PostgreSQL database
- TypeScript NestJS API with typed DTOs and clear OpenAPI
- Pagination, filtering, sorting on list endpoints
- Idempotent where sensible (payments, bind)
- Seed data: demo organization in Ontario, admin user, sample carriers
  (e.g. Intact, Aviva, Wawanesa — fictionalized contact data), sample products
  (personal auto, home, commercial liability), sample client + draft quote
- E2E tests covering auth, client CRUD, quote→bind→policy, renewal offer,
  commission creation, tenant isolation (user A cannot read org B)

## Explicit Out of Scope for v1

- Live carrier download/rating integrations
- Full claims management
- Payment gateway capture
- Full bilingual content authoring UI (support locale fields only)
- Mobile push notifications


Please write a complete requirements analysis report for this backend application. Make pragmatic product decisions where details are underspecified. Target NestJS + Prisma + PostgreSQL.