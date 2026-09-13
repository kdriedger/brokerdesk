import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import { IBrokerDeskClient } from "../../api/structures/BrokerDeskActorsClient";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { toClient, toClientSummary } from "../../transformers/client";
import { pageArgs, pageOf } from "../../utils/pagination";
import { PasswordUtil } from "../../utils/PasswordUtil";
import { hashToken, newSecretToken, placeholderPasswordHash } from "../../utils/token";
import { requireAdmin } from "../auth/admin";
import { clientInclude } from "../auth/client";

const RESET_MS = 60 * 60 * 1000;

const orgWhere = (orgId: string, body: IBrokerDeskClient.IRequest) => ({
  organization_id: orgId,
  ...(body.email
    ? { email: { contains: body.email, mode: "insensitive" as const } }
    : {}),
  ...(body.active === undefined ? {} : { active: body.active }),
});

const loadOrgClient = async (clientId: string) => {
  const { admin } = await requireAdmin();
  const client = await MyGlobal.prisma.broker_desk_clients.findFirst({
    where: {
      id: clientId,
      organization_id: admin.broker_desk_organization_id,
    },
    include: clientInclude,
  });
  if (!client) throw new HttpException("Not found", 404);
  return { admin, client };
};

const expireSessions = async (clientId: string): Promise<void> => {
  await MyGlobal.prisma.broker_desk_client_sessions.updateMany({
    where: { broker_desk_client_id: clientId, expired_at: { gt: new Date() } },
    data: { expired_at: new Date() },
  });
};

export const patchAdminClients = async (
  body: IBrokerDeskClient.IRequest,
): Promise<IPage<IBrokerDeskClient.ISummary>> => {
  const { admin } = await requireAdmin();
  const { page, limit, skip } = pageArgs(body);
  const where = orgWhere(admin.broker_desk_organization_id, body);
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_clients.count({ where }),
    MyGlobal.prisma.broker_desk_clients.findMany({
      where,
      include: { organization: true },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toClientSummary), total, page, limit);
};

export const postAdminClients = async (
  body: IBrokerDeskClient.ICreate,
): Promise<IBrokerDeskClient> => {
  const { admin } = await requireAdmin();
  const existing = await MyGlobal.prisma.broker_desk_clients.findFirst({
    where: { email: body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  const now = new Date();
  const created = await MyGlobal.prisma.broker_desk_clients.create({
    data: {
      id: randomUUID(),
      organization_id: admin.broker_desk_organization_id,
      email: body.email,
      password_hash: placeholderPasswordHash(PasswordUtil.hash),
      active: body.active,
      created_at: now,
      updated_at: now,
    },
    include: clientInclude,
  });
  const verifyToken = newSecretToken();
  const resetToken = newSecretToken();
  await MyGlobal.prisma.broker_desk_client_email_verifications.create({
    data: {
      id: randomUUID(),
      broker_desk_client_id: created.id,
      email: created.email,
      token_hash: hashToken(verifyToken),
      created_at: now,
      expires_at: new Date(now.getTime() + RESET_MS),
    },
  });
  await MyGlobal.prisma.broker_desk_client_password_resets.create({
    data: {
      id: randomUUID(),
      broker_desk_client_id: created.id,
      token_hash: hashToken(resetToken),
      expires_at: new Date(now.getTime() + RESET_MS),
      created_at: now,
      updated_at: now,
    },
  });
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[dev] invited client email verify token for ${created.email}: ${verifyToken}`,
    );
    console.log(
      `[dev] invited client password setup token for ${created.email}: ${resetToken}`,
    );
  }
  return toClient(created);
};

export const getAdminClientsAt = async (
  clientId: string,
): Promise<IBrokerDeskClient> => {
  const { client } = await loadOrgClient(clientId);
  return toClient(client);
};

export const putAdminClients = async (
  clientId: string,
  body: IBrokerDeskClient.IUpdate,
): Promise<IBrokerDeskClient> => {
  const { client } = await loadOrgClient(clientId);
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
  if (body.active === false) await expireSessions(client.id);
  return toClient(updated);
};

export const deleteAdminClients = async (clientId: string): Promise<void> => {
  const { client } = await loadOrgClient(clientId);
  const now = new Date();
  await MyGlobal.prisma.broker_desk_clients.update({
    where: { id: client.id },
    data: { active: false, updated_at: now },
  });
  await expireSessions(client.id);
};
