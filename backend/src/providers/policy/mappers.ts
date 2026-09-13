import {
  EClientLanguage,
  EClientStatus,
  EClientType,
} from "../../api/structures/BrokerDeskCrmShared";
import { IBrokerDeskCarrier } from "../../api/structures/BrokerDeskCatalogueCarrier";
import { ELineOfBusiness } from "../../api/structures/BrokerDeskCatalogueCarrier";
import { IBrokerDeskClient } from "../../api/structures/BrokerDeskCrmClient";
import { IBrokerDeskCsr } from "../../api/structures/BrokerDeskActorsCsr";
import { IBrokerDeskProducer } from "../../api/structures/BrokerDeskActorsProducer";
import { IBrokerDeskProduct } from "../../api/structures/BrokerDeskCatalogueProduct";
import {
  ECancellationStatus,
  EEndorsementStatus,
  EPolicyPaymentPlan,
  EPolicyStatus,
  ERenewalStatus,
  IBrokerDeskPolicy,
  IBrokerDeskPolicyCancellation,
  IBrokerDeskPolicyCoverage,
  IBrokerDeskPolicyEndorsement,
  IBrokerDeskPolicyReinstatement,
  IBrokerDeskPolicyRenewal,
} from "../../api/structures/BrokerDeskPolicy";
import { IBrokerDeskPolicyDocument } from "../../api/structures/BrokerDeskPolicyDocument";
import {
  EQuoteStatus,
  ESubmissionStatus,
  IBrokerDeskQuote,
  IBrokerDeskQuoteLine,
  IBrokerDeskSubmission,
} from "../../api/structures/BrokerDeskQuoting";
import { toOrganizationSummary } from "../../transformers/organization";
import { iso, isoRequired } from "../../utils/iso";

export type OrgRow = {
  id: string;
  legal_name: string;
  operating_name: string | null;
  primary_province: string;
  default_currency: string;
};

export type ProducerRow = {
  id: string;
  email: string;
  display_name: string;
  active: boolean;
  created_at: Date;
  organization: OrgRow;
};

export type CsrRow = {
  id: string;
  email: string;
  display_name: string;
  active: boolean;
  created_at: Date;
  organization: OrgRow;
};

export type CarrierRow = {
  id: string;
  name: string;
  code: string;
  financial_strength_note: string | null;
  service_email: string | null;
  service_phone: string | null;
  active: boolean;
  _count: { products: number };
};

export type ProductRow = {
  id: string;
  name: string;
  code: string;
  line_of_business: string;
  description: string | null;
  active: boolean;
  carrier: CarrierRow;
  _count: { coverageItems: number };
};

export type ClientTagRow = { value: string; deleted_at: Date | null };
export type ClientContactRow = {
  name: string;
  phone: string | null;
  is_primary: boolean;
  deleted_at: Date | null;
};

export type ClientRow = {
  id: string;
  email: string;
  active: boolean;
  created_at: Date;
  tags: ClientTagRow[];
  contacts: ClientContactRow[];
};

export type QuoteLineRow = {
  id: string;
  carrier_name_snapshot: string;
  carrier_code_snapshot: string;
  coverage_selections: string;
  rating_inputs: string;
  premium_cad: number | null;
  broker_fee_cad: number | null;
  tax_amount_cad: number | null;
  commission_estimate_cad: number | null;
  accepted: boolean;
  created_at: Date;
  updated_at: Date;
  product: ProductRow;
};

export type SubmissionRow = {
  id: string;
  status: string;
  carrier_reference_number: string | null;
  sent_at: Date | null;
  responded_at: Date | null;
  created_at: Date;
  carrier: CarrierRow;
  _count: { messages: number };
};

export type QuoteRow = {
  id: string;
  broker_desk_client_id: string;
  broker_desk_producer_id: string;
  status: string;
  desired_effective_date: Date | null;
  expires_at: Date;
  notes: string | null;
  total_premium_cad: number;
  total_broker_fee_cad: number;
  tax_amount_cad: number;
  grand_total_cad: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  organization: OrgRow;
  client: ClientRow;
  producer: ProducerRow;
  lines: QuoteLineRow[];
  submissions: SubmissionRow[];
};

export type CoverageRow = {
  id: string;
  code: string;
  name: string;
  limit_amount: number | null;
  deductible: number | null;
  premium: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type EndorsementRow = {
  id: string;
  type: string;
  effective_at: Date;
  description: string | null;
  premium_delta: number;
  fee_delta: number;
  status: string;
  issued_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  creator: CsrRow;
};

export type ReinstatementRow = {
  id: string;
  effective_at: Date;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  csr: CsrRow;
};

export type CancellationRow = {
  id: string;
  effective_date: Date;
  reason: string;
  return_premium: number | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  reinstatement: ReinstatementRow | null;
};

export type PolicySummaryRow = {
  id: string;
  organization_id: string;
  client_id: string;
  carrier_id: string;
  product_id: string;
  producer_id: string;
  org_policy_number: string;
  carrier_policy_number: string | null;
  status: string;
  term_start: Date;
  term_end: Date;
  billed_premium_cad: number;
  broker_fee_cad: number;
  tax_amount_cad: number;
  payment_plan: string;
  province_of_risk: string;
  created_at: Date;
  organization: OrgRow;
  client: ClientRow;
  carrier: CarrierRow;
  product: ProductRow;
  producer: ProducerRow;
};

export type RenewalNestedRow = {
  id: string;
  status: string;
  offered_premium_cad: number | null;
  offered_at: Date | null;
  decided_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  organization: OrgRow;
  priorPolicy: PolicySummaryRow;
  nextPolicy: PolicySummaryRow | null;
};

export type PolicyRow = PolicySummaryRow & {
  quote_id: string | null;
  quote_line_id: string | null;
  updated_at: Date;
  deleted_at: Date | null;
  quote: QuoteRow | null;
  quoteLine: QuoteLineRow | null;
  coverages: CoverageRow[];
  endorsements: EndorsementRow[];
  cancellations: CancellationRow[];
  priorRenewal: RenewalNestedRow | null;
  nextRenewal: RenewalNestedRow | null;
};

export type DocumentRow = {
  id: string;
  kind: string;
  filename: string;
  mime_type: string;
  storage_path: string;
  checksum: string;
  version: number;
  created_at: Date;
};

export const orgSelect = {
  id: true,
  legal_name: true,
  operating_name: true,
  primary_province: true,
  default_currency: true,
};

export const producerInclude = {
  organization: { select: orgSelect },
};

export const csrInclude = {
  organization: { select: orgSelect },
};

export const carrierInclude = {
  _count: { select: { products: true } },
};

export const productInclude = {
  carrier: { include: carrierInclude },
  _count: { select: { coverageItems: true } },
};

export const clientInclude = {
  tags: true,
  contacts: true,
};

export const quoteLineInclude = {
  product: { include: productInclude },
};

export const quoteInclude = {
  organization: { select: orgSelect },
  client: { include: clientInclude },
  producer: { include: producerInclude },
  lines: { include: quoteLineInclude },
  submissions: {
    include: {
      carrier: { include: carrierInclude },
      _count: { select: { messages: true } },
    },
  },
};

export const policySummaryInclude = {
  organization: { select: orgSelect },
  client: { include: clientInclude },
  carrier: { include: carrierInclude },
  product: { include: productInclude },
  producer: { include: producerInclude },
};

export const renewalInclude = {
  organization: { select: orgSelect },
  priorPolicy: { include: policySummaryInclude },
  nextPolicy: { include: policySummaryInclude },
};

export const policyInclude = {
  ...policySummaryInclude,
  quote: { include: quoteInclude },
  quoteLine: { include: quoteLineInclude },
  coverages: { orderBy: { created_at: "asc" as const } },
  endorsements: {
    where: { deleted_at: null },
    include: { creator: { include: csrInclude } },
    orderBy: { created_at: "desc" as const },
  },
  cancellations: {
    include: {
      reinstatement: { include: { csr: { include: csrInclude } } },
    },
    orderBy: { created_at: "desc" as const },
  },
  priorRenewal: { include: renewalInclude },
  nextRenewal: { include: renewalInclude },
};

export const toPolicyStatus = (value: string): EPolicyStatus => {
  switch (value) {
    case "active":
    case "pending_cancel":
    case "cancelled":
    case "expired":
    case "lapsed":
      return value;
    default:
      return "active";
  }
};

export const toPaymentPlan = (value: string): EPolicyPaymentPlan => {
  switch (value) {
    case "annual":
    case "semi_annual":
    case "quarterly":
    case "monthly":
      return value;
    default:
      return "annual";
  }
};

export const toEndorsementStatus = (value: string): EEndorsementStatus =>
  value === "issued" ? "issued" : "draft";

export const toCancellationStatus = (value: string): ECancellationStatus =>
  value === "completed" ? "completed" : "requested";

export const toRenewalStatus = (value: string): ERenewalStatus => {
  switch (value) {
    case "scheduled":
    case "offered":
    case "accepted":
    case "rewritten":
    case "non_renewed":
    case "lost":
      return value;
    default:
      return "scheduled";
  }
};

const toLineOfBusiness = (value: string): ELineOfBusiness => {
  switch (value) {
    case "auto":
    case "home":
    case "commercial_property":
    case "commercial_liability":
    case "life":
    case "health":
    case "disability":
    case "travel":
    case "other":
      return value;
    default:
      return "other";
  }
};

const toQuoteStatus = (value: string): EQuoteStatus => {
  switch (value) {
    case "draft":
    case "priced":
    case "submitted":
    case "bound":
    case "declined":
    case "expired":
      return value;
    default:
      return "draft";
  }
};

const toSubmissionStatus = (value: string): ESubmissionStatus => {
  switch (value) {
    case "pending":
    case "sent":
    case "acknowledged":
    case "quoted":
    case "declined":
      return value;
    default:
      return "pending";
  }
};

const toDocumentKind = (
  value: string,
): IBrokerDeskPolicyDocument["kind"] => {
  switch (value) {
    case "policy_schedule":
    case "coi":
    case "certificate":
    case "policy_pdf":
    case "other":
      return value;
    default:
      return "other";
  }
};

const toClientType = (contacts: ClientContactRow[]): EClientType =>
  contacts.filter((c) => c.deleted_at === null).length > 1
    ? "business"
    : "individual";

const toClientStatus = (active: boolean): EClientStatus =>
  active ? "active" : "inactive";

export const toProducerSummary = (
  row: ProducerRow,
): IBrokerDeskProducer.ISummary => ({
  id: row.id,
  organization: toOrganizationSummary(row.organization),
  email: row.email,
  display_name: row.display_name,
  active: row.active,
  created_at: isoRequired(row.created_at),
});

export const toCsrSummary = (row: CsrRow): IBrokerDeskCsr.ISummary => ({
  id: row.id,
  organization: toOrganizationSummary(row.organization),
  email: row.email,
  display_name: row.display_name,
  active: row.active,
  created_at: isoRequired(row.created_at),
});

export const toCarrierSummary = (
  row: CarrierRow,
): IBrokerDeskCarrier.ISummary => ({
  id: row.id,
  name: row.name,
  code: row.code,
  financial_strength_note: row.financial_strength_note,
  service_email: row.service_email,
  service_phone: row.service_phone,
  active: row.active,
  product_count: row._count.products,
});

export const toProductSummary = (
  row: ProductRow,
): IBrokerDeskProduct.ISummary => ({
  id: row.id,
  carrier: toCarrierSummary(row.carrier),
  name: row.name,
  code: row.code,
  line_of_business: toLineOfBusiness(row.line_of_business),
  description: row.description,
  active: row.active,
  coverage_item_count: row._count.coverageItems,
});

export const toClientSummary = (
  row: ClientRow,
  producer: ProducerRow,
  primaryProvince: string,
): IBrokerDeskClient.ISummary => {
  const contacts = row.contacts.filter((c) => c.deleted_at === null);
  const primary =
    contacts.find((c) => c.is_primary) ?? contacts[0] ?? null;
  const language: EClientLanguage = "en";
  void language;
  return {
    id: row.id,
    client_type: toClientType(row.contacts),
    legal_name: primary?.name ?? row.email,
    preferred_name: null,
    primary_province: primaryProvince,
    email: row.email,
    phone: primary?.phone ?? null,
    status: toClientStatus(row.active),
    created_at: isoRequired(row.created_at),
    assigned_producer: {
      id: producer.id,
      display_name: producer.display_name,
      email: producer.email,
    },
    tag_values: row.tags
      .filter((t) => t.deleted_at === null)
      .map((t) => t.value),
  };
};

export const toQuoteLineSummary = (
  row: QuoteLineRow,
): IBrokerDeskQuoteLine.ISummary => ({
  id: row.id,
  product: toProductSummary(row.product),
  carrier_name_snapshot: row.carrier_name_snapshot,
  carrier_code_snapshot: row.carrier_code_snapshot,
  premium_cad: row.premium_cad,
  broker_fee_cad: row.broker_fee_cad,
  tax_amount_cad: row.tax_amount_cad,
  commission_estimate_cad: row.commission_estimate_cad,
  accepted: row.accepted,
});

export const toQuoteSummary = (row: QuoteRow): IBrokerDeskQuote.ISummary => ({
  id: row.id,
  client: toClientSummary(
    row.client,
    row.producer,
    row.producer.organization.primary_province,
  ),
  producer: toProducerSummary(row.producer),
  status: toQuoteStatus(row.status),
  desired_effective_date: iso(row.desired_effective_date),
  expires_at: isoRequired(row.expires_at),
  total_premium_cad: row.total_premium_cad,
  total_broker_fee_cad: row.total_broker_fee_cad,
  tax_amount_cad: row.tax_amount_cad,
  grand_total_cad: row.grand_total_cad,
  line_count: row.lines.length,
  created_at: isoRequired(row.created_at),
});

export const toSubmissionSummary = (
  row: SubmissionRow,
): IBrokerDeskSubmission.ISummary => ({
  id: row.id,
  carrier: toCarrierSummary(row.carrier),
  status: toSubmissionStatus(row.status),
  carrier_reference_number: row.carrier_reference_number,
  sent_at: iso(row.sent_at),
  responded_at: iso(row.responded_at),
  message_count: row._count.messages,
  created_at: isoRequired(row.created_at),
});

export const toQuote = (row: QuoteRow): IBrokerDeskQuote => ({
  id: row.id,
  organization: {
    id: row.organization.id,
    legal_name: row.organization.legal_name,
    operating_name: row.organization.operating_name,
  },
  client: toClientSummary(
    row.client,
    row.producer,
    row.producer.organization.primary_province,
  ),
  producer: toProducerSummary(row.producer),
  status: toQuoteStatus(row.status),
  desired_effective_date: iso(row.desired_effective_date),
  expires_at: isoRequired(row.expires_at),
  notes: row.notes,
  total_premium_cad: row.total_premium_cad,
  total_broker_fee_cad: row.total_broker_fee_cad,
  tax_amount_cad: row.tax_amount_cad,
  grand_total_cad: row.grand_total_cad,
  lines: row.lines.map(toQuoteLineSummary),
  submissions: row.submissions.map(toSubmissionSummary),
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
  deleted_at: iso(row.deleted_at),
});

export const toPolicySummary = (
  row: PolicySummaryRow,
): IBrokerDeskPolicy.ISummary => ({
  id: row.id,
  client: toClientSummary(
    row.client,
    row.producer,
    row.province_of_risk,
  ),
  carrier: toCarrierSummary(row.carrier),
  product: toProductSummary(row.product),
  producer: toProducerSummary(row.producer),
  org_policy_number: row.org_policy_number,
  carrier_policy_number: row.carrier_policy_number,
  status: toPolicyStatus(row.status),
  term_start: isoRequired(row.term_start),
  term_end: isoRequired(row.term_end),
  billed_premium_cad: row.billed_premium_cad,
  broker_fee_cad: row.broker_fee_cad,
  tax_amount_cad: row.tax_amount_cad,
  payment_plan: toPaymentPlan(row.payment_plan),
  province_of_risk: row.province_of_risk,
});

export const toCoverageSummary = (
  row: CoverageRow,
): IBrokerDeskPolicyCoverage.ISummary => ({
  id: row.id,
  code: row.code,
  name: row.name,
  limit_amount: row.limit_amount,
  deductible: row.deductible,
  premium: row.premium,
});

export const toCoverage = (
  row: CoverageRow,
  policy: IBrokerDeskPolicy.ISummary,
): IBrokerDeskPolicyCoverage => ({
  id: row.id,
  policy,
  code: row.code,
  name: row.name,
  limit_amount: row.limit_amount,
  deductible: row.deductible,
  premium: row.premium,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
  deleted_at: iso(row.deleted_at),
});

export const toEndorsementSummary = (
  row: EndorsementRow,
): IBrokerDeskPolicyEndorsement.ISummary => ({
  id: row.id,
  type: row.type,
  effective_at: isoRequired(row.effective_at),
  premium_delta: row.premium_delta,
  fee_delta: row.fee_delta,
  status: toEndorsementStatus(row.status),
  issued_at: iso(row.issued_at),
});

export const toEndorsement = (
  row: EndorsementRow,
  policy: IBrokerDeskPolicy.ISummary,
): IBrokerDeskPolicyEndorsement => ({
  id: row.id,
  policy,
  creator: toCsrSummary(row.creator),
  type: row.type,
  effective_at: isoRequired(row.effective_at),
  description: row.description,
  premium_delta: row.premium_delta,
  fee_delta: row.fee_delta,
  status: toEndorsementStatus(row.status),
  issued_at: iso(row.issued_at),
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
  deleted_at: iso(row.deleted_at),
});

export const toCancellationSummary = (
  row: CancellationRow,
): IBrokerDeskPolicyCancellation.ISummary => ({
  id: row.id,
  effective_date: isoRequired(row.effective_date),
  reason: row.reason,
  return_premium: row.return_premium,
  status: toCancellationStatus(row.status),
});

export const toReinstatement = (
  row: ReinstatementRow,
  cancellation: IBrokerDeskPolicyCancellation.ISummary,
): IBrokerDeskPolicyReinstatement => ({
  id: row.id,
  cancellation,
  csr: toCsrSummary(row.csr),
  effective_at: isoRequired(row.effective_at),
  notes: row.notes,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
  deleted_at: iso(row.deleted_at),
});

export const toCancellation = (
  row: CancellationRow,
  policy: IBrokerDeskPolicy.ISummary,
): IBrokerDeskPolicyCancellation => {
  const summary = toCancellationSummary(row);
  const reinstatement =
    row.reinstatement === null || row.reinstatement.deleted_at !== null
      ? null
      : toReinstatement(row.reinstatement, summary);
  return {
    id: row.id,
    policy,
    effective_date: isoRequired(row.effective_date),
    reason: row.reason,
    return_premium: row.return_premium,
    status: toCancellationStatus(row.status),
    created_at: isoRequired(row.created_at),
    updated_at: isoRequired(row.updated_at),
    reinstatement,
  };
};

export const toRenewalSummary = (
  row: RenewalNestedRow,
): IBrokerDeskPolicyRenewal.ISummary => ({
  id: row.id,
  prior_policy: toPolicySummary(row.priorPolicy),
  next_policy: row.nextPolicy ? toPolicySummary(row.nextPolicy) : null,
  status: toRenewalStatus(row.status),
  offered_premium_cad: row.offered_premium_cad,
  offered_at: iso(row.offered_at),
  decided_at: iso(row.decided_at),
});

export const toRenewal = (
  row: RenewalNestedRow,
): IBrokerDeskPolicyRenewal => ({
  id: row.id,
  organization: toOrganizationSummary(row.organization),
  prior_policy: toPolicySummary(row.priorPolicy),
  next_policy: row.nextPolicy ? toPolicySummary(row.nextPolicy) : null,
  status: toRenewalStatus(row.status),
  offered_premium_cad: row.offered_premium_cad,
  offered_at: iso(row.offered_at),
  decided_at: iso(row.decided_at),
  notes: row.notes,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
  deleted_at: iso(row.deleted_at),
});

export const toPolicy = (row: PolicyRow): IBrokerDeskPolicy => {
  const summary = toPolicySummary(row);
  return {
    id: row.id,
    organization: toOrganizationSummary(row.organization),
    client: summary.client,
    carrier: summary.carrier,
    product: summary.product,
    producer: summary.producer,
    quote: row.quote ? toQuoteSummary(row.quote) : null,
    quote_line: row.quoteLine ? toQuoteLineSummary(row.quoteLine) : null,
    org_policy_number: row.org_policy_number,
    carrier_policy_number: row.carrier_policy_number,
    status: toPolicyStatus(row.status),
    term_start: isoRequired(row.term_start),
    term_end: isoRequired(row.term_end),
    billed_premium_cad: row.billed_premium_cad,
    broker_fee_cad: row.broker_fee_cad,
    tax_amount_cad: row.tax_amount_cad,
    payment_plan: toPaymentPlan(row.payment_plan),
    province_of_risk: row.province_of_risk,
    created_at: isoRequired(row.created_at),
    updated_at: isoRequired(row.updated_at),
    deleted_at: iso(row.deleted_at),
    coverages: row.coverages.map((c) => toCoverage(c, summary)),
    endorsements: row.endorsements.map(toEndorsementSummary),
    cancellations: row.cancellations.map((c) => toCancellation(c, summary)),
    prior_renewal: row.nextRenewal ? toRenewalSummary(row.nextRenewal) : null,
    next_renewal: row.priorRenewal ? toRenewalSummary(row.priorRenewal) : null,
  };
};

export const toDocumentSummary = (
  row: DocumentRow,
): IBrokerDeskPolicyDocument.ISummary => ({
  id: row.id,
  kind: toDocumentKind(row.kind),
  filename: row.filename,
  mime_type: row.mime_type,
  version: row.version,
  created_at: isoRequired(row.created_at),
});

export const toDocument = (
  row: DocumentRow,
  policy: IBrokerDeskPolicy.ISummary,
): IBrokerDeskPolicyDocument => ({
  id: row.id,
  policy,
  kind: toDocumentKind(row.kind),
  filename: row.filename,
  mime_type: row.mime_type,
  storage_path: row.storage_path,
  checksum: row.checksum,
  version: row.version,
  created_at: isoRequired(row.created_at),
});
