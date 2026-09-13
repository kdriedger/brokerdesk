import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import { IBrokerDeskAdmin } from "../../api/structures/BrokerDeskActorsAdmin";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { toAdmin, toAdminSummary } from "../../transformers/admin";
import { pageArgs, pageOf } from "../../utils/pagination";
import { PasswordUtil } from "../../utils/PasswordUtil";
import { hashToken, newSecretToken, placeholderPasswordHash } from "../../utils/token";
import { requireAdmin } from "../auth/admin";

const RESET_MS = 60 * 60 * 1000;

const adminInclude = {
  organization: true,
  sessions: { orderBy: { created_at: "desc" as const }, take: 20 },
};

const orgWhere = (orgId: string, body: IBrokerDeskAdmin.IRequest) => ({
  broker_desk_organization_id: orgId,
  deleted_at: null,
  ...(body.email
    ? { email: { contains: body.email, mode: "insensitive" as const } }
    : {}),
  ...(body.display_name
    ? {
        display_name: {
          contains: body.display_name,
          mode: "insensitive" as const,
        },
      }
    : {}),
  ...(body.active === undefined ? {} : { active: body.active }),
});

const loadOrgAdmin = async (adminId: string) => {
  const { admin: actor } = await requireAdmin();
  const target = await MyGlobal.prisma.broker_desk_admins.findFirst({
    where: {
      id: adminId,
      broker_desk_organization_id: actor.broker_desk_organization_id,
      deleted_at: null,
    },
    include: adminInclude,
  });
  if (!target) throw new HttpException("Not found", 404);
  return { actor, target };
};

const countOtherActive = async (orgId: string, exceptId: string) =>
  MyGlobal.prisma.broker_desk_admins.count({
    where: {
      broker_desk_organization_id: orgId,
      deleted_at: null,
      active: true,
      id: { not: exceptId },
    },
  });

const expireSessions = async (adminId: string): Promise<void> => {
  await MyGlobal.prisma.broker_desk_admin_sessions.updateMany({
    where: { broker_desk_admin_id: adminId, expired_at: { gt: new Date() } },
    data: { expired_at: new Date() },
  });
};

export const patchAdminAdmins = async (
  body: IBrokerDeskAdmin.IRequest,
): Promise<IPage<IBrokerDeskAdmin.ISummary>> => {
  const { admin } = await requireAdmin();
  const { page, limit, skip } = pageArgs(body);
  const where = orgWhere(admin.broker_desk_organization_id, body);
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_admins.count({ where }),
    MyGlobal.prisma.broker_desk_admins.findMany({
      where,
      include: { organization: true },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toAdminSummary), total, page, limit);
};

export const postAdminAdmins = async (
  body: IBrokerDeskAdmin.ICreate,
): Promise<IBrokerDeskAdmin> => {
  const { admin: actor } = await requireAdmin();
  const existing = await MyGlobal.prisma.broker_desk_admins.findFirst({
    where: { email: body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  const now = new Date();
  const created = await MyGlobal.prisma.broker_desk_admins.create({
    data: {
      id: randomUUID(),
      broker_desk_organization_id: actor.broker_desk_organization_id,
      email: body.email,
      password_hash: placeholderPasswordHash(PasswordUtil.hash),
      display_name: body.display_name,
      active: body.active,
      created_at: now,
      updated_at: now,
    },
    include: adminInclude,
  });
  const token = newSecretToken();
  await MyGlobal.prisma.broker_desk_admin_password_resets.create({
    data: {
      id: randomUUID(),
      broker_desk_admin_id: created.id,
      requested_by_admin_id: actor.id,
      token_hash: hashToken(token),
      expired_at: new Date(now.getTime() + RESET_MS),
      created_at: now,
    },
  });
  if (process.env.NODE_ENV !== "production")
    console.log(
      `[dev] invited admin password setup token for ${created.email}: ${token}`,
    );
  return toAdmin(created);
};

export const getAdminAdminsAt = async (
  adminId: string,
): Promise<IBrokerDeskAdmin> => {
  const { target } = await loadOrgAdmin(adminId);
  return toAdmin(target);
};

export const putAdminAdmins = async (
  adminId: string,
  body: IBrokerDeskAdmin.IUpdate,
): Promise<IBrokerDeskAdmin> => {
  const { actor, target } = await loadOrgAdmin(adminId);
  if (body.active === false && target.active) {
    const others = await countOtherActive(
      actor.broker_desk_organization_id,
      target.id,
    );
    if (others === 0)
      throw new HttpException("Cannot deactivate the last administrator", 409);
  }
  if (body.email !== undefined && body.email !== target.email) {
    const clash = await MyGlobal.prisma.broker_desk_admins.findFirst({
      where: { email: body.email, id: { not: target.id } },
    });
    if (clash) throw new HttpException("Email already registered", 409);
  }
  const updated = await MyGlobal.prisma.broker_desk_admins.update({
    where: { id: target.id },
    data: {
      email: body.email ?? undefined,
      display_name: body.display_name ?? undefined,
      active: body.active ?? undefined,
      updated_at: new Date(),
    },
    include: adminInclude,
  });
  if (body.active === false) await expireSessions(target.id);
  return toAdmin(updated);
};

export const deleteAdminAdmins = async (adminId: string): Promise<void> => {
  const { actor, target } = await loadOrgAdmin(adminId);
  if (target.id === actor.id)
    throw new HttpException("Cannot remove your own account", 400);
  if (target.active) {
    const others = await countOtherActive(
      actor.broker_desk_organization_id,
      target.id,
    );
    if (others === 0)
      throw new HttpException("Cannot remove the last administrator", 409);
  }
  const now = new Date();
  await MyGlobal.prisma.broker_desk_admins.update({
    where: { id: target.id },
    data: { deleted_at: now, active: false, updated_at: now },
  });
  await expireSessions(target.id);
};
