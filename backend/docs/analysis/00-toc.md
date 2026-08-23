### Table of Contents

**brokerDesk** is a backend service with the following actors and domain entities.

**Actors**: guest, admin, producer, csr, client
**Entities**: Organization, User, ProducerLicence, Client, ClientContact, Address, Activity, Task, Document, Carrier, CarrierAppointment, Product, CoverageItem, CommissionSchedule, Quote, QuoteLine, Submission, Policy, PolicyCoverage, Endorsement, Cancellation, Renewal, Invoice, InvoiceLine, Payment, Commission, DocumentTemplate, Notification, AuditLog

---

**Scope**

- **Organization** — root tenant owning every business record, has many Users, holds CarrierAppointments with Carriers, owns DocumentTemplates
- **User** — belongs to Organization, as producer, owns assigned Clients and Quotes, is assigned Tasks and uploads Documents, receives Notifications, is recorded in AuditLog entries
- **ProducerLicence** — held by a producer User, drives compliance alerts
- **Client** — belongs to Organization, assigned to producer User, has Contacts, Addresses, Activities, Tasks, Documents, holds Quotes, Policies, and Invoices
- **ClientContact** — belongs to a business Client
- **Address** — attached to Client (also reusable for Organization)
- **Activity** — about a Client, created by User, feeds the client timeline alongside Tasks, Quotes, and Policies
- **Task** — assigned to User, optionally linked to Client, optionally linked to Policy, due tasks raise Notifications
- **Document** — polymorphic owner (Client | Quote | Policy | Invoice), uploaded by User, may be rendered from a DocumentTemplate
- **Carrier** — offers Products, appointed to Organizations through CarrierAppointment, referenced by QuoteLines, Policies, Submissions, and Commissions
- **CarrierAppointment** — junction linking Organization and Carrier
- **Product** — offered by Carrier, has CoverageItems and a CommissionSchedule, referenced by QuoteLines and Policies
- **CoverageItem** — catalog item belonging to Product
- **CommissionSchedule** — configured per Product, seeds estimated Commissions on quote and policy lines
- **Quote** — belongs to Client and Organization, owned by producer User, has comparative QuoteLines and Submissions, binds transactionally into a Policy
- **QuoteLine** — comparative line within a Quote, references Product with a Carrier snapshot
- **Submission** — per Carrier on a Quote, status changes raise Notifications
- **Policy** — created from a bound Quote or entered manually for book-roll, belongs to Client, Carrier, Product, producer User, and Organization, has coverage schedule lines, Endorsements, Cancellations, and Renewals, generates Invoices and Commissions
- **PolicyCoverage** — coverage schedule line belonging to Policy, mirrors the chosen Product CoverageItems
- **Endorsement** — amends a Policy, created by User, may generate an adjustment Commission
- **Cancellation** — applies to a Policy, reinstatement restores the Policy to active
- **Renewal** — linked to the expiring prior Policy, acceptance generates the next-term Policy, candidates detected by term-end proximity
- **Invoice** — billed to Client, optionally linked to Policy, has InvoiceLines and Payments
- **InvoiceLine** — belongs to Invoice
- **Payment** — applied against an Invoice
- **Commission** — derived from a Policy (optionally an Endorsement), attributed to Carrier and producer User, reported in statements filtered by producer and period
- **DocumentTemplate** — scoped to Organization, renders Documents for client, quote, policy, and invoice entities
- **Notification** — addressed to User, raised for task due, licence expiring, policy expiring, renewal due, and submission status changes
- **AuditLog** — records critical-entity changes made by Users within an Organization, captures client PII access where practical

- **guest** (guest)
- **admin** (admin)
- **producer** (member)
- **csr** (member)
- **client** (member)

---

**Document Map**

| File | Role | Downstream |
|------|------|------------|
| [00-toc.md](./00-toc.md) | Project summary, scope, glossary, and assumptions | project-setup |
| [01-actors-and-auth.md](./01-actors-and-auth.md) | Actor definitions, permission matrix, authentication, session, account lifecycle | auth-middleware |
| [02-domain-model.md](./02-domain-model.md) | Business concepts, relationships, and states from user perspective | database-design |
| [03-functional-requirements.md](./03-functional-requirements.md) | What operations users can perform, use cases, business workflows | interface-design |
| [04-business-rules.md](./04-business-rules.md) | Business rules, validation constraints, data browsing expectations, error scenarios | service-layer |
| [05-non-functional.md](./05-non-functional.md) | Data ownership, privacy, retention, and recovery policies | test-infra |

**Section Navigation**

<!-- Load sections by ID: `process({ request: { type: "getAnalysisSections", sectionIds: [ID, ...] } })` -->

**[01-actors-and-auth.md](./01-actors-and-auth.md)**
- [Actor Definitions](./01-actors-and-auth.md#actor-definitions)
  - [1] [guest Actor](./01-actors-and-auth.md#guest-actor) — Define the guest actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [2] [admin Actor](./01-actors-and-auth.md#admin-actor) — Define the admin actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [3] [producer Actor](./01-actors-and-auth.md#producer-actor) — Define the producer actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [4] [csr Actor](./01-actors-and-auth.md#csr-actor) — Define the csr actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [5] [client Actor](./01-actors-and-auth.md#client-actor) — Define the client actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [6] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [7] [Session and Logout](./01-actors-and-auth.md#session-and-logout) — Define session behavior and logout from a user perspective.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [8] [Account Management](./01-actors-and-auth.md#account-management) — Define how users create accounts, delete accounts, and change passwords.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [9] [Organization Concept](./02-domain-model.md#organization-concept) — Describe what Organization represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [ProducerLicence Concept](./02-domain-model.md#producerlicence-concept) — Describe what ProducerLicence represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [Client Concept](./02-domain-model.md#client-concept) — Describe what Client represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [ClientContact Concept](./02-domain-model.md#clientcontact-concept) — Describe what ClientContact represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [Address Concept](./02-domain-model.md#address-concept) — Describe what Address represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [Activity Concept](./02-domain-model.md#activity-concept) — Describe what Activity represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [Task Concept](./02-domain-model.md#task-concept) — Describe what Task represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [17] [Document Concept](./02-domain-model.md#document-concept) — Describe what Document represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [18] [Carrier Concept](./02-domain-model.md#carrier-concept) — Describe what Carrier represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [19] [CarrierAppointment Concept](./02-domain-model.md#carrierappointment-concept) — Describe what CarrierAppointment represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [20] [Product Concept](./02-domain-model.md#product-concept) — Describe what Product represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [21] [CoverageItem Concept](./02-domain-model.md#coverageitem-concept) — Describe what CoverageItem represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [22] [CommissionSchedule Concept](./02-domain-model.md#commissionschedule-concept) — Describe what CommissionSchedule represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [23] [Quote Concept](./02-domain-model.md#quote-concept) — Describe what Quote represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [24] [QuoteLine Concept](./02-domain-model.md#quoteline-concept) — Describe what QuoteLine represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [25] [Submission Concept](./02-domain-model.md#submission-concept) — Describe what Submission represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [26] [Policy Concept](./02-domain-model.md#policy-concept) — Describe what Policy represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [27] [PolicyCoverage Concept](./02-domain-model.md#policycoverage-concept) — Describe what PolicyCoverage represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [28] [Endorsement Concept](./02-domain-model.md#endorsement-concept) — Describe what Endorsement represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [29] [Cancellation Concept](./02-domain-model.md#cancellation-concept) — Describe what Cancellation represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [30] [Renewal Concept](./02-domain-model.md#renewal-concept) — Describe what Renewal represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [31] [Invoice Concept](./02-domain-model.md#invoice-concept) — Describe what Invoice represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [32] [InvoiceLine Concept](./02-domain-model.md#invoiceline-concept) — Describe what InvoiceLine represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [33] [Payment Concept](./02-domain-model.md#payment-concept) — Describe what Payment represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [34] [Commission Concept](./02-domain-model.md#commission-concept) — Describe what Commission represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [35] [DocumentTemplate Concept](./02-domain-model.md#documenttemplate-concept) — Describe what DocumentTemplate represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [36] [Notification Concept](./02-domain-model.md#notification-concept) — Describe what Notification represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [37] [AuditLog Concept](./02-domain-model.md#auditlog-concept) — Describe what AuditLog represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [38] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [39] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [40] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [41] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [42] [Organization Operations](./03-functional-requirements.md#organization-operations) — Define business operations for Organization: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [43] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [44] [ProducerLicence Operations](./03-functional-requirements.md#producerlicence-operations) — Define business operations for ProducerLicence: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [45] [Client Operations](./03-functional-requirements.md#client-operations) — Define business operations for Client: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [46] [ClientContact Operations](./03-functional-requirements.md#clientcontact-operations) — Define business operations for ClientContact: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [47] [Address Operations](./03-functional-requirements.md#address-operations) — Define business operations for Address: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [48] [Activity Operations](./03-functional-requirements.md#activity-operations) — Define business operations for Activity: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [49] [Task Operations](./03-functional-requirements.md#task-operations) — Define business operations for Task: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [50] [Document Operations](./03-functional-requirements.md#document-operations) — Define business operations for Document: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [51] [Carrier Operations](./03-functional-requirements.md#carrier-operations) — Define business operations for Carrier: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [52] [CarrierAppointment Operations](./03-functional-requirements.md#carrierappointment-operations) — Define business operations for CarrierAppointment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [53] [Product Operations](./03-functional-requirements.md#product-operations) — Define business operations for Product: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [54] [CoverageItem Operations](./03-functional-requirements.md#coverageitem-operations) — Define business operations for CoverageItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [55] [CommissionSchedule Operations](./03-functional-requirements.md#commissionschedule-operations) — Define business operations for CommissionSchedule: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [56] [Quote Operations](./03-functional-requirements.md#quote-operations) — Define business operations for Quote: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [57] [QuoteLine Operations](./03-functional-requirements.md#quoteline-operations) — Define business operations for QuoteLine: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [58] [Submission Operations](./03-functional-requirements.md#submission-operations) — Define business operations for Submission: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [59] [Policy Operations](./03-functional-requirements.md#policy-operations) — Define business operations for Policy: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [60] [PolicyCoverage Operations](./03-functional-requirements.md#policycoverage-operations) — Define business operations for PolicyCoverage: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [61] [Endorsement Operations](./03-functional-requirements.md#endorsement-operations) — Define business operations for Endorsement: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [62] [Cancellation Operations](./03-functional-requirements.md#cancellation-operations) — Define business operations for Cancellation: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [63] [Renewal Operations](./03-functional-requirements.md#renewal-operations) — Define business operations for Renewal: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [64] [Invoice Operations](./03-functional-requirements.md#invoice-operations) — Define business operations for Invoice: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [65] [InvoiceLine Operations](./03-functional-requirements.md#invoiceline-operations) — Define business operations for InvoiceLine: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [66] [Payment Operations](./03-functional-requirements.md#payment-operations) — Define business operations for Payment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [67] [Commission Operations](./03-functional-requirements.md#commission-operations) — Define business operations for Commission: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [68] [DocumentTemplate Operations](./03-functional-requirements.md#documenttemplate-operations) — Define business operations for DocumentTemplate: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [69] [Notification Operations](./03-functional-requirements.md#notification-operations) — Define business operations for Notification: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [70] [AuditLog Operations](./03-functional-requirements.md#auditlog-operations) — Define business operations for AuditLog: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [71] [Organization Error Scenarios](./03-functional-requirements.md#organization-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Organization operations.
  - [72] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [73] [ProducerLicence Error Scenarios](./03-functional-requirements.md#producerlicence-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProducerLicence operations.
  - [74] [Client Error Scenarios](./03-functional-requirements.md#client-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Client operations.
  - [75] [ClientContact Error Scenarios](./03-functional-requirements.md#clientcontact-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ClientContact operations.
  - [76] [Address Error Scenarios](./03-functional-requirements.md#address-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Address operations.
  - [77] [Activity Error Scenarios](./03-functional-requirements.md#activity-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Activity operations.
  - [78] [Task Error Scenarios](./03-functional-requirements.md#task-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Task operations.
  - [79] [Document Error Scenarios](./03-functional-requirements.md#document-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Document operations.
  - [80] [Carrier Error Scenarios](./03-functional-requirements.md#carrier-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Carrier operations.
  - [81] [CarrierAppointment Error Scenarios](./03-functional-requirements.md#carrierappointment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CarrierAppointment operations.
  - [82] [Product Error Scenarios](./03-functional-requirements.md#product-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Product operations.
  - [83] [CoverageItem Error Scenarios](./03-functional-requirements.md#coverageitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CoverageItem operations.
  - [84] [CommissionSchedule Error Scenarios](./03-functional-requirements.md#commissionschedule-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CommissionSchedule operations.
  - [85] [Quote Error Scenarios](./03-functional-requirements.md#quote-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Quote operations.
  - [86] [QuoteLine Error Scenarios](./03-functional-requirements.md#quoteline-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all QuoteLine operations.
  - [87] [Submission Error Scenarios](./03-functional-requirements.md#submission-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Submission operations.
  - [88] [Policy Error Scenarios](./03-functional-requirements.md#policy-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Policy operations.
  - [89] [PolicyCoverage Error Scenarios](./03-functional-requirements.md#policycoverage-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all PolicyCoverage operations.
  - [90] [Endorsement Error Scenarios](./03-functional-requirements.md#endorsement-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Endorsement operations.
  - [91] [Cancellation Error Scenarios](./03-functional-requirements.md#cancellation-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Cancellation operations.
  - [92] [Renewal Error Scenarios](./03-functional-requirements.md#renewal-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Renewal operations.
  - [93] [Invoice Error Scenarios](./03-functional-requirements.md#invoice-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Invoice operations.
  - [94] [InvoiceLine Error Scenarios](./03-functional-requirements.md#invoiceline-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all InvoiceLine operations.
  - [95] [Payment Error Scenarios](./03-functional-requirements.md#payment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Payment operations.
  - [96] [Commission Error Scenarios](./03-functional-requirements.md#commission-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Commission operations.
  - [97] [DocumentTemplate Error Scenarios](./03-functional-requirements.md#documenttemplate-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all DocumentTemplate operations.
  - [98] [Notification Error Scenarios](./03-functional-requirements.md#notification-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Notification operations.
  - [99] [AuditLog Error Scenarios](./03-functional-requirements.md#auditlog-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AuditLog operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [100] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [101] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [102] [Organization Rules](./04-business-rules.md#organization-rules) — Define validation rules and domain constraints for Organization. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [103] [User Rules](./04-business-rules.md#user-rules) — Define validation rules and domain constraints for User. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [104] [ProducerLicence Rules](./04-business-rules.md#producerlicence-rules) — Define validation rules and domain constraints for ProducerLicence. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [105] [Client Rules](./04-business-rules.md#client-rules) — Define validation rules and domain constraints for Client. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [106] [ClientContact Rules](./04-business-rules.md#clientcontact-rules) — Define validation rules and domain constraints for ClientContact. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [107] [Address Rules](./04-business-rules.md#address-rules) — Define validation rules and domain constraints for Address. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [108] [Activity Rules](./04-business-rules.md#activity-rules) — Define validation rules and domain constraints for Activity. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [109] [Task Rules](./04-business-rules.md#task-rules) — Define validation rules and domain constraints for Task. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [110] [Document Rules](./04-business-rules.md#document-rules) — Define validation rules and domain constraints for Document. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [111] [Carrier Rules](./04-business-rules.md#carrier-rules) — Define validation rules and domain constraints for Carrier. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [112] [CarrierAppointment Rules](./04-business-rules.md#carrierappointment-rules) — Define validation rules and domain constraints for CarrierAppointment. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [113] [Product Rules](./04-business-rules.md#product-rules) — Define validation rules and domain constraints for Product. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [114] [CoverageItem Rules](./04-business-rules.md#coverageitem-rules) — Define validation rules and domain constraints for CoverageItem. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [115] [CommissionSchedule Rules](./04-business-rules.md#commissionschedule-rules) — Define validation rules and domain constraints for CommissionSchedule. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [116] [Quote Rules](./04-business-rules.md#quote-rules) — Define validation rules and domain constraints for Quote. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [117] [QuoteLine Rules](./04-business-rules.md#quoteline-rules) — Define validation rules and domain constraints for QuoteLine. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [118] [Submission Rules](./04-business-rules.md#submission-rules) — Define validation rules and domain constraints for Submission. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [119] [Policy Rules](./04-business-rules.md#policy-rules) — Define validation rules and domain constraints for Policy. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [120] [PolicyCoverage Rules](./04-business-rules.md#policycoverage-rules) — Define validation rules and domain constraints for PolicyCoverage. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [121] [Endorsement Rules](./04-business-rules.md#endorsement-rules) — Define validation rules and domain constraints for Endorsement. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [122] [Cancellation Rules](./04-business-rules.md#cancellation-rules) — Define validation rules and domain constraints for Cancellation. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [123] [Renewal Rules](./04-business-rules.md#renewal-rules) — Define validation rules and domain constraints for Renewal. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [124] [Invoice Rules](./04-business-rules.md#invoice-rules) — Define validation rules and domain constraints for Invoice. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [125] [InvoiceLine Rules](./04-business-rules.md#invoiceline-rules) — Define validation rules and domain constraints for InvoiceLine. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [126] [Payment Rules](./04-business-rules.md#payment-rules) — Define validation rules and domain constraints for Payment. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [127] [Commission Rules](./04-business-rules.md#commission-rules) — Define validation rules and domain constraints for Commission. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [128] [DocumentTemplate Rules](./04-business-rules.md#documenttemplate-rules) — Define validation rules and domain constraints for DocumentTemplate. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [129] [Notification Rules](./04-business-rules.md#notification-rules) — Define validation rules and domain constraints for Notification. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [130] [AuditLog Rules](./04-business-rules.md#auditlog-rules) — Define validation rules and domain constraints for AuditLog. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [131] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [132] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [133] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [134] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [135] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [136] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

---

**Canonical Sources**

Each type of information has one authoritative location. Other files should reference these canonical sources.

| Information Type | Canonical File |
|------------------|---------------|
| Domain concepts | [02-domain-model.md](./02-domain-model.md) |
| Error conditions | [04-business-rules.md](./04-business-rules.md) |
| Permissions | [01-actors-and-auth.md](./01-actors-and-auth.md) |
| Actor definitions | [01-actors-and-auth.md](./01-actors-and-auth.md) |
| Filtering/pagination rules | [04-business-rules.md](./04-business-rules.md) |
| Data retention/recovery | [05-non-functional.md](./05-non-functional.md) |

---

**Glossary**

- **Organization** — root tenant owning every business record, has many Users, holds CarrierAppointments with Carriers, owns DocumentTemplates
- **User** — belongs to Organization, as producer, owns assigned Clients and Quotes, is assigned Tasks and uploads Documents, receives Notifications, is recorded in AuditLog entries
- **ProducerLicence** — held by a producer User, drives compliance alerts
- **Client** — belongs to Organization, assigned to producer User, has Contacts, Addresses, Activities, Tasks, Documents, holds Quotes, Policies, and Invoices
- **ClientContact** — belongs to a business Client
- **Address** — attached to Client (also reusable for Organization)
- **Activity** — about a Client, created by User, feeds the client timeline alongside Tasks, Quotes, and Policies
- **Task** — assigned to User, optionally linked to Client, optionally linked to Policy, due tasks raise Notifications
- **Document** — polymorphic owner (Client | Quote | Policy | Invoice), uploaded by User, may be rendered from a DocumentTemplate
- **Carrier** — offers Products, appointed to Organizations through CarrierAppointment, referenced by QuoteLines, Policies, Submissions, and Commissions
- **CarrierAppointment** — junction linking Organization and Carrier
- **Product** — offered by Carrier, has CoverageItems and a CommissionSchedule, referenced by QuoteLines and Policies
- **CoverageItem** — catalog item belonging to Product
- **CommissionSchedule** — configured per Product, seeds estimated Commissions on quote and policy lines
- **Quote** — belongs to Client and Organization, owned by producer User, has comparative QuoteLines and Submissions, binds transactionally into a Policy
- **QuoteLine** — comparative line within a Quote, references Product with a Carrier snapshot
- **Submission** — per Carrier on a Quote, status changes raise Notifications
- **Policy** — created from a bound Quote or entered manually for book-roll, belongs to Client, Carrier, Product, producer User, and Organization, has coverage schedule lines, Endorsements, Cancellations, and Renewals, generates Invoices and Commissions
- **PolicyCoverage** — coverage schedule line belonging to Policy, mirrors the chosen Product CoverageItems
- **Endorsement** — amends a Policy, created by User, may generate an adjustment Commission
- **Cancellation** — applies to a Policy, reinstatement restores the Policy to active
- **Renewal** — linked to the expiring prior Policy, acceptance generates the next-term Policy, candidates detected by term-end proximity
- **Invoice** — billed to Client, optionally linked to Policy, has InvoiceLines and Payments
- **InvoiceLine** — belongs to Invoice
- **Payment** — applied against an Invoice
- **Commission** — derived from a Policy (optionally an Endorsement), attributed to Carrier and producer User, reported in statements filtered by producer and period
- **DocumentTemplate** — scoped to Organization, renders Documents for client, quote, policy, and invoice entities
- **Notification** — addressed to User, raised for task due, licence expiring, policy expiring, renewal due, and submission status changes
- **AuditLog** — records critical-entity changes made by Users within an Organization, captures client PII access where practical

---

**Constraints**

- File scope: Project summary, scope, glossary, and assumptions
- Downstream phase: project-setup
- File scope: Actor definitions, permission matrix, authentication, session, account lifecycle
- Downstream phase: auth-middleware
- File scope: Business concepts, relationships, and states from user perspective
- Downstream phase: database-design
- File scope: What operations users can perform, use cases, business workflows
- Downstream phase: interface-design
- File scope: Business rules, validation constraints, data browsing expectations, error scenarios
- Downstream phase: service-layer
- File scope: Data ownership, privacy, retention, and recovery policies
- Downstream phase: test-infra

**Active Features**

- file-storage