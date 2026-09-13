import { IBrokerDeskOrganization } from "../api/structures/BrokerDeskSystematicOrganization";
import { isoRequired } from "../utils/iso";

const DEFAULT_SETTINGS: IBrokerDeskOrganization.ISettings = {
  tax_rates: [
    {
      province: "ON",
      code: "HST",
      rate: 13,
      broker_fee_taxable: true,
    },
  ],
};

export const parseSettings = (
  raw: string,
): IBrokerDeskOrganization.ISettings => {
  try {
    const parsed = JSON.parse(raw) as IBrokerDeskOrganization.ISettings;
    if (!parsed?.tax_rates) return DEFAULT_SETTINGS;
    return parsed;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const defaultSettings = (): IBrokerDeskOrganization.ISettings =>
  DEFAULT_SETTINGS;

export const toOrganization = (row: {
  id: string;
  legal_name: string;
  operating_name: string | null;
  primary_province: string;
  phone: string | null;
  hst_gst_number: string | null;
  default_currency: string;
  settings: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  created_at: Date;
  updated_at: Date;
}): IBrokerDeskOrganization => ({
  id: row.id,
  legal_name: row.legal_name,
  operating_name: row.operating_name,
  primary_province: row.primary_province,
  phone: row.phone,
  hst_gst_number: row.hst_gst_number,
  default_currency: row.default_currency,
  settings: parseSettings(row.settings),
  address_line1: row.address_line1,
  address_line2: row.address_line2,
  city: row.city,
  province: row.province,
  postal_code: row.postal_code,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
});

export const toOrganizationSummary = (row: {
  id: string;
  legal_name: string;
  operating_name: string | null;
  primary_province: string;
  default_currency: string;
}): IBrokerDeskOrganization.ISummary => ({
  id: row.id,
  legal_name: row.legal_name,
  operating_name: row.operating_name,
  primary_province: row.primary_province,
  default_currency: row.default_currency,
});
