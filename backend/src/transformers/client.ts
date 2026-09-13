import {
  IBrokerDeskClient,
  IBrokerDeskClientSession,
} from "../api/structures/BrokerDeskActorsClient";
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

type ClientRow = {
  id: string;
  email: string;
  active: boolean;
  email_verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
  organization: OrgRow;
  sessions?: SessionRow[];
};

export const toClientSummary = (
  row: ClientRow,
): IBrokerDeskClient.ISummary => ({
  id: row.id,
  organization: toOrganizationSummary(row.organization),
  email: row.email,
  active: row.active,
  email_verified_at: iso(row.email_verified_at),
  created_at: isoRequired(row.created_at),
});

export const toClient = (row: ClientRow): IBrokerDeskClient => ({
  id: row.id,
  organization: toOrganizationSummary(row.organization),
  email: row.email,
  active: row.active,
  email_verified_at: iso(row.email_verified_at),
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
  sessions: (row.sessions ?? []).map(toClientSessionSummary),
});

export const toClientSessionSummary = (
  row: SessionRow,
): IBrokerDeskClientSession.ISummary => ({
  id: row.id,
  ip: row.ip,
  href: row.href,
  referrer: row.referrer,
  created_at: isoRequired(row.created_at),
  expired_at: isoRequired(row.expired_at),
});
