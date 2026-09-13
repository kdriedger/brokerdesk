import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import {
  IBrokerDeskCsr,
  IBrokerDeskCsrSession,
} from "../../api/structures/BrokerDeskActorsCsr";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { toCsr, toCsrSessionSummary } from "../../transformers/csr";
import { JwtUtil } from "../../utils/JwtUtil";
import { pageArgs, pageOf } from "../../utils/pagination";
import { PasswordUtil } from "../../utils/PasswordUtil";
import { hashToken, newSecretToken } from "../../utils/token";

const SESSION_MS = 14 * 24 * 60 * 60 * 1000;
const RESET_MS = 60 * 60 * 1000;

const csrInclude = {
  organization: true,
  sessions: { orderBy: { created_at: "desc" as const }, take: 20 },
};

const logDev = (label: string, email: string, token: string): void => {
  if (process.env.NODE_ENV !== "production")
    console.log(`[dev] ${label} for ${email}: ${token}`);
};

const isEmailVerified = async (
  csrId: string,
  email: string,
): Promise<boolean> => {
  const row = await MyGlobal.prisma.broker_desk_csr_email_verifications.findFirst(
    {
      where: {
        broker_desk_csr_id: csrId,
        email,
        consumed_at: { not: null },
      },
    },
  );
  return row !== null;
};

export const requireCsr = async () => {
  const token = JwtUtil.bearer();
  if (!token) throw new HttpException("Unauthorized", 401);
  const payload = JwtUtil.verify(token, "access");
  if (payload.typ !== "csr") throw new HttpException("Forbidden", 403);
  const csr = await MyGlobal.prisma.broker_desk_csrs.findFirst({
    where: { id: payload.aid, deleted_at: null },
    include: csrInclude,
  });
  if (!csr || !csr.active) throw new HttpException("Unauthorized", 401);
  const session = await MyGlobal.prisma.broker_desk_csr_sessions.findFirst({
    where: { id: payload.sid, broker_desk_csr_id: csr.id },
  });
  if (!session || session.expired_at.getTime() <= Date.now())
    throw new HttpException("Unauthorized", 401);
  return { csr, session, payload };
};

const issueFor = async (
  csrId: string,
  sessionId: string,
  orgId: string,
): Promise<IBrokerDeskCsr.IAuthorized> => {
  const csr = await MyGlobal.prisma.broker_desk_csrs.findFirstOrThrow({
    where: { id: csrId },
    include: csrInclude,
  });
  return {
    csr: toCsr(csr),
    token: JwtUtil.issue({
      typ: "csr",
      aid: csrId,
      sid: sessionId,
      oid: orgId,
    }),
  };
};

export const postAuthCsrLogin = async (
  body: IBrokerDeskCsr.ILogin,
): Promise<IBrokerDeskCsr.IAuthorized> => {
  const candidates = await MyGlobal.prisma.broker_desk_csrs.findMany({
    where: { email: body.email, deleted_at: null },
  });
  const csr = candidates.find(
    (row) =>
      row.password_hash !== null &&
      PasswordUtil.equals(body.password, row.password_hash),
  );
  if (!csr) throw new HttpException("Invalid credentials", 401);
  if (!csr.active) throw new HttpException("Account deactivated", 403);
  if (!(await isEmailVerified(csr.id, csr.email)))
    throw new HttpException("Email not verified", 403);

  const now = new Date();
  const ctx = MyGlobal.request();
  const session = await MyGlobal.prisma.broker_desk_csr_sessions.create({
    data: {
      id: randomUUID(),
      broker_desk_csr_id: csr.id,
      ip: ctx.ip,
      href: ctx.href,
      referrer: ctx.referrer,
      created_at: now,
      expired_at: new Date(now.getTime() + SESSION_MS),
    },
  });
  return issueFor(csr.id, session.id, csr.broker_desk_organization_id);
};

export const postAuthCsrRefresh = async (
  body: IBrokerDeskCsr.IRefresh,
): Promise<IBrokerDeskCsr.IAuthorized> => {
  const payload = JwtUtil.verify(body.refresh_token, "refresh");
  if (payload.typ !== "csr") throw new HttpException("Forbidden", 403);
  const csr = await MyGlobal.prisma.broker_desk_csrs.findFirst({
    where: { id: payload.aid, deleted_at: null },
  });
  if (!csr || !csr.active) throw new HttpException("Unauthorized", 401);
  const session = await MyGlobal.prisma.broker_desk_csr_sessions.findFirst({
    where: { id: payload.sid, broker_desk_csr_id: csr.id },
  });
  if (!session || session.expired_at.getTime() <= Date.now())
    throw new HttpException("Unauthorized", 401);
  await MyGlobal.prisma.broker_desk_csr_sessions.update({
    where: { id: session.id },
    data: { expired_at: new Date(Date.now() + SESSION_MS) },
  });
  return issueFor(csr.id, session.id, csr.broker_desk_organization_id);
};

export const postAuthCsrPasswordResetRequest = async (
  body: IBrokerDeskCsr.IRequestPasswordReset,
): Promise<void> => {
  const csrs = await MyGlobal.prisma.broker_desk_csrs.findMany({
    where: { email: body.email, deleted_at: null, active: true },
  });
  const now = new Date();
  for (const csr of csrs) {
    const token = newSecretToken();
    await MyGlobal.prisma.broker_desk_csr_password_resets.create({
      data: {
        id: randomUUID(),
        broker_desk_csr_id: csr.id,
        token_hash: hashToken(token),
        expires_at: new Date(now.getTime() + RESET_MS),
        created_at: now,
        updated_at: now,
      },
    });
    logDev("csr password reset token", csr.email, token);
  }
};

export const postAuthCsrPasswordResetConfirm = async (
  body: IBrokerDeskCsr.IConfirmPasswordReset,
): Promise<void> => {
  const row = await MyGlobal.prisma.broker_desk_csr_password_resets.findFirst({
    where: { token_hash: hashToken(body.token) },
  });
  if (!row || row.used_at !== null || row.expires_at.getTime() <= Date.now())
    throw new HttpException("Invalid or expired token", 400);
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.broker_desk_csrs.update({
      where: { id: row.broker_desk_csr_id },
      data: {
        password_hash: PasswordUtil.hash(body.new_password),
        updated_at: now,
      },
    }),
    MyGlobal.prisma.broker_desk_csr_password_resets.update({
      where: { id: row.id },
      data: { used_at: now, updated_at: now },
    }),
  ]);
};

export const postAuthCsrEmailVerifyRequest = async (
  body: IBrokerDeskCsr.IRequestEmailVerification,
): Promise<void> => {
  const csrs = await MyGlobal.prisma.broker_desk_csrs.findMany({
    where: { email: body.email, deleted_at: null },
  });
  const now = new Date();
  for (const csr of csrs) {
    const token = newSecretToken();
    await MyGlobal.prisma.broker_desk_csr_email_verifications.create({
      data: {
        id: randomUUID(),
        broker_desk_csr_id: csr.id,
        email: body.email,
        token: hashToken(token),
        created_at: now,
        expired_at: new Date(now.getTime() + RESET_MS),
      },
    });
    logDev("csr email verify token", body.email, token);
  }
};

export const postAuthCsrEmailVerifyConfirm = async (
  body: IBrokerDeskCsr.IConfirmEmailVerification,
): Promise<void> => {
  const row = await MyGlobal.prisma.broker_desk_csr_email_verifications.findFirst(
    {
      where: { token: hashToken(body.token), email: body.email },
    },
  );
  if (
    !row ||
    row.consumed_at !== null ||
    row.expired_at.getTime() <= Date.now()
  )
    throw new HttpException("Invalid or expired token", 400);
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.broker_desk_csr_email_verifications.update({
      where: { id: row.id },
      data: { consumed_at: now },
    });
    if (body.new_password !== undefined) {
      await tx.broker_desk_csrs.update({
        where: { id: row.broker_desk_csr_id },
        data: {
          password_hash: PasswordUtil.hash(body.new_password),
          updated_at: now,
        },
      });
    }
  });
};

export const getCsrMe = async (): Promise<IBrokerDeskCsr> => {
  const { csr } = await requireCsr();
  return toCsr(csr);
};

export const putCsrMe = async (
  body: IBrokerDeskCsr.IUpdate,
): Promise<IBrokerDeskCsr> => {
  const { csr } = await requireCsr();
  if (body.email !== undefined && body.email !== csr.email) {
    const clash = await MyGlobal.prisma.broker_desk_csrs.findFirst({
      where: {
        email: body.email,
        broker_desk_organization_id: csr.broker_desk_organization_id,
        id: { not: csr.id },
      },
    });
    if (clash) throw new HttpException("Email already registered", 409);
  }
  const updated = await MyGlobal.prisma.broker_desk_csrs.update({
    where: { id: csr.id },
    data: {
      email: body.email ?? undefined,
      display_name: body.display_name ?? undefined,
      active: body.active ?? undefined,
      updated_at: new Date(),
    },
    include: csrInclude,
  });
  if (body.active === false) {
    await MyGlobal.prisma.broker_desk_csr_sessions.updateMany({
      where: {
        broker_desk_csr_id: csr.id,
        expired_at: { gt: new Date() },
      },
      data: { expired_at: new Date() },
    });
  }
  return toCsr(updated);
};

export const patchCsrMeSessions = async (
  body: IBrokerDeskCsrSession.IRequest,
): Promise<IPage<IBrokerDeskCsrSession.ISummary>> => {
  const { csr } = await requireCsr();
  const { page, limit, skip } = pageArgs(body);
  const where = { broker_desk_csr_id: csr.id };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_csr_sessions.count({ where }),
    MyGlobal.prisma.broker_desk_csr_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toCsrSessionSummary), total, page, limit);
};

export { csrInclude };
