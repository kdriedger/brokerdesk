import {
  IBrokerDeskAdmin,
  IBrokerDeskAdminSession,
} from "../api/structures/BrokerDeskActorsAdmin";
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

type AdminRow = {
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

export const toAdmin = (row: AdminRow): IBrokerDeskAdmin => ({
  id: row.id,
  organization: toOrganizationSummary(row.organization),
  email: row.email,
  display_name: row.display_name,
  active: row.active,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
  deleted_at: iso(row.deleted_at),
  sessions: (row.sessions ?? []).map(toAdminSessionSummary),
});

export const toAdminSummary = (
  row: Omit<AdminRow, "sessions" | "deleted_at" | "updated_at"> & {
    updated_at?: Date;
    deleted_at?: Date | null;
  },
): IBrokerDeskAdmin.ISummary => ({
  id: row.id,
  organization: toOrganizationSummary(row.organization),
  email: row.email,
  display_name: row.display_name,
  active: row.active,
  created_at: isoRequired(row.created_at),
});

export const toAdminSessionSummary = (
  row: SessionRow,
): IBrokerDeskAdminSession.ISummary => ({
  id: row.id,
  ip: row.ip,
  href: row.href,
  referrer: row.referrer,
  created_at: isoRequired(row.created_at),
  expired_at: isoRequired(row.expired_at),
});
