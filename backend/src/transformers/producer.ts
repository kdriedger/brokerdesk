import {
  IBrokerDeskProducer,
  IBrokerDeskProducerLicence,
  IBrokerDeskProducerSession,
} from "../api/structures/BrokerDeskActorsProducer";
import { iso, isoRequired } from "../utils/iso";
import { toOrganizationSummary } from "./organization";

type OrgRow = {
  id: string;
  legal_name: string;
  operating_name: string | null;
  primary_province: string;
  default_currency: string;
};

type SessionRow = {
  id: string;
  ip: string;
  href: string;
  referrer: string;
  created_at: Date;
  expired_at: Date;
};

type LicenceRow = {
  id: string;
  province_code: string;
  licence_type: string;
  licence_number: string;
  issue_date: Date;
  expiry_date: Date;
  status: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

type ProducerRow = {
  id: string;
  email: string;
  display_name: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  organization: OrgRow;
  sessions?: SessionRow[];
  licences?: LicenceRow[];
};

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

export const toProducer = (row: ProducerRow): IBrokerDeskProducer => ({
  id: row.id,
  organization: toOrganizationSummary(row.organization),
  email: row.email,
  display_name: row.display_name,
  active: row.active,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
  deleted_at: iso(row.deleted_at),
  sessions: (row.sessions ?? []).map(toProducerSessionSummary),
  licences: (row.licences ?? []).map(toProducerLicenceSummary),
});

export const toProducerSessionSummary = (
  row: SessionRow,
): IBrokerDeskProducerSession.ISummary => ({
  id: row.id,
  ip: row.ip,
  href: row.href,
  referrer: row.referrer,
  created_at: isoRequired(row.created_at),
  expired_at: isoRequired(row.expired_at),
});

export const toProducerLicenceSummary = (
  row: LicenceRow,
): IBrokerDeskProducerLicence.ISummary => ({
  id: row.id,
  province_code: row.province_code,
  licence_type: row.licence_type,
  licence_number: row.licence_number,
  issue_date: isoRequired(row.issue_date),
  expiry_date: isoRequired(row.expiry_date),
  status: row.status,
});

export const toProducerLicence = (
  row: LicenceRow,
  producer: ProducerRow,
): IBrokerDeskProducerLicence => ({
  id: row.id,
  producer: toProducerSummary(producer),
  province_code: row.province_code,
  licence_type: row.licence_type,
  licence_number: row.licence_number,
  issue_date: isoRequired(row.issue_date),
  expiry_date: isoRequired(row.expiry_date),
  status: row.status,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
  deleted_at: iso(row.deleted_at),
});
