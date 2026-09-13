import {
  IBrokerDeskGuest,
  IBrokerDeskGuestSession,
} from "../api/structures/BrokerDeskActorsGuest";
import { isoRequired } from "../utils/iso";

type GuestRow = {
  id: string;
  created_at: Date;
  updated_at: Date;
};

type SessionRow = {
  id: string;
  ip: string;
  href: string;
  referrer: string;
  created_at: Date;
  expired_at: Date;
};

export const toGuestSummary = (row: GuestRow): IBrokerDeskGuest.ISummary => ({
  id: row.id,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
});

export const toGuest = (
  row: GuestRow,
  sessions: SessionRow[],
): IBrokerDeskGuest => ({
  id: row.id,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
  sessions: sessions.map((s) => toGuestSession(row, s)),
});

export const toGuestSession = (
  guest: GuestRow,
  row: SessionRow,
): IBrokerDeskGuestSession => ({
  id: row.id,
  guest: toGuestSummary(guest),
  ip: row.ip,
  href: row.href,
  referrer: row.referrer,
  created_at: isoRequired(row.created_at),
  expired_at: isoRequired(row.expired_at),
});

export const toGuestSessionSummary = (
  row: SessionRow,
): IBrokerDeskGuestSession.ISummary => ({
  id: row.id,
  ip: row.ip,
  href: row.href,
  referrer: row.referrer,
  created_at: isoRequired(row.created_at),
  expired_at: isoRequired(row.expired_at),
});
