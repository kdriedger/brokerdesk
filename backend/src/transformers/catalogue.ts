import {
  ECarrierAppointmentStatus,
  ELineOfBusiness,
  IBrokerDeskCarrier,
  IBrokerDeskCarrierAppointment,
} from "../api/structures/BrokerDeskCatalogueCarrier";
import {
  IBrokerDeskCommissionSchedule,
  IBrokerDeskCoverageItem,
  IBrokerDeskProduct,
} from "../api/structures/BrokerDeskCatalogueProduct";
import { isoRequired } from "../utils/iso";

const LINES: readonly ELineOfBusiness[] = [
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

const STATUSES: readonly ECarrierAppointmentStatus[] = [
  "awaiting",
  "active",
  "expired",
  "terminated",
];

export const toLineOfBusiness = (value: string): ELineOfBusiness => {
  const found = LINES.find((item) => item === value);
  return found === undefined ? "other" : found;
};

export const toAppointmentStatus = (
  value: string,
): ECarrierAppointmentStatus => {
  const found = STATUSES.find((item) => item === value);
  return found === undefined ? "awaiting" : found;
};

export const parseRecord = (
  raw: string | null,
): Record<string, unknown> | null => {
  if (raw === null || raw.length === 0) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
      return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const stringifyRecord = (
  value: Record<string, unknown> | null | undefined,
): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return JSON.stringify(value);
};

export type CarrierRow = {
  id: string;
  name: string;
  code: string;
  financial_strength_note: string | null;
  website: string | null;
  service_email: string | null;
  service_phone: string | null;
  notes: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
  products?: Array<{
    id: string;
    name: string;
    code: string;
    line_of_business: string;
    active: boolean;
    deleted_at: Date | null;
  }>;
  _count?: { products: number };
};

export type ProductRow = {
  id: string;
  name: string;
  code: string;
  line_of_business: string;
  description: string | null;
  active: boolean;
  eligibility_rules: string | null;
  rating_schema: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  carrier: CarrierRow;
  coverageItems?: Array<{
    id: string;
    name: string;
    code: string;
    default_limit: number;
    is_optional: boolean;
    deleted_at: Date | null;
  }>;
  commissionSchedule?: {
    id: string;
    agency_rate_percent: number;
    producer_split_percent: number;
    deleted_at: Date | null;
  } | null;
  _count?: { coverageItems: number };
};

export type CoverageItemRow = {
  id: string;
  name: string;
  code: string;
  default_limit: number;
  is_optional: boolean;
  created_at: Date;
  updated_at: Date;
  product?: ProductRow;
};

export type CommissionScheduleRow = {
  id: string;
  agency_rate_percent: number;
  producer_split_percent: number;
  tier_table_json: string | null;
  created_at: Date;
  updated_at: Date;
  product: ProductRow;
};

export type AppointmentRow = {
  id: string;
  status: string;
  appointed_at: Date;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
  carrier: CarrierRow;
};

const liveProductCount = (row: CarrierRow): number =>
  row._count?.products ??
  (row.products ?? []).filter((item) => item.deleted_at === null).length;

const liveCoverageCount = (row: ProductRow): number =>
  row._count?.coverageItems ??
  (row.coverageItems ?? []).filter((item) => item.deleted_at === null).length;

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
  product_count: liveProductCount(row),
});

export const toCarrierProductSummary = (
  row: {
    id: string;
    name: string;
    code: string;
    line_of_business: string;
    active: boolean;
  },
): IBrokerDeskCarrier.IProductSummary => ({
  id: row.id,
  name: row.name,
  code: row.code,
  line_of_business: toLineOfBusiness(row.line_of_business),
  active: row.active,
});

export const toCarrier = (row: CarrierRow): IBrokerDeskCarrier => ({
  id: row.id,
  name: row.name,
  code: row.code,
  financial_strength_note: row.financial_strength_note,
  website: row.website,
  service_email: row.service_email,
  service_phone: row.service_phone,
  notes: row.notes,
  active: row.active,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
  products: (row.products ?? [])
    .filter((item) => item.deleted_at === null)
    .map(toCarrierProductSummary),
  product_count: liveProductCount(row),
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
  coverage_item_count: liveCoverageCount(row),
});

export const toProductCoverageSummary = (row: {
  id: string;
  name: string;
  code: string;
  default_limit: number;
  is_optional: boolean;
}): IBrokerDeskProduct.ICoverageItemSummary => ({
  id: row.id,
  name: row.name,
  code: row.code,
  default_limit: row.default_limit,
  is_optional: row.is_optional,
});

export const toProduct = (row: ProductRow): IBrokerDeskProduct => {
  const schedule = row.commissionSchedule;
  const liveSchedule =
    schedule === null || schedule === undefined || schedule.deleted_at !== null
      ? null
      : schedule;
  return {
    id: row.id,
    carrier: toCarrierSummary(row.carrier),
    name: row.name,
    code: row.code,
    line_of_business: toLineOfBusiness(row.line_of_business),
    description: row.description,
    active: row.active,
    eligibility_rules: parseRecord(row.eligibility_rules),
    rating_schema: parseRecord(row.rating_schema),
    created_at: isoRequired(row.created_at),
    updated_at: isoRequired(row.updated_at),
    coverage_items: (row.coverageItems ?? [])
      .filter((item) => item.deleted_at === null)
      .map(toProductCoverageSummary),
    coverage_item_count: liveCoverageCount(row),
    commission_schedule:
      liveSchedule === null
        ? null
        : {
            id: liveSchedule.id,
            agency_rate_percent: liveSchedule.agency_rate_percent,
            producer_split_percent: liveSchedule.producer_split_percent,
          },
  };
};

export const toCoverageItemSummary = (row: {
  id: string;
  name: string;
  code: string;
  default_limit: number;
  is_optional: boolean;
}): IBrokerDeskCoverageItem.ISummary => ({
  id: row.id,
  name: row.name,
  code: row.code,
  default_limit: row.default_limit,
  is_optional: row.is_optional,
});

export const toCoverageItem = (
  row: CoverageItemRow & { product: ProductRow },
): IBrokerDeskCoverageItem => ({
  id: row.id,
  product: toProductSummary(row.product),
  name: row.name,
  code: row.code,
  default_limit: row.default_limit,
  is_optional: row.is_optional,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
});

export const toCoverageItemInvert = (
  row: CoverageItemRow & { product: ProductRow },
): IBrokerDeskCoverageItem.IInvert => toCoverageItem(row);

export const toCommissionSchedule = (
  row: CommissionScheduleRow,
): IBrokerDeskCommissionSchedule => ({
  id: row.id,
  product: toProductSummary(row.product),
  agency_rate_percent: row.agency_rate_percent,
  producer_split_percent: row.producer_split_percent,
  tier_table_json: parseRecord(row.tier_table_json),
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
});

export const toAppointmentSummary = (
  row: AppointmentRow,
): IBrokerDeskCarrierAppointment.ISummary => ({
  id: row.id,
  carrier: toCarrierSummary(row.carrier),
  status: toAppointmentStatus(row.status),
  appointed_at: isoRequired(row.appointed_at),
  expires_at: isoRequired(row.expires_at),
});

export const toAppointment = (
  row: AppointmentRow,
): IBrokerDeskCarrierAppointment => ({
  id: row.id,
  carrier: toCarrierSummary(row.carrier),
  status: toAppointmentStatus(row.status),
  appointed_at: isoRequired(row.appointed_at),
  expires_at: isoRequired(row.expires_at),
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
});
