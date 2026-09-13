import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import {
  IBrokerDeskGuest,
  IBrokerDeskGuestSession,
} from "../../api/structures/BrokerDeskActorsGuest";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import {
  toGuest,
  toGuestSessionSummary,
} from "../../transformers/guest";
import { JwtUtil } from "../../utils/JwtUtil";
import { pageArgs, pageOf } from "../../utils/pagination";

const GUEST_SESSION_MS = 60 * 60 * 1000;

const requireGuest = async () => {
  const token = JwtUtil.bearer();
  if (!token) throw new HttpException("Unauthorized", 401);
  const payload = JwtUtil.verify(token, "access");
  if (payload.typ !== "guest") throw new HttpException("Forbidden", 403);
  const guest = await MyGlobal.prisma.broker_desk_guests.findFirst({
    where: { id: payload.aid },
  });
  if (!guest) throw new HttpException("Unauthorized", 401);
  return { guest, payload };
};

export const postAuthGuestJoin = async (
  body: IBrokerDeskGuest.IJoin,
): Promise<IBrokerDeskGuest.IAuthorized> => {
  const now = new Date();
  const guestId = randomUUID();
  const sessionId = randomUUID();
  const guest = await MyGlobal.prisma.broker_desk_guests.create({
    data: { id: guestId, created_at: now, updated_at: now },
  });
  const session = await MyGlobal.prisma.broker_desk_guest_sessions.create({
    data: {
      id: sessionId,
      broker_desk_guest_id: guestId,
      ip: body.ip,
      href: body.href,
      referrer: body.referrer,
      created_at: now,
      expired_at: new Date(now.getTime() + GUEST_SESSION_MS),
    },
  });
  return {
    guest: toGuest(guest, [session]),
    token: JwtUtil.issue({ typ: "guest", aid: guestId, sid: sessionId }),
  };
};

export const patchAuthGuestSessions = async (
  body: IBrokerDeskGuestSession.IRequest,
): Promise<IPage<IBrokerDeskGuestSession.ISummary>> => {
  const { guest } = await requireGuest();
  const { page, limit, skip } = pageArgs(body);
  const where = { broker_desk_guest_id: guest.id };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_guest_sessions.count({ where }),
    MyGlobal.prisma.broker_desk_guest_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toGuestSessionSummary), total, page, limit);
};
