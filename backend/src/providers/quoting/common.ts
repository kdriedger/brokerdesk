import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import { ELineOfBusiness } from "../../api/structures/BrokerDeskCatalogueCarrier";
import { IBrokerDeskCarrier } from "../../api/structures/BrokerDeskCatalogueCarrier";
import { IBrokerDeskProduct } from "../../api/structures/BrokerDeskCatalogueProduct";
import { IBrokerDeskClient } from "../../api/structures/BrokerDeskCrmClient";
import { IBrokerDeskProducerSummary } from "../../api/structures/BrokerDeskCrmShared";
import { IBrokerDeskCsr } from "../../api/structures/BrokerDeskActorsCsr";
import { IBrokerDeskProducer } from "../../api/structures/BrokerDeskActorsProducer";
import { IBrokerDeskPolicy } from "../../api/structures/BrokerDeskPolicy";
import { IBrokerDeskPolicyCoverage } from "../../api/structures/BrokerDeskPolicy";
import {
  EQuoteStatus,
  ESubmissionMessageChannel,
  ESubmissionMessageDirection,
  ESubmissionStatus,
  IBrokerDeskQuote,
  IBrokerDeskQuoteLine,
  IBrokerDeskQuotingAdminSummary,
  IBrokerDeskQuotingOrganizationSummary,
  IBrokerDeskSubmission,
  IBrokerDeskSubmissionMessage,
  IBrokerDeskSubmissionMessageOfAdmin,
  IBrokerDeskSubmissionMessageOfCsr,
  IBrokerDeskSubmissionMessageOfProducer,
} from "../../api/structures/BrokerDeskQuoting";
import { IBrokerDeskOrganization } from "../../api/structures/BrokerDeskSystematicOrganization";
import { MyGlobal } from "../../MyGlobal";
import { Prisma } from "../../prisma/client";
import { parseSettings } from "../../transformers/organization";
import { iso, isoRequired } from "../../utils/iso";

export type Tx = Prisma.TransactionClient;

const LOB: readonly ELineOfBusiness[] = [
  "auto",
  "home",
  "commercial_property",
  "commercial_liability",
  "life",
  "health",
  "disability",
  "travel",
  "other",
];

const QUOTE_STATUSES: readonly EQuoteStatus[] = [
  "draft",
  "priced",
  "submitted",
  "bound",
  "declined",
  "expired",
];

const SUBMISSION_STATUSES: readonly ESubmissionStatus[] = [
  "pending",
  "sent",
  "acknowledged",
  "quoted",
  "declined",
];

const MESSAGE_DIRECTIONS: readonly ESubmissionMessageDirection[] = [
  "outbound",
  "inbound",
];

const MESSAGE_CHANNELS: readonly ESubmissionMessageChannel[] = [
  "email",
  "phone",
  "portal",
  "mail",
  "fax",
];

const STATUS_FLOW: Record<EQuoteStatus, readonly EQuoteStatus[]> = {
  draft: ["draft", "priced", "declined"],
  priced: ["priced", "submitted", "declined", "expired"],
  submitted: ["submitted", "declined", "expired"],
  bound: ["bound"],
  declined: ["declined"],
  expired: ["expired"],
};

export const carrierCountInclude = {
  _count: { select: { products: true } },
} as const;

export const productInclude = {
  carrier: { include: carrierCountInclude },
  coverageItems: { where: { deleted_at: null } },
  commissionSchedule: true,
} as const;

export const quoteInclude = {
  organization: true,
  client: { include: { tags: true } },
  producer: { include: { organization: true } },
  lines: {
    include: { product: { include: productInclude } },
    orderBy: { created_at: "asc" as const },
  },
  submissions: {
    include: {
      carrier: { include: carrierCountInclude },
      messages: {
        where: { deleted_at: null },
        orderBy: { occurred_at: "asc" as const },
      },
    },
    orderBy: { created_at: "desc" as const },
  },
} as const;

export const quoteLineInclude = {
  product: { include: productInclude },
  quote: {
    include: {
      organization: true,
      client: { include: { tags: true } },
      producer: { include: { organization: true } },
      lines: true,
    },
  },
} as const;

export const submissionInclude = {
  carrier: { include: carrierCountInclude },
  quote: {
    include: {
      organization: true,
      client: { include: { tags: true } },
      producer: { include: { organization: true } },
      lines: true,
    },
  },
  messages: {
    where: { deleted_at: null },
    orderBy: { occurred_at: "asc" as const },
  },
} as const;

export const messageInclude = {
  adminAttribution: { include: { admin: true } },
  producerAttribution: {
    include: { producer: { include: { organization: true } } },
  },
  ofCsr: { include: { csr: { include: { organization: true } } } },
  submission: {
    include: {
      carrier: { include: carrierCountInclude },
      messages: { where: { deleted_at: null } },
    },
  },
} as const;

export type OrgEmbed = {
  id: string;
  legal_name: string;
  operating_name: string | null;
  primary_province: string;
  default_currency: string;
  settings?: string;
};

export type ProducerEmbed = {
  id: string;
  email: string;
  display_name: string;
  active: boolean;
  created_at: Date;
  organization: OrgEmbed;
};

export type CsrEmbed = {
  id: string;
  email: string;
  display_name: string;
  active: boolean;
  created_at: Date;
  organization: OrgEmbed;
};

export type ClientEmbed = {
  id: string;
  email: string;
  active: boolean;
  created_at: Date;
  tags?: { value: string; deleted_at: Date | null }[];
};

export type CarrierEmbed = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  financial_strength_note: string | null;
  service_email: string | null;
  service_phone: string | null;
  _count?: { products: number };
};

export type CoverageItemEmbed = {
  id: string;
  name: string;
  code: string;
  default_limit: number;
  is_optional: boolean;
  deleted_at: Date | null;
};

export type CommissionEmbed = {
  id: string;
  agency_rate_percent: number;
  producer_split_percent: number;
  deleted_at: Date | null;
};

export type ProductEmbed = {
  id: string;
  name: string;
  code: string;
  line_of_business: string;
  description: string | null;
  active: boolean;
  eligibility_rules: string | null;
  rating_schema: string | null;
  deleted_at: Date | null;
  carrier: CarrierEmbed;
  coverageItems?: CoverageItemEmbed[];
  commissionSchedule?: CommissionEmbed | null;
  _count?: { coverageItems: number };
};

export type QuoteLineEmbed = {
  id: string;
  broker_desk_quote_id: string;
  broker_desk_product_id: string;
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
  product: ProductEmbed;
};

export type MessageEmbed = {
  id: string;
  broker_desk_submission_id: string;
  direction: string;
  channel: string;
  body: string;
  occurred_at: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type SubmissionEmbed = {
  id: string;
  broker_desk_quote_id: string;
  carrier_id: string;
  status: string;
  carrier_reference_number: string | null;
  notes: string | null;
  sent_at: Date | null;
  responded_at: Date | null;
  created_at: Date;
  updated_at: Date;
  carrier: CarrierEmbed;
  messages?: MessageEmbed[];
};

export type QuoteEmbed = {
  id: string;
  broker_desk_organization_id: string;
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
  organization: OrgEmbed;
  client: ClientEmbed;
  producer: ProducerEmbed;
  lines?: QuoteLineEmbed[] | { id: string }[];
  submissions?: SubmissionEmbed[];
};

export const roundCad = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const parseDate = (value: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()))
    throw new HttpException("Invalid date-time", 400);
  return parsed;
};

export const asObject = (value: unknown): Record<string, unknown> | null => {
  if (value !== null && typeof value === "object" && !Array.isArray(value))
    return value as Record<string, unknown>;
  return null;
};

export const parseJsonObject = (raw: string): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(raw);
    const obj = asObject(parsed);
    if (obj) return obj;
  } catch {
    /* fall through */
  }
  return {};
};

export const jsonString = (value: Record<string, unknown>): string =>
  JSON.stringify(value);

export const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

export const asStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string") out.push(item);
  }
  return out;
};

const includesLiteral = <T extends string>(
  allowed: readonly T[],
  value: string,
): value is T => (allowed as readonly string[]).includes(value);

export const asQuoteStatus = (value: string): EQuoteStatus => {
  if (includesLiteral(QUOTE_STATUSES, value)) return value;
  throw new HttpException("Invalid quote status", 500);
};

export const asSubmissionStatus = (value: string): ESubmissionStatus => {
  if (includesLiteral(SUBMISSION_STATUSES, value)) return value;
  throw new HttpException("Invalid submission status", 500);
};

export const asDirection = (value: string): ESubmissionMessageDirection => {
  if (includesLiteral(MESSAGE_DIRECTIONS, value)) return value;
  throw new HttpException("Invalid message direction", 500);
};

export const asChannel = (value: string): ESubmissionMessageChannel => {
  if (includesLiteral(MESSAGE_CHANNELS, value)) return value;
  throw new HttpException("Invalid message channel", 500);
};

export const asLineOfBusiness = (value: string): ELineOfBusiness =>
  includesLiteral(LOB, value) ? value : "other";

export const assertTransition = (
  current: EQuoteStatus,
  next: EQuoteStatus,
): void => {
  if (next === "bound")
    throw new HttpException("Use the bind action to bind a quotation", 400);
  if (!STATUS_FLOW[current].includes(next))
    throw new HttpException(
      `Cannot transition quote from ${current} to ${next}`,
      400,
    );
};

export const assertQuoteMutable = (
  status: EQuoteStatus,
  action: string,
): void => {
  if (status === "bound" || status === "declined" || status === "expired")
    throw new HttpException(`Cannot ${action} a ${status} quotation`, 400);
};

export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

export const toOrgSummary = (
  row: OrgEmbed,
): IBrokerDeskOrganization.ISummary => ({
  id: row.id,
  legal_name: row.legal_name,
  operating_name: row.operating_name,
  primary_province: row.primary_province,
  default_currency: row.default_currency,
});

export const toQuotingOrgSummary = (
  row: OrgEmbed,
): IBrokerDeskQuotingOrganizationSummary => ({
  id: row.id,
  legal_name: row.legal_name,
  operating_name: row.operating_name,
});

export const toProducerSummary = (
  row: ProducerEmbed,
): IBrokerDeskProducer.ISummary => ({
  id: row.id,
  organization: toOrgSummary(row.organization),
  email: row.email,
  display_name: row.display_name,
  active: row.active,
  created_at: isoRequired(row.created_at),
});

export const toProducerCrmSummary = (
  row: ProducerEmbed,
): IBrokerDeskProducerSummary => ({
  id: row.id,
  display_name: row.display_name,
  email: row.email,
});

export const toCsrSummary = (row: CsrEmbed): IBrokerDeskCsr.ISummary => ({
  id: row.id,
  organization: toOrgSummary(row.organization),
  email: row.email,
  display_name: row.display_name,
  active: row.active,
  created_at: isoRequired(row.created_at),
});

export const toClientSummary = (
  row: ClientEmbed,
  producer: ProducerEmbed,
  province: string,
): IBrokerDeskClient.ISummary => ({
  id: row.id,
  client_type: "individual",
  legal_name: row.email,
  preferred_name: null,
  primary_province: province,
  email: row.email,
  phone: null,
  status: row.active ? "active" : "inactive",
  created_at: isoRequired(row.created_at),
  assigned_producer: toProducerCrmSummary(producer),
  tag_values: (row.tags ?? [])
    .filter((tag) => tag.deleted_at === null)
    .map((tag) => tag.value),
});

export const toCarrierSummary = (
  row: CarrierEmbed,
): IBrokerDeskCarrier.ISummary => ({
  id: row.id,
  name: row.name,
  code: row.code,
  financial_strength_note: row.financial_strength_note,
  service_email: row.service_email,
  service_phone: row.service_phone,
  active: row.active,
  product_count: row._count?.products ?? 0,
});

export const toProductSummary = (
  row: ProductEmbed,
): IBrokerDeskProduct.ISummary => ({
  id: row.id,
  carrier: toCarrierSummary(row.carrier),
  name: row.name,
  code: row.code,
  line_of_business: asLineOfBusiness(row.line_of_business),
  description: row.description,
  active: row.active,
  coverage_item_count:
    row._count?.coverageItems ??
    (row.coverageItems ?? []).filter((item) => item.deleted_at === null).length,
});

const lineCountOf = (row: QuoteEmbed): number =>
  row.lines ? row.lines.length : 0;

export const toQuoteSummary = (row: QuoteEmbed): IBrokerDeskQuote.ISummary => ({
  id: row.id,
  client: toClientSummary(
    row.client,
    row.producer,
    row.organization.primary_province,
  ),
  producer: toProducerSummary(row.producer),
  status: asQuoteStatus(row.status),
  desired_effective_date: iso(row.desired_effective_date),
  expires_at: isoRequired(row.expires_at),
  total_premium_cad: row.total_premium_cad,
  total_broker_fee_cad: row.total_broker_fee_cad,
  tax_amount_cad: row.tax_amount_cad,
  grand_total_cad: row.grand_total_cad,
  line_count: lineCountOf(row),
  created_at: isoRequired(row.created_at),
});

export const toQuoteLineSummary = (
  row: QuoteLineEmbed,
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

export const toQuoteLine = (
  row: QuoteLineEmbed & { quote: QuoteEmbed },
): IBrokerDeskQuoteLine => ({
  id: row.id,
  quote: toQuoteSummary(row.quote),
  product: toProductSummary(row.product),
  carrier_name_snapshot: row.carrier_name_snapshot,
  carrier_code_snapshot: row.carrier_code_snapshot,
  coverage_selections: parseJsonObject(row.coverage_selections),
  rating_inputs: parseJsonObject(row.rating_inputs),
  premium_cad: row.premium_cad,
  broker_fee_cad: row.broker_fee_cad,
  tax_amount_cad: row.tax_amount_cad,
  commission_estimate_cad: row.commission_estimate_cad,
  accepted: row.accepted,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
});

export const toMessageSummary = (
  row: MessageEmbed,
): IBrokerDeskSubmissionMessage.ISummary => ({
  id: row.id,
  direction: asDirection(row.direction),
  channel: asChannel(row.channel),
  body: row.body,
  occurred_at: isoRequired(row.occurred_at),
  created_at: isoRequired(row.created_at),
});

export const toSubmissionSummary = (
  row: SubmissionEmbed,
): IBrokerDeskSubmission.ISummary => ({
  id: row.id,
  carrier: toCarrierSummary(row.carrier),
  status: asSubmissionStatus(row.status),
  carrier_reference_number: row.carrier_reference_number,
  sent_at: iso(row.sent_at),
  responded_at: iso(row.responded_at),
  message_count: (row.messages ?? []).filter((m) => m.deleted_at === null)
    .length,
  created_at: isoRequired(row.created_at),
});

export const toSubmission = (
  row: SubmissionEmbed & { quote: QuoteEmbed },
): IBrokerDeskSubmission => ({
  id: row.id,
  quote: toQuoteSummary(row.quote),
  carrier: toCarrierSummary(row.carrier),
  status: asSubmissionStatus(row.status),
  carrier_reference_number: row.carrier_reference_number,
  notes: row.notes,
  sent_at: iso(row.sent_at),
  responded_at: iso(row.responded_at),
  messages: (row.messages ?? [])
    .filter((m) => m.deleted_at === null)
    .map(toMessageSummary),
  message_count: (row.messages ?? []).filter((m) => m.deleted_at === null)
    .length,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
});

export const toQuote = (
  row: QuoteEmbed & { lines: QuoteLineEmbed[]; submissions: SubmissionEmbed[] },
): IBrokerDeskQuote => ({
  id: row.id,
  organization: toQuotingOrgSummary(row.organization),
  client: toClientSummary(
    row.client,
    row.producer,
    row.organization.primary_province,
  ),
  producer: toProducerSummary(row.producer),
  status: asQuoteStatus(row.status),
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

export const toAdminAttr = (row: {
  id: string;
  created_at: Date;
  admin: { id: string; display_name: string; email: string };
}): IBrokerDeskSubmissionMessageOfAdmin => ({
  id: row.id,
  admin: {
    id: row.admin.id,
    display_name: row.admin.display_name,
    email: row.admin.email,
  } satisfies IBrokerDeskQuotingAdminSummary,
  created_at: isoRequired(row.created_at),
});

export const toProducerAttr = (row: {
  id: string;
  created_at: Date;
  producer: ProducerEmbed;
}): IBrokerDeskSubmissionMessageOfProducer => ({
  id: row.id,
  producer: toProducerSummary(row.producer),
  created_at: isoRequired(row.created_at),
});

export const toCsrAttr = (row: {
  id: string;
  created_at: Date;
  csr: CsrEmbed;
}): IBrokerDeskSubmissionMessageOfCsr => ({
  id: row.id,
  csr: toCsrSummary(row.csr),
  created_at: isoRequired(row.created_at),
});

export const toSubmissionMessage = (
  row: MessageEmbed & {
    adminAttribution: {
      id: string;
      created_at: Date;
      admin: { id: string; display_name: string; email: string };
    } | null;
    producerAttribution: {
      id: string;
      created_at: Date;
      producer: ProducerEmbed;
    } | null;
    ofCsr: { id: string; created_at: Date; csr: CsrEmbed } | null;
    submission: SubmissionEmbed;
  },
): IBrokerDeskSubmissionMessage => ({
  id: row.id,
  submission: toSubmissionSummary(row.submission),
  direction: asDirection(row.direction),
  channel: asChannel(row.channel),
  body: row.body,
  occurred_at: isoRequired(row.occurred_at),
  admin_attribution: row.adminAttribution
    ? toAdminAttr(row.adminAttribution)
    : null,
  producer_attribution: row.producerAttribution
    ? toProducerAttr(row.producerAttribution)
    : null,
  csr_attribution: row.ofCsr ? toCsrAttr(row.ofCsr) : null,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
  deleted_at: iso(row.deleted_at),
});

export const taxFor = (
  org: OrgEmbed,
  premium: number,
  brokerFee: number,
): number => {
  const settings = parseSettings(org.settings ?? "{\"tax_rates\":[]}");
  const province = org.primary_province;
  const row =
    settings.tax_rates.find((rate) => rate.province === province) ??
    settings.tax_rates.find((rate) => rate.province === "ON") ??
    null;
  if (!row || row.code === "exempt") return 0;
  const basis = premium + (row.broker_fee_taxable ? brokerFee : 0);
  return roundCad(basis * (row.rate / 100));
};

export const commissionEstimate = (
  product: ProductEmbed,
  premium: number,
): number | null => {
  const schedule = product.commissionSchedule;
  if (!schedule || schedule.deleted_at !== null) return null;
  return roundCad(
    premium *
      (schedule.agency_rate_percent / 100) *
      (schedule.producer_split_percent / 100),
  );
};

export const computeFormulaPremium = (
  ratingSchema: string | null,
  inputs: Record<string, unknown>,
): number | null => {
  if (!ratingSchema) return null;
  let schema: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(ratingSchema);
    const obj = asObject(parsed);
    if (!obj) return null;
    schema = obj;
  } catch {
    throw new HttpException("Product rating schema is unreadable", 400);
  }
  const required = asStringArray(schema.required) ?? asStringArray(schema.required_inputs);
  if (required) {
    const missing = required.filter((key) => {
      const value = inputs[key];
      return value === undefined || value === null || value === "";
    });
    if (missing.length > 0)
      throw new HttpException(
        `Missing rating inputs: ${missing.join(", ")}`,
        400,
      );
  }
  const formula =
    asObject(schema.formula) ?? asObject(schema.formula_table) ?? schema;
  const unitsField =
    (typeof formula.unit_field === "string" && formula.unit_field) ||
    (typeof formula.units === "string" && formula.units) ||
    "units";
  const units = asNumber(inputs[unitsField]) ?? asNumber(inputs.units) ?? 1;
  const tiersUnknown = formula.tiers;
  if (Array.isArray(tiersUnknown)) {
    for (const tier of tiersUnknown) {
      const t = asObject(tier);
      if (!t) continue;
      const min = asNumber(t.min) ?? 0;
      const max = asNumber(t.max);
      const rate = asNumber(t.rate);
      if (rate === null) continue;
      if (units >= min && (max === null || units <= max))
        return roundCad(rate * units);
    }
  }
  const rate = asNumber(formula.rate);
  const perUnit = asNumber(formula.per_unit);
  const base = asNumber(formula.base) ?? asNumber(formula.base_rate) ?? 0;
  const multiplier = asNumber(formula.multiplier) ?? 1;
  if (rate !== null) return roundCad(rate * units * multiplier);
  if (perUnit !== null) return roundCad(base + perUnit * units);
  if (asNumber(formula.base_rate) !== null && perUnit === null)
    return roundCad(base);
  return null;
};

export const assertEligible = (
  product: ProductEmbed,
  quote: QuoteEmbed,
  inputs: Record<string, unknown>,
): void => {
  if (!product.active || product.deleted_at !== null)
    throw new HttpException("Product is not available for quoting", 400);
  if (!product.carrier.active)
    throw new HttpException("Carrier is not available for quoting", 400);
  if (!product.eligibility_rules) return;
  let rules: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(product.eligibility_rules);
    const obj = asObject(parsed);
    if (!obj)
      throw new HttpException("Product eligibility rules are unreadable", 400);
    rules = obj;
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new HttpException("Product eligibility rules are unreadable", 400);
  }
  const province = quote.organization.primary_province;
  const provinces =
    asStringArray(rules.allowed_provinces) ?? asStringArray(rules.provinces);
  if (provinces && !provinces.includes(province))
    throw new HttpException(
      `Product is not eligible in province ${province}`,
      400,
    );
  const types =
    asStringArray(rules.allowed_client_types) ??
    asStringArray(rules.client_types);
  if (types && !types.includes("individual"))
    throw new HttpException("Product is not eligible for this client type", 400);
  const languages =
    asStringArray(rules.allowed_languages) ?? asStringArray(rules.languages);
  if (languages && !languages.includes("en") && !languages.includes("fr"))
    throw new HttpException("Product is not eligible for this language", 400);
  const value =
    asNumber(inputs.insured_value) ??
    asNumber(inputs.value) ??
    asNumber(inputs.sum_insured);
  const min = asNumber(rules.min_value);
  const max = asNumber(rules.max_value);
  if (value !== null && min !== null && value < min)
    throw new HttpException("Insured value is below the product minimum", 400);
  if (value !== null && max !== null && value > max)
    throw new HttpException("Insured value exceeds the product maximum", 400);
};

export const loadQuote = async (orgId: string, quoteId: string) => {
  const row = await MyGlobal.prisma.broker_desk_quotes.findFirst({
    where: {
      id: quoteId,
      broker_desk_organization_id: orgId,
      deleted_at: null,
    },
    include: quoteInclude,
  });
  if (!row) throw new HttpException("Quote not found", 404);
  return row;
};

export const loadProduct = async (productId: string): Promise<ProductEmbed> => {
  const product = await MyGlobal.prisma.broker_desk_products.findFirst({
    where: { id: productId, deleted_at: null },
    include: productInclude,
  });
  if (!product) throw new HttpException("Product not found", 404);
  return product;
};

export const resolveProducer = async (
  orgId: string,
  adminEmail: string,
): Promise<ProducerEmbed> => {
  const matched = await MyGlobal.prisma.broker_desk_producers.findFirst({
    where: {
      broker_desk_organization_id: orgId,
      email: adminEmail,
      deleted_at: null,
      active: true,
    },
    include: { organization: true },
  });
  if (matched) return matched;
  const fallback = await MyGlobal.prisma.broker_desk_producers.findFirst({
    where: {
      broker_desk_organization_id: orgId,
      deleted_at: null,
      active: true,
    },
    orderBy: { created_at: "asc" },
    include: { organization: true },
  });
  if (!fallback)
    throw new HttpException(
      "No producer is available to own the quotation",
      400,
    );
  return fallback;
};

export const totalsFromLines = (
  lines: {
    premium_cad: number | null;
    broker_fee_cad: number | null;
    tax_amount_cad: number | null;
  }[],
): {
  total_premium_cad: number;
  total_broker_fee_cad: number;
  tax_amount_cad: number;
  grand_total_cad: number;
} => {
  const total_premium_cad = roundCad(
    lines.reduce((sum, line) => sum + (line.premium_cad ?? 0), 0),
  );
  const total_broker_fee_cad = roundCad(
    lines.reduce((sum, line) => sum + (line.broker_fee_cad ?? 0), 0),
  );
  const tax_amount_cad = roundCad(
    lines.reduce((sum, line) => sum + (line.tax_amount_cad ?? 0), 0),
  );
  return {
    total_premium_cad,
    total_broker_fee_cad,
    tax_amount_cad,
    grand_total_cad: roundCad(
      total_premium_cad + total_broker_fee_cad + tax_amount_cad,
    ),
  };
};

export const refreshQuoteTotals = async (
  db: Tx | typeof MyGlobal.prisma,
  quoteId: string,
  extra?: { status?: string; updated_at?: Date },
) => {
  const lines = await db.broker_desk_quote_lines.findMany({
    where: { broker_desk_quote_id: quoteId },
  });
  const totals = totalsFromLines(lines);
  await db.broker_desk_quotes.update({
    where: { id: quoteId },
    data: {
      ...totals,
      status: extra?.status,
      updated_at: extra?.updated_at ?? new Date(),
    },
  });
};

export const priceLineAmounts = (
  product: ProductEmbed,
  org: OrgEmbed,
  inputs: Record<string, unknown>,
  current: {
    premium_cad: number | null;
    broker_fee_cad: number | null;
  },
  override: {
    manual_premium_cad?: number | null;
    manual_broker_fee_cad?: number | null;
  },
): {
  premium_cad: number;
  broker_fee_cad: number;
  tax_amount_cad: number;
  commission_estimate_cad: number | null;
} => {
  const computed = computeFormulaPremium(product.rating_schema, inputs);
  let premium: number | null = null;
  if (override.manual_premium_cad !== undefined)
    premium = override.manual_premium_cad;
  else if (computed !== null) premium = computed;
  else premium = current.premium_cad;
  if (premium === null)
    throw new HttpException(
      `No premium available for product ${product.code}; supply a manual override`,
      400,
    );
  premium = roundCad(premium);
  if (premium < 0) throw new HttpException("Premium cannot be negative", 400);
  let fee: number | null = null;
  if (override.manual_broker_fee_cad !== undefined)
    fee = override.manual_broker_fee_cad;
  else fee = current.broker_fee_cad ?? 0;
  if (fee === null) fee = 0;
  fee = roundCad(fee);
  if (fee < 0) throw new HttpException("Broker fee cannot be negative", 400);
  const tax = taxFor(org, premium, fee);
  return {
    premium_cad: premium,
    broker_fee_cad: fee,
    tax_amount_cad: tax,
    commission_estimate_cad: commissionEstimate(product, premium),
  };
};

export const notifySubmissionChange = async (
  db: Tx | typeof MyGlobal.prisma,
  orgId: string,
  adminId: string,
  submissionId: string,
  status: string,
): Promise<void> => {
  const now = new Date();
  await db.broker_desk_notifications.create({
    data: {
      id: randomUUID(),
      broker_desk_organization_id: orgId,
      type: "submission_status_changed",
      title: "Submission status changed",
      body: `Carrier submission ${submissionId} is now ${status}.`,
      recipient_role: "ADMIN",
      recipient_user_id: adminId,
      source_entity_type: "broker_desk_submissions",
      source_entity_id: submissionId,
      created_at: now,
      updated_at: now,
    },
  });
};

type CoverageDraft = {
  code: string;
  name: string;
  limit_amount: number | null;
  deductible: number | null;
  premium: number;
};

const coverageFromUnknown = (
  value: unknown,
  fallbackCode: string,
): CoverageDraft | null => {
  const obj = asObject(value);
  if (!obj) return null;
  const code =
    (typeof obj.code === "string" && obj.code) ||
    (typeof obj.id === "string" && obj.id) ||
    fallbackCode;
  const name =
    (typeof obj.name === "string" && obj.name) ||
    (typeof obj.label === "string" && obj.label) ||
    code;
  return {
    code,
    name,
    limit_amount: asNumber(obj.limit_amount) ?? asNumber(obj.limit),
    deductible: asNumber(obj.deductible),
    premium: asNumber(obj.premium) ?? 0,
  };
};

export const coveragesFromSelections = (
  selections: Record<string, unknown>,
  product: ProductEmbed,
  linePremium: number,
): CoverageDraft[] => {
  const collected: CoverageDraft[] = [];
  const itemsUnknown = selections.items ?? selections.coverages;
  if (Array.isArray(itemsUnknown)) {
    itemsUnknown.forEach((item, index) => {
      const row = coverageFromUnknown(item, `COV-${index + 1}`);
      if (row) collected.push(row);
    });
  } else {
    for (const [key, value] of Object.entries(selections)) {
      if (key === "items" || key === "coverages") continue;
      const row = coverageFromUnknown(value, key);
      if (row) collected.push(row);
    }
  }
  if (collected.length === 0) {
    const catalog = (product.coverageItems ?? []).filter(
      (item) => item.deleted_at === null,
    );
    if (catalog.length > 0) {
      const share = roundCad(linePremium / catalog.length);
      catalog.forEach((item, index) => {
        collected.push({
          code: item.code,
          name: item.name,
          limit_amount: item.default_limit,
          deductible: null,
          premium:
            index === catalog.length - 1
              ? roundCad(linePremium - share * (catalog.length - 1))
              : share,
        });
      });
    }
  }
  if (collected.length === 0) {
    collected.push({
      code: "BASE",
      name: "Quoted coverage",
      limit_amount: null,
      deductible: null,
      premium: linePremium,
    });
  }
  const priced = collected.filter((row) => row.premium > 0);
  if (priced.length === 0) {
    const share = roundCad(linePremium / collected.length);
    collected.forEach((row, index) => {
      row.premium =
        index === collected.length - 1
          ? roundCad(linePremium - share * (collected.length - 1))
          : share;
    });
  }
  return collected;
};

export const toPolicyCoverage = (
  row: {
    id: string;
    code: string;
    name: string;
    limit_amount: number | null;
    deductible: number | null;
    premium: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  },
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

export const toPolicy = (
  row: {
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
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    organization: OrgEmbed;
    client: ClientEmbed;
    carrier: CarrierEmbed;
    product: ProductEmbed;
    producer: ProducerEmbed;
    coverages: {
      id: string;
      code: string;
      name: string;
      limit_amount: number | null;
      deductible: number | null;
      premium: number;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    }[];
  },
  quote: IBrokerDeskQuote,
  quoteLine: IBrokerDeskQuoteLine.ISummary,
): IBrokerDeskPolicy => {
  const payment =
    row.payment_plan === "semi_annual" ||
    row.payment_plan === "quarterly" ||
    row.payment_plan === "monthly"
      ? row.payment_plan
      : "annual";
  const status =
    row.status === "pending_cancel" ||
    row.status === "cancelled" ||
    row.status === "expired" ||
    row.status === "lapsed"
      ? row.status
      : "active";
  const summary: IBrokerDeskPolicy.ISummary = {
    id: row.id,
    client: toClientSummary(
      row.client,
      row.producer,
      row.organization.primary_province,
    ),
    carrier: toCarrierSummary(row.carrier),
    product: toProductSummary(row.product),
    producer: toProducerSummary(row.producer),
    org_policy_number: row.org_policy_number,
    carrier_policy_number: row.carrier_policy_number,
    status,
    term_start: isoRequired(row.term_start),
    term_end: isoRequired(row.term_end),
    billed_premium_cad: row.billed_premium_cad,
    broker_fee_cad: row.broker_fee_cad,
    tax_amount_cad: row.tax_amount_cad,
    payment_plan: payment,
    province_of_risk: row.province_of_risk,
  };
  const quoteSummary: IBrokerDeskQuote.ISummary = {
    id: quote.id,
    client: quote.client,
    producer: quote.producer,
    status: quote.status,
    desired_effective_date: quote.desired_effective_date,
    expires_at: quote.expires_at,
    total_premium_cad: quote.total_premium_cad,
    total_broker_fee_cad: quote.total_broker_fee_cad,
    tax_amount_cad: quote.tax_amount_cad,
    grand_total_cad: quote.grand_total_cad,
    line_count: quote.lines.length,
    created_at: quote.created_at,
  };
  return {
    id: row.id,
    organization: toOrgSummary(row.organization),
    client: summary.client,
    carrier: summary.carrier,
    product: summary.product,
    producer: summary.producer,
    quote: quoteSummary,
    quote_line: quoteLine,
    org_policy_number: row.org_policy_number,
    carrier_policy_number: row.carrier_policy_number,
    status,
    term_start: isoRequired(row.term_start),
    term_end: isoRequired(row.term_end),
    billed_premium_cad: row.billed_premium_cad,
    broker_fee_cad: row.broker_fee_cad,
    tax_amount_cad: row.tax_amount_cad,
    payment_plan: payment,
    province_of_risk: row.province_of_risk,
    created_at: isoRequired(row.created_at),
    updated_at: isoRequired(row.updated_at),
    deleted_at: iso(row.deleted_at),
    coverages: row.coverages.map((coverage) =>
      toPolicyCoverage(coverage, summary),
    ),
    endorsements: [],
    cancellations: [],
    prior_renewal: null,
    next_renewal: null,
  };
};
