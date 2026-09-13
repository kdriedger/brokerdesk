import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import {
  IBrokerDeskClient,
  IBrokerDeskClientSession,
} from "../../api/structures/BrokerDeskActorsClient";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { toClient, toClientSessionSummary } from "../../transformers/client";
import { JwtUtil } from "../../utils/JwtUtil";
import { pageArgs, pageOf } from "../../utils/pagination";
import { PasswordUtil } from "../../utils/PasswordUtil";
import { hashToken, newSecretToken } from "../../utils/token";

const SESSION_MS = 14 * 24 * 60 * 60 * 1000;
const RESET_MS = 60 * 60 * 1000;

const clientInclude = {
  organization: true,
  sessions: { orderBy: { created_at: "desc" as const }, take: 20 },
};

const logDev = (label: string, email: string, token: string): void => {
  if (process.env.NODE_ENV !== "production")
    console.log(`[dev] ${label} for ${email}: ${token}`);
};

export const requireClient = async () => {
  const token = JwtUtil.bearer();
  if (!token) throw new HttpException("Unauthorized", 401);
  const payload = JwtUtil.verify(token, "access");
  if (payload.typ !== "client") throw new HttpException("Forbidden", 403);
  const client = await MyGlobal.prisma.broker_desk_clients.findFirst({
    where: { id: payload.aid },
    include: clientInclude,
  });
  if (!client || !client.active) throw new HttpException("Unauthorized", 401);
  const session = await MyGlobal.prisma.broker_desk_client_sessions.findFirst({
    where: { id: payload.sid, broker_desk_client_id: client.id },
  });
  if (!session || session.expired_at.getTime() <= Date.now())
    throw new HttpException("Unauthorized", 401);
  return { client, session, payload };
};

const issueFor = async (
  clientId: string,
  sessionId: string,
  orgId: string,
): Promise<IBrokerDeskClient.IAuthorized> => {
  const client = await MyGlobal.prisma.broker_desk_clients.findFirstOrThrow({
    where: { id: clientId },
    include: clientInclude,
  });
  return {
    client: toClient(client),
    token: JwtUtil.issue({
      typ: "client",
      aid: clientId,
      sid: sessionId,
      oid: orgId,
    }),
  };
};

export const postAuthClientLogin = async (
  body: IBrokerDeskClient.ILogin,
): Promise<IBrokerDeskClient.IAuthorized> => {
  const client = await MyGlobal.prisma.broker_desk_clients.findFirst({
    where: { email: body.email },
  });
  if (!client || !PasswordUtil.equals(body.password, client.password_hash))
    throw new HttpException("Invalid credentials", 401);
  if (!client.active) throw new HttpException("Account deactivated", 403);
  if (client.email_verified_at === null)
    throw new HttpException("Email not verified", 403);

  const now = new Date();
  const ctx = MyGlobal.request();
  const session = await MyGlobal.prisma.broker_desk_client_sessions.create({
    data: {
      id: randomUUID(),
      broker_desk_client_id: client.id,
      ip: ctx.ip,
      href: ctx.href,
      referrer: ctx.referrer,
      created_at: now,
      expired_at: new Date(now.getTime() + SESSION_MS),
    },
  });
  return issueFor(client.id, session.id, client.organization_id);
};

export const postAuthClientRefresh = async (
  body: IBrokerDeskClient.IRefresh,
): Promise<IBrokerDeskClient.IAuthorized> => {
  const payload = JwtUtil.verify(body.refresh_token, "refresh");
  if (payload.typ !== "client") throw new HttpException("Forbidden", 403);
  const client = await MyGlobal.prisma.broker_desk_clients.findFirst({
    where: { id: payload.aid },
  });
  if (!client || !client.active) throw new HttpException("Unauthorized", 401);
  const session = await MyGlobal.prisma.broker_desk_client_sessions.findFirst({
    where: { id: payload.sid, broker_desk_client_id: client.id },
  });
  if (!session || session.expired_at.getTime() <= Date.now())
    throw new HttpException("Unauthorized", 401);
  await MyGlobal.prisma.broker_desk_client_sessions.update({
    where: { id: session.id },
    data: { expired_at: new Date(Date.now() + SESSION_MS) },
  });
  return issueFor(client.id, session.id, client.organization_id);
};

export const postAuthClientPasswordResetRequest = async (
  body: IBrokerDeskClient.IRequestPasswordReset,
): Promise<void> => {
  const client = await MyGlobal.prisma.broker_desk_clients.findFirst({
    where: { email: body.email, active: true },
  });
  if (!client) return;
  const token = newSecretToken();
  const now = new Date();
  await MyGlobal.prisma.broker_desk_client_password_resets.create({
    data: {
      id: randomUUID(),
      broker_desk_client_id: client.id,
      token_hash: hashToken(token),
      expires_at: new Date(now.getTime() + RESET_MS),
      created_at: now,
      updated_at: now,
    },
  });
  logDev("client password reset token", client.email, token);
};

export const postAuthClientPasswordResetConfirm = async (
  body: IBrokerDeskClient.IConfirmPasswordReset,
): Promise<void> => {
  const row = await MyGlobal.prisma.broker_desk_client_password_resets.findFirst(
    {
      where: { token_hash: hashToken(body.token) },
    },
  );
  if (!row || row.used_at !== null || row.expires_at.getTime() <= Date.now())
    throw new HttpException("Invalid or expired token", 400);
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.broker_desk_clients.update({
      where: { id: row.broker_desk_client_id },
      data: {
        password_hash: PasswordUtil.hash(body.new_password),
        updated_at: now,
      },
    }),
    MyGlobal.prisma.broker_desk_client_password_resets.update({
      where: { id: row.id },
      data: { used_at: now, updated_at: now },
    }),
  ]);
};

export const postAuthClientEmailVerifyRequest = async (
  body: IBrokerDeskClient.IRequestEmailVerification,
): Promise<void> => {
  const client = await MyGlobal.prisma.broker_desk_clients.findFirst({
    where: { email: body.email },
  });
  if (!client) return;
  const token = newSecretToken();
  const now = new Date();
  await MyGlobal.prisma.broker_desk_client_email_verifications.create({
    data: {
      id: randomUUID(),
      broker_desk_client_id: client.id,
      email: body.email,
      token_hash: hashToken(token),
      created_at: now,
      expires_at: new Date(now.getTime() + RESET_MS),
    },
  });
  logDev("client email verify token", body.email, token);
};

export const postAuthClientEmailVerifyConfirm = async (
  body: IBrokerDeskClient.IConfirmEmailVerification,
): Promise<void> => {
  const row =
    await MyGlobal.prisma.broker_desk_client_email_verifications.findFirst({
      where: { token_hash: hashToken(body.token), email: body.email },
    });
  if (
    !row ||
    row.verified_at !== null ||
    row.expires_at.getTime() <= Date.now()
  )
    throw new HttpException("Invalid or expired token", 400);
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.broker_desk_client_email_verifications.update({
      where: { id: row.id },
      data: { verified_at: now },
    }),
    MyGlobal.prisma.broker_desk_clients.update({
      where: { id: row.broker_desk_client_id },
      data: { email_verified_at: now, updated_at: now },
    }),
  ]);
};

export const getClientMe = async (): Promise<IBrokerDeskClient> => {
  const { client } = await requireClient();
  return toClient(client);
};

export const putClientMe = async (
  body: IBrokerDeskClient.IUpdate,
): Promise<IBrokerDeskClient> => {
  const { client } = await requireClient();
  if (body.email !== undefined && body.email !== client.email) {
    const clash = await MyGlobal.prisma.broker_desk_clients.findFirst({
      where: { email: body.email, id: { not: client.id } },
    });
    if (clash) throw new HttpException("Email already registered", 409);
  }
  const updated = await MyGlobal.prisma.broker_desk_clients.update({
    where: { id: client.id },
    data: {
      email: body.email ?? undefined,
      active: body.active ?? undefined,
      email_verified_at:
        body.email !== undefined && body.email !== client.email
          ? null
          : undefined,
      updated_at: new Date(),
    },
    include: clientInclude,
  });
  if (body.active === false) {
    await MyGlobal.prisma.broker_desk_client_sessions.updateMany({
      where: {
        broker_desk_client_id: client.id,
        expired_at: { gt: new Date() },
      },
      data: { expired_at: new Date() },
    });
  }
  return toClient(updated);
};

export const patchClientMeSessions = async (
  body: IBrokerDeskClientSession.IRequest,
): Promise<IPage<IBrokerDeskClientSession.ISummary>> => {
  const { client } = await requireClient();
  const { page, limit, skip } = pageArgs(body);
  const where = { broker_desk_client_id: client.id };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_client_sessions.count({ where }),
    MyGlobal.prisma.broker_desk_client_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toClientSessionSummary), total, page, limit);
};

export { clientInclude };
