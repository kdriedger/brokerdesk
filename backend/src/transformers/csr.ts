import {
  IBrokerDeskCsr,
  IBrokerDeskCsrSession,
} from "../api/structures/BrokerDeskActorsCsr";
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

type CsrRow = {
  id: string;
  email: string;
  display_name: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  organization: OrgRow;
  sessions?: SessionRow[];
};

export const toCsrSummary = (row: CsrRow): IBrokerDeskCsr.ISummary => ({
  id: row.id,
  organization: toOrganizationSummary(row.organization),
  email: row.email,
  display_name: row.display_name,
  active: row.active,
  created_at: isoRequired(row.created_at),
});

export const toCsr = (row: CsrRow): IBrokerDeskCsr => ({
  id: row.id,
  organization: toOrganizationSummary(row.organization),
  email: row.email,
  display_name: row.display_name,
  active: row.active,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
  deleted_at: iso(row.deleted_at),
  sessions: (row.sessions ?? []).map(toCsrSessionSummary),
});

export const toCsrSessionSummary = (
  row: SessionRow,
): IBrokerDeskCsrSession.ISummary => ({
  id: row.id,
  ip: row.ip,
  href: row.href,
  referrer: row.referrer,
  created_at: isoRequired(row.created_at),
  expired_at: isoRequired(row.expired_at),
});
