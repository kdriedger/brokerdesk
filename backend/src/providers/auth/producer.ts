import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import {
  IBrokerDeskProducer,
  IBrokerDeskProducerLicence,
  IBrokerDeskProducerSession,
} from "../../api/structures/BrokerDeskActorsProducer";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import {
  toProducer,
  toProducerLicenceSummary,
  toProducerSessionSummary,
} from "../../transformers/producer";
import { JwtUtil } from "../../utils/JwtUtil";
import { pageArgs, pageOf } from "../../utils/pagination";
import { PasswordUtil } from "../../utils/PasswordUtil";
import { hashToken, newSecretToken } from "../../utils/token";

const SESSION_MS = 14 * 24 * 60 * 60 * 1000;
const RESET_MS = 60 * 60 * 1000;

const producerInclude = {
  organization: true,
  sessions: { orderBy: { created_at: "desc" as const }, take: 20 },
  licences: {
    where: { deleted_at: null },
    orderBy: { created_at: "desc" as const },
  },
};

const logDev = (label: string, email: string, token: string): void => {
  if (process.env.NODE_ENV !== "production")
    console.log(`[dev] ${label} for ${email}: ${token}`);
};

const isEmailVerified = async (
  producerId: string,
  email: string,
): Promise<boolean> => {
  const row =
    await MyGlobal.prisma.broker_desk_producer_email_verifications.findFirst({
      where: {
        broker_desk_producer_id: producerId,
        email,
        consumed_at: { not: null },
      },
    });
  return row !== null;
};

export const requireProducer = async () => {
  const token = JwtUtil.bearer();
  if (!token) throw new HttpException("Unauthorized", 401);
  const payload = JwtUtil.verify(token, "access");
  if (payload.typ !== "producer") throw new HttpException("Forbidden", 403);
  const producer = await MyGlobal.prisma.broker_desk_producers.findFirst({
    where: { id: payload.aid, deleted_at: null },
    include: producerInclude,
  });
  if (!producer || !producer.active)
    throw new HttpException("Unauthorized", 401);
  const session = await MyGlobal.prisma.broker_desk_producer_sessions.findFirst(
    {
      where: { id: payload.sid, broker_desk_producer_id: producer.id },
    },
  );
  if (!session || session.expired_at.getTime() <= Date.now())
    throw new HttpException("Unauthorized", 401);
  return { producer, session, payload };
};

const issueFor = async (
  producerId: string,
  sessionId: string,
  orgId: string,
): Promise<IBrokerDeskProducer.IAuthorized> => {
  const producer = await MyGlobal.prisma.broker_desk_producers.findFirstOrThrow(
    {
      where: { id: producerId },
      include: producerInclude,
    },
  );
  return {
    producer: toProducer(producer),
    token: JwtUtil.issue({
      typ: "producer",
      aid: producerId,
      sid: sessionId,
      oid: orgId,
    }),
  };
};

export const postAuthProducerLogin = async (
  body: IBrokerDeskProducer.ILogin,
): Promise<IBrokerDeskProducer.IAuthorized> => {
  const producer = await MyGlobal.prisma.broker_desk_producers.findFirst({
    where: { email: body.email, deleted_at: null },
  });
  if (!producer || !PasswordUtil.equals(body.password, producer.password_hash))
    throw new HttpException("Invalid credentials", 401);
  if (!producer.active) throw new HttpException("Account deactivated", 403);
  if (!(await isEmailVerified(producer.id, producer.email)))
    throw new HttpException("Email not verified", 403);

  const now = new Date();
  const ctx = MyGlobal.request();
  const session = await MyGlobal.prisma.broker_desk_producer_sessions.create({
    data: {
      id: randomUUID(),
      broker_desk_producer_id: producer.id,
      ip: ctx.ip,
      href: ctx.href,
      referrer: ctx.referrer,
      created_at: now,
      expired_at: new Date(now.getTime() + SESSION_MS),
    },
  });
  return issueFor(
    producer.id,
    session.id,
    producer.broker_desk_organization_id,
  );
};

export const postAuthProducerRefresh = async (
  body: IBrokerDeskProducer.IRefresh,
): Promise<IBrokerDeskProducer.IAuthorized> => {
  const payload = JwtUtil.verify(body.refresh_token, "refresh");
  if (payload.typ !== "producer") throw new HttpException("Forbidden", 403);
  const producer = await MyGlobal.prisma.broker_desk_producers.findFirst({
    where: { id: payload.aid, deleted_at: null },
  });
  if (!producer || !producer.active)
    throw new HttpException("Unauthorized", 401);
  const session = await MyGlobal.prisma.broker_desk_producer_sessions.findFirst(
    {
      where: { id: payload.sid, broker_desk_producer_id: producer.id },
    },
  );
  if (!session || session.expired_at.getTime() <= Date.now())
    throw new HttpException("Unauthorized", 401);
  await MyGlobal.prisma.broker_desk_producer_sessions.update({
    where: { id: session.id },
    data: { expired_at: new Date(Date.now() + SESSION_MS) },
  });
  return issueFor(
    producer.id,
    session.id,
    producer.broker_desk_organization_id,
  );
};

export const postAuthProducerPasswordResetRequest = async (
  body: IBrokerDeskProducer.IRequestPasswordReset,
): Promise<void> => {
  const producer = await MyGlobal.prisma.broker_desk_producers.findFirst({
    where: { email: body.email, deleted_at: null, active: true },
  });
  if (!producer) return;
  const token = newSecretToken();
  const now = new Date();
  const ctx = MyGlobal.request();
  await MyGlobal.prisma.broker_desk_producer_password_resets.create({
    data: {
      id: randomUUID(),
      broker_desk_producer_id: producer.id,
      token: hashToken(token),
      ip: ctx.ip,
      expired_at: new Date(now.getTime() + RESET_MS),
      created_at: now,
    },
  });
  logDev("producer password reset token", producer.email, token);
};

export const postAuthProducerPasswordResetConfirm = async (
  body: IBrokerDeskProducer.IConfirmPasswordReset,
): Promise<void> => {
  const row = await MyGlobal.prisma.broker_desk_producer_password_resets.findFirst(
    {
      where: { token: hashToken(body.token) },
    },
  );
  if (
    !row ||
    row.consumed_at !== null ||
    row.expired_at.getTime() <= Date.now()
  )
    throw new HttpException("Invalid or expired token", 400);
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.broker_desk_producers.update({
      where: { id: row.broker_desk_producer_id },
      data: {
        password_hash: PasswordUtil.hash(body.new_password),
        updated_at: now,
      },
    }),
    MyGlobal.prisma.broker_desk_producer_password_resets.update({
      where: { id: row.id },
      data: { consumed_at: now },
    }),
  ]);
};

export const postAuthProducerEmailVerifyRequest = async (
  body: IBrokerDeskProducer.IRequestEmailVerification,
): Promise<void> => {
  const producer = await MyGlobal.prisma.broker_desk_producers.findFirst({
    where: { email: body.email, deleted_at: null },
  });
  if (!producer) return;
  const token = newSecretToken();
  const now = new Date();
  await MyGlobal.prisma.broker_desk_producer_email_verifications.create({
    data: {
      id: randomUUID(),
      broker_desk_producer_id: producer.id,
      email: body.email,
      token: hashToken(token),
      created_at: now,
      expired_at: new Date(now.getTime() + RESET_MS),
    },
  });
  logDev("producer email verify token", body.email, token);
};

export const postAuthProducerEmailVerifyConfirm = async (
  body: IBrokerDeskProducer.IConfirmEmailVerification,
): Promise<void> => {
  const row =
    await MyGlobal.prisma.broker_desk_producer_email_verifications.findFirst({
      where: { token: hashToken(body.token), email: body.email },
    });
  if (
    !row ||
    row.consumed_at !== null ||
    row.expired_at.getTime() <= Date.now()
  )
    throw new HttpException("Invalid or expired token", 400);
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.broker_desk_producer_email_verifications.update({
      where: { id: row.id },
      data: { consumed_at: now },
    });
    if (body.new_password !== undefined) {
      await tx.broker_desk_producers.update({
        where: { id: row.broker_desk_producer_id },
        data: {
          password_hash: PasswordUtil.hash(body.new_password),
          updated_at: now,
        },
      });
    }
  });
};

export const getProducerMe = async (): Promise<IBrokerDeskProducer> => {
  const { producer } = await requireProducer();
  return toProducer(producer);
};

export const putProducerMe = async (
  body: IBrokerDeskProducer.IUpdate,
): Promise<IBrokerDeskProducer> => {
  const { producer } = await requireProducer();
  if (body.email !== undefined && body.email !== producer.email) {
    const clash = await MyGlobal.prisma.broker_desk_producers.findFirst({
      where: { email: body.email, id: { not: producer.id } },
    });
    if (clash) throw new HttpException("Email already registered", 409);
  }
  const updated = await MyGlobal.prisma.broker_desk_producers.update({
    where: { id: producer.id },
    data: {
      email: body.email ?? undefined,
      display_name: body.display_name ?? undefined,
      active: body.active ?? undefined,
      updated_at: new Date(),
    },
    include: producerInclude,
  });
  if (body.active === false) {
    await MyGlobal.prisma.broker_desk_producer_sessions.updateMany({
      where: {
        broker_desk_producer_id: producer.id,
        expired_at: { gt: new Date() },
      },
      data: { expired_at: new Date() },
    });
  }
  return toProducer(updated);
};

export const patchProducerMeSessions = async (
  body: IBrokerDeskProducerSession.IRequest,
): Promise<IPage<IBrokerDeskProducerSession.ISummary>> => {
  const { producer } = await requireProducer();
  const { page, limit, skip } = pageArgs(body);
  const where = { broker_desk_producer_id: producer.id };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_producer_sessions.count({ where }),
    MyGlobal.prisma.broker_desk_producer_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toProducerSessionSummary), total, page, limit);
};

export const patchProducerMeLicences = async (
  body: IBrokerDeskProducerLicence.IRequest,
): Promise<IPage<IBrokerDeskProducerLicence.ISummary>> => {
  const { producer } = await requireProducer();
  const { page, limit, skip } = pageArgs(body);
  const now = new Date();
  const where = {
    broker_desk_producer_id: producer.id,
    deleted_at: null,
    ...(body.province_code ? { province_code: body.province_code } : {}),
    ...(body.licence_type ? { licence_type: body.licence_type } : {}),
    ...(body.status ? { status: body.status } : {}),
    ...(body.expired === true
      ? { expiry_date: { lt: now } }
      : body.expiring_within_days !== undefined
        ? {
            expiry_date: {
              gte: now,
              lte: new Date(
                now.getTime() + body.expiring_within_days * 86400000,
              ),
            },
          }
        : body.expired === false
          ? { expiry_date: { gte: now } }
          : {}),
  };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_producer_licences.count({ where }),
    MyGlobal.prisma.broker_desk_producer_licences.findMany({
      where,
      orderBy: { expiry_date: "asc" },
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toProducerLicenceSummary), total, page, limit);
};

export { producerInclude };
