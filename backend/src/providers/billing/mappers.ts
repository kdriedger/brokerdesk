import {
  EBrokerDeskCommissionStatus,
  EBrokerDeskCommissionStatementStatus,
  EBrokerDeskInvoiceStatus,
  EBrokerDeskInvoiceTaxCode,
  EBrokerDeskPaymentMethod,
  IBrokerDeskCommission,
  IBrokerDeskCommissionStatement,
  IBrokerDeskInvoice,
  IBrokerDeskInvoiceLine,
  IBrokerDeskPayment,
} from "../../api/structures/BrokerDeskBilling";
import { IBrokerDeskCarrier } from "../../api/structures/BrokerDeskCatalogueCarrier";
import { ELineOfBusiness } from "../../api/structures/BrokerDeskCatalogueCarrier";
import { IBrokerDeskProduct } from "../../api/structures/BrokerDeskCatalogueProduct";
import { IBrokerDeskClient } from "../../api/structures/BrokerDeskCrmClient";
import {
  EClientStatus,
  EClientType,
  IBrokerDeskProducerSummary,
} from "../../api/structures/BrokerDeskCrmShared";
import { IBrokerDeskProducer } from "../../api/structures/BrokerDeskActorsProducer";
import {
  EPolicyPaymentPlan,
  EPolicyStatus,
  IBrokerDeskPolicy,
} from "../../api/structures/BrokerDeskPolicy";
import { IBrokerDeskOrganization } from "../../api/structures/BrokerDeskSystematicOrganization";
import { toOrganizationSummary } from "../../transformers/organization";
import { iso, isoRequired } from "../../utils/iso";

export const cad = (n: number): number => Math.round(n * 100) / 100;

export const orgSelect = {
  id: true,
  legal_name: true,
  operating_name: true,
  primary_province: true,
  default_currency: true,
} as const;

export type OrgSummaryRow = {
  id: string;
  legal_name: string;
  operating_name: string | null;
  primary_province: string;
  default_currency: string;
};

const oneOf = <T extends string>(
  value: string,
  allowed: readonly T[],
  fallback: T,
): T => (allowed.includes(value as T) ? (value as T) : fallback);

export const asInvoiceStatus = (value: string): EBrokerDeskInvoiceStatus =>
  oneOf(value, ["draft", "sent", "partial", "paid", "void"] as const, "draft");

export const asTaxCode = (value: string): EBrokerDeskInvoiceTaxCode =>
  oneOf(value, ["GST", "HST", "QST", "exempt"] as const, "exempt");

export const asPaymentMethod = (value: string): EBrokerDeskPaymentMethod =>
  oneOf(
    value,
    ["etransfer", "cheque", "card", "carrier_bill", "other"] as const,
    "other",
  );

export const asCommissionStatus = (value: string): EBrokerDeskCommissionStatus =>
  oneOf(value, ["estimated", "due", "paid", "clawback"] as const, "estimated");

export const asStatementStatus = (
  value: string,
): EBrokerDeskCommissionStatementStatus =>
  oneOf(value, ["open", "paid"] as const, "open");

export const asPolicyStatus = (value: string): EPolicyStatus =>
  oneOf(
    value,
    ["active", "pending_cancel", "cancelled", "expired", "lapsed"] as const,
    "active",
  );

export const asPaymentPlan = (value: string): EPolicyPaymentPlan =>
  oneOf(
    value,
    ["annual", "semi_annual", "quarterly", "monthly"] as const,
    "annual",
  );

export const asClientType = (value: string): EClientType =>
  oneOf(value, ["individual", "business"] as const, "individual");

export const asClientStatus = (value: string): EClientStatus =>
  oneOf(value, ["prospect", "active", "inactive", "lost"] as const, "active");

export const asLineOfBusiness = (value: string): ELineOfBusiness =>
  oneOf(
    value,
    [
      "auto",
      "home",
      "commercial_property",
      "commercial_liability",
      "life",
      "health",
      "disability",
      "travel",
      "other",
    ] as const,
    "other",
  );

export const fractionRate = (percentOrFraction: number): number =>
  percentOrFraction > 1 ? percentOrFraction / 100 : percentOrFraction;

export const taxRateFor = (
  code: EBrokerDeskInvoiceTaxCode,
  settings: IBrokerDeskOrganization.ISettings,
  province: string,
): number => {
  if (code === "exempt") return 0;
  const byBoth = settings.tax_rates.find(
    (row) => row.code === code && row.province === province,
  );
  if (byBoth) return fractionRate(byBoth.rate);
  const byCode = settings.tax_rates.find((row) => row.code === code);
  if (byCode) return fractionRate(byCode.rate);
  const byProvince = settings.tax_rates.find((row) => row.province === province);
  if (byProvince) return fractionRate(byProvince.rate);
  if (code === "HST") return 0.13;
  if (code === "GST") return 0.05;
  if (code === "QST") return 0.09975;
  return 0;
};

export const totalsFromLines = (
  lines: { amount: number; tax_rate: number }[],
): { subtotal: number; tax: number; total: number } => {
  const subtotal = cad(lines.reduce((sum, line) => sum + line.amount, 0));
  const tax = cad(
    lines.reduce((sum, line) => sum + line.amount * line.tax_rate, 0),
  );
  return { subtotal, tax, total: cad(subtotal + tax) };
};

type ProducerLite = {
  id: string;
  email: string;
  display_name: string;
};

type ClientRow = {
  id: string;
  email: string;
  active: boolean;
  created_at: Date;
  organization?: OrgSummaryRow | null;
  tags?: { value: string; deleted_at: Date | null }[];
  policies?: { producer: ProducerLite }[];
  quotes?: { producer: ProducerLite }[];
};

const UNASSIGNED_PRODUCER: IBrokerDeskProducerSummary = {
  id: "00000000-0000-4000-8000-000000000000",
  display_name: "Unassigned",
  email: "unassigned@brokerdesk.local",
};

const producerSummaryLite = (
  row: ProducerLite | null | undefined,
): IBrokerDeskProducerSummary =>
  row
    ? { id: row.id, display_name: row.display_name, email: row.email }
    : UNASSIGNED_PRODUCER;

export const toProducerSummary = (row: {
  id: string;
  email: string;
  display_name: string;
  active: boolean;
  created_at: Date;
  organization: OrgSummaryRow;
}): IBrokerDeskProducer.ISummary => ({
  id: row.id,
  organization: toOrganizationSummary(row.organization),
  email: row.email,
  display_name: row.display_name,
  active: row.active,
  created_at: isoRequired(row.created_at),
});

export const toCarrierSummary = (row: {
  id: string;
  name: string;
  code: string;
  financial_strength_note: string | null;
  service_email: string | null;
  service_phone: string | null;
  active: boolean;
  _count?: { products: number };
}): IBrokerDeskCarrier.ISummary => ({
  id: row.id,
  name: row.name,
  code: row.code,
  active: row.active,
  financial_strength_note: row.financial_strength_note,
  service_email: row.service_email,
  service_phone: row.service_phone,
  product_count: row._count?.products ?? 0,
});

export const toProductSummary = (row: {
  id: string;
  name: string;
  code: string;
  line_of_business: string;
  description: string | null;
  active: boolean;
  carrier: {
    id: string;
    name: string;
    code: string;
    financial_strength_note: string | null;
    service_email: string | null;
    service_phone: string | null;
    active: boolean;
    _count?: { products: number };
  };
  _count?: { coverageItems: number };
}): IBrokerDeskProduct.ISummary => ({
  id: row.id,
  carrier: toCarrierSummary(row.carrier),
  name: row.name,
  code: row.code,
  line_of_business: asLineOfBusiness(row.line_of_business),
  description: row.description,
  active: row.active,
  coverage_item_count: row._count?.coverageItems ?? 0,
});

export const toClientSummary = (
  row: ClientRow,
  assigned?: ProducerLite | null,
): IBrokerDeskClient.ISummary => {
  const nested =
    assigned ??
    row.policies?.[0]?.producer ??
    row.quotes?.[0]?.producer ??
    null;
  return {
    id: row.id,
    client_type: "individual",
    legal_name: row.email,
    preferred_name: null,
    primary_province: row.organization?.primary_province ?? "ON",
    email: row.email,
    phone: null,
    status: row.active ? "active" : "inactive",
    created_at: isoRequired(row.created_at),
    assigned_producer: producerSummaryLite(nested),
    tag_values: (row.tags ?? [])
      .filter((tag) => tag.deleted_at === null)
      .map((tag) => tag.value),
  };
};

export const toPolicySummary = (row: {
  id: string;
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
  client: ClientRow;
  carrier: {
    id: string;
    name: string;
    code: string;
    financial_strength_note: string | null;
    service_email: string | null;
    service_phone: string | null;
    active: boolean;
    _count?: { products: number };
  };
  product: {
    id: string;
    name: string;
    code: string;
    line_of_business: string;
    description: string | null;
    active: boolean;
    carrier: {
      id: string;
      name: string;
      code: string;
      financial_strength_note: string | null;
      service_email: string | null;
      service_phone: string | null;
      active: boolean;
      _count?: { products: number };
    };
    _count?: { coverageItems: number };
  };
  producer: {
    id: string;
    email: string;
    display_name: string;
    active: boolean;
    created_at: Date;
    organization: OrgSummaryRow;
  };
}): IBrokerDeskPolicy.ISummary => ({
  id: row.id,
  client: toClientSummary(row.client, row.producer),
  carrier: toCarrierSummary(row.carrier),
  product: toProductSummary(row.product),
  producer: toProducerSummary(row.producer),
  org_policy_number: row.org_policy_number,
  carrier_policy_number: row.carrier_policy_number,
  status: asPolicyStatus(row.status),
  term_start: isoRequired(row.term_start),
  term_end: isoRequired(row.term_end),
  billed_premium_cad: row.billed_premium_cad,
  broker_fee_cad: row.broker_fee_cad,
  tax_amount_cad: row.tax_amount_cad,
  payment_plan: asPaymentPlan(row.payment_plan),
  province_of_risk: row.province_of_risk,
});

export const toInvoiceLineSummary = (row: {
  id: string;
  description: string;
  amount: number;
  tax_code: string;
  tax_rate: number;
}): IBrokerDeskInvoiceLine.ISummary => ({
  id: row.id,
  description: row.description,
  amount: row.amount,
  tax_code: asTaxCode(row.tax_code),
  tax_rate: row.tax_rate,
});

export const toPaymentSummary = (row: {
  id: string;
  amount: number;
  method: string;
  paid_at: Date;
  reference: string | null;
}): IBrokerDeskPayment.ISummary => ({
  id: row.id,
  amount: row.amount,
  method: asPaymentMethod(row.method),
  paid_at: isoRequired(row.paid_at),
  reference: row.reference,
});

export const toBillingAddress = (row: {
  id: string;
  type: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postal_code: string;
}): IBrokerDeskInvoice.IBillingAddress => ({
  id: row.id,
  type: row.type,
  line1: row.line1,
  line2: row.line2,
  city: row.city,
  province: row.province,
  postal_code: row.postal_code,
});

type PolicySummaryRow = Parameters<typeof toPolicySummary>[0];

export type InvoiceMappedRow = {
  id: string;
  invoice_number: string;
  issue_date: Date;
  due_date: Date;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  organization: OrgSummaryRow;
  client: ClientRow;
  policy: PolicySummaryRow | null;
  billingAddress?: {
    id: string;
    type: string;
    line1: string;
    line2: string | null;
    city: string;
    province: string;
    postal_code: string;
  } | null;
  invoiceLines?: {
    id: string;
    description: string;
    amount: number;
    tax_code: string;
    tax_rate: number;
    deleted_at: Date | null;
  }[];
  payments?: {
    id: string;
    amount: number;
    method: string;
    paid_at: Date;
    reference: string | null;
  }[];
};

export const toInvoiceSummary = (
  row: InvoiceMappedRow,
): IBrokerDeskInvoice.ISummary => ({
  id: row.id,
  client: toClientSummary(
    row.client,
    row.policy?.producer ?? null,
  ),
  policy: row.policy ? toPolicySummary(row.policy) : null,
  invoice_number: row.invoice_number,
  issue_date: isoRequired(row.issue_date),
  due_date: isoRequired(row.due_date),
  status: asInvoiceStatus(row.status),
  subtotal: row.subtotal,
  tax: row.tax,
  total: row.total,
  currency: row.currency,
  created_at: isoRequired(row.created_at),
});

export const toInvoice = (row: InvoiceMappedRow): IBrokerDeskInvoice => ({
  ...toInvoiceSummary(row),
  organization: toOrganizationSummary(row.organization),
  billing_address: row.billingAddress
    ? toBillingAddress(row.billingAddress)
    : null,
  invoice_lines: (row.invoiceLines ?? [])
    .filter((line) => line.deleted_at === null)
    .map(toInvoiceLineSummary),
  payments: (row.payments ?? []).map(toPaymentSummary),
  updated_at: isoRequired(row.updated_at),
  deleted_at: iso(row.deleted_at),
});

export const toInvoiceLine = (
  row: {
    id: string;
    description: string;
    amount: number;
    tax_code: string;
    tax_rate: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  },
  invoice: InvoiceMappedRow,
): IBrokerDeskInvoiceLine => ({
  id: row.id,
  invoice: toInvoiceSummary(invoice),
  description: row.description,
  amount: row.amount,
  tax_code: asTaxCode(row.tax_code),
  tax_rate: row.tax_rate,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
  deleted_at: iso(row.deleted_at),
});

export const toPayment = (
  row: {
    id: string;
    amount: number;
    method: string;
    paid_at: Date;
    reference: string | null;
    idempotency_key: string;
    created_at: Date;
    updated_at: Date;
  },
  invoice: InvoiceMappedRow,
): IBrokerDeskPayment => ({
  id: row.id,
  invoice: toInvoiceSummary(invoice),
  amount: row.amount,
  method: asPaymentMethod(row.method),
  paid_at: isoRequired(row.paid_at),
  reference: row.reference,
  idempotency_key: row.idempotency_key,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
});

export const toStatementSummary = (row: {
  id: string;
  period_start: Date;
  period_end: Date;
  agency_amount_total: number;
  producer_amount_total: number;
  status: string;
  paid_at: Date | null;
  producer: {
    id: string;
    email: string;
    display_name: string;
    active: boolean;
    created_at: Date;
    organization: OrgSummaryRow;
  };
}): IBrokerDeskCommissionStatement.ISummary => ({
  id: row.id,
  producer: toProducerSummary(row.producer),
  period_start: isoRequired(row.period_start),
  period_end: isoRequired(row.period_end),
  agency_amount_total: row.agency_amount_total,
  producer_amount_total: row.producer_amount_total,
  status: asStatementStatus(row.status),
  paid_at: iso(row.paid_at),
});

type CommissionMappedRow = {
  id: string;
  premium_basis_cad: number;
  agency_rate_percent: number;
  agency_amount_cad: number;
  producer_split_rate_percent: number;
  producer_amount_cad: number;
  status: string;
  statement_period: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  organization: OrgSummaryRow;
  policy: PolicySummaryRow;
  carrier: {
    id: string;
    name: string;
    code: string;
    financial_strength_note: string | null;
    service_email: string | null;
    service_phone: string | null;
    active: boolean;
    _count?: { products: number };
  };
  producer: {
    id: string;
    email: string;
    display_name: string;
    active: boolean;
    created_at: Date;
    organization: OrgSummaryRow;
  };
  endorsement?: {
    id: string;
    type: string;
    effective_at: Date;
    status: string;
  } | null;
  statement?: {
    id: string;
    period_start: Date;
    period_end: Date;
    agency_amount_total: number;
    producer_amount_total: number;
    status: string;
    paid_at: Date | null;
    producer: {
      id: string;
      email: string;
      display_name: string;
      active: boolean;
      created_at: Date;
      organization: OrgSummaryRow;
    };
  } | null;
};

export const toCommissionSummary = (
  row: CommissionMappedRow,
): IBrokerDeskCommission.ISummary => ({
  id: row.id,
  policy: toPolicySummary(row.policy),
  carrier: toCarrierSummary(row.carrier),
  producer: toProducerSummary(row.producer),
  premium_basis_cad: row.premium_basis_cad,
  agency_amount_cad: row.agency_amount_cad,
  producer_amount_cad: row.producer_amount_cad,
  status: asCommissionStatus(row.status),
  statement_period: row.statement_period,
  created_at: isoRequired(row.created_at),
});

export const toCommission = (
  row: CommissionMappedRow,
): IBrokerDeskCommission => ({
  ...toCommissionSummary(row),
  organization: toOrganizationSummary(row.organization),
  endorsement: row.endorsement
    ? {
        id: row.endorsement.id,
        endorsement_type: row.endorsement.type,
        effective_date: isoRequired(row.endorsement.effective_at),
        status: row.endorsement.status,
      }
    : null,
  statement: row.statement ? toStatementSummary(row.statement) : null,
  agency_rate_percent: row.agency_rate_percent,
  producer_split_rate_percent: row.producer_split_rate_percent,
  updated_at: isoRequired(row.updated_at),
  deleted_at: iso(row.deleted_at),
});

export const toStatement = (row: {
  id: string;
  period_start: Date;
  period_end: Date;
  agency_amount_total: number;
  producer_amount_total: number;
  status: string;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  organization: OrgSummaryRow;
  producer: {
    id: string;
    email: string;
    display_name: string;
    active: boolean;
    created_at: Date;
    organization: OrgSummaryRow;
  };
  commissions?: CommissionMappedRow[];
}): IBrokerDeskCommissionStatement => ({
  id: row.id,
  organization: toOrganizationSummary(row.organization),
  producer: toProducerSummary(row.producer),
  period_start: isoRequired(row.period_start),
  period_end: isoRequired(row.period_end),
  agency_amount_total: row.agency_amount_total,
  producer_amount_total: row.producer_amount_total,
  status: asStatementStatus(row.status),
  paid_at: iso(row.paid_at),
  commissions: (row.commissions ?? []).map(toCommissionSummary),
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
  deleted_at: iso(row.deleted_at),
});

export const clientInclude = {
  organization: { select: orgSelect },
  tags: { where: { deleted_at: null } },
  policies: {
    where: { deleted_at: null },
    orderBy: { created_at: "desc" as const },
    take: 1,
    include: { producer: true },
  },
  quotes: {
    where: { deleted_at: null },
    orderBy: { created_at: "desc" as const },
    take: 1,
    include: { producer: true },
  },
};

export const producerInclude = {
  organization: { select: orgSelect },
};

export const carrierInclude = {
  _count: { select: { products: true } },
};

export const productInclude = {
  carrier: { include: carrierInclude },
  _count: { select: { coverageItems: true } },
};

export const clientOnPolicyInclude = {
  organization: { select: orgSelect },
  tags: { where: { deleted_at: null } },
};

export const policyInclude = {
  client: { include: clientOnPolicyInclude },
  carrier: { include: carrierInclude },
  product: { include: productInclude },
  producer: { include: producerInclude },
};

export const invoiceInclude = {
  organization: { select: orgSelect },
  client: { include: clientInclude },
  policy: { include: policyInclude },
  billingAddress: true,
  invoiceLines: {
    where: { deleted_at: null },
    orderBy: { created_at: "asc" as const },
  },
  payments: { orderBy: { paid_at: "asc" as const } },
};

export const paymentInclude = {
  invoice: { include: invoiceInclude },
};

export const commissionInclude = {
  organization: { select: orgSelect },
  policy: { include: policyInclude },
  carrier: { include: carrierInclude },
  producer: { include: producerInclude },
  endorsement: true,
  statement: {
    include: { producer: { include: producerInclude } },
  },
};

export const statementInclude = {
  organization: { select: orgSelect },
  producer: { include: producerInclude },
  commissions: {
    where: { deleted_at: null },
    include: commissionInclude,
  },
};
