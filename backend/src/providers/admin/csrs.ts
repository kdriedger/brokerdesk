import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import { IBrokerDeskCsr } from "../../api/structures/BrokerDeskActorsCsr";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { toCsr, toCsrSummary } from "../../transformers/csr";
import { pageArgs, pageOf } from "../../utils/pagination";
import { hashToken, newSecretToken } from "../../utils/token";
import { requireAdmin } from "../auth/admin";
import { csrInclude } from "../auth/csr";

const RESET_MS = 60 * 60 * 1000;

const orgWhere = (orgId: string, body: IBrokerDeskCsr.IRequest) => ({
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

const loadOrgCsr = async (csrId: string) => {
  const { admin } = await requireAdmin();
  const csr = await MyGlobal.prisma.broker_desk_csrs.findFirst({
    where: {
      id: csrId,
      broker_desk_organization_id: admin.broker_desk_organization_id,
      deleted_at: null,
    },
    include: csrInclude,
  });
  if (!csr) throw new HttpException("Not found", 404);
  return { admin, csr };
};

const expireSessions = async (csrId: string): Promise<void> => {
  await MyGlobal.prisma.broker_desk_csr_sessions.updateMany({
    where: { broker_desk_csr_id: csrId, expired_at: { gt: new Date() } },
    data: { expired_at: new Date() },
  });
};

export const patchAdminCsrs = async (
  body: IBrokerDeskCsr.IRequest,
): Promise<IPage<IBrokerDeskCsr.ISummary>> => {
  const { admin } = await requireAdmin();
  const { page, limit, skip } = pageArgs(body);
  const where = orgWhere(admin.broker_desk_organization_id, body);
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_csrs.count({ where }),
    MyGlobal.prisma.broker_desk_csrs.findMany({
      where,
      include: { organization: true },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toCsrSummary), total, page, limit);
};

export const postAdminCsrs = async (
  body: IBrokerDeskCsr.ICreate,
): Promise<IBrokerDeskCsr> => {
  const { admin } = await requireAdmin();
  const existing = await MyGlobal.prisma.broker_desk_csrs.findFirst({
    where: {
      email: body.email,
      broker_desk_organization_id: admin.broker_desk_organization_id,
    },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  const now = new Date();
  const created = await MyGlobal.prisma.broker_desk_csrs.create({
    data: {
      id: randomUUID(),
      broker_desk_organization_id: admin.broker_desk_organization_id,
      email: body.email,
      password_hash: null,
      display_name: body.display_name,
      active: body.active,
      created_at: now,
      updated_at: now,
    },
    include: csrInclude,
  });
  const token = newSecretToken();
  await MyGlobal.prisma.broker_desk_csr_email_verifications.create({
    data: {
      id: randomUUID(),
      broker_desk_csr_id: created.id,
      email: created.email,
      token: hashToken(token),
      created_at: now,
      expired_at: new Date(now.getTime() + RESET_MS),
    },
  });
  if (process.env.NODE_ENV !== "production")
    console.log(
      `[dev] invited csr email setup token for ${created.email}: ${token}`,
    );
  return toCsr(created);
};

export const getAdminCsrsAt = async (csrId: string): Promise<IBrokerDeskCsr> => {
  const { csr } = await loadOrgCsr(csrId);
  return toCsr(csr);
};

export const putAdminCsrs = async (
  csrId: string,
  body: IBrokerDeskCsr.IUpdate,
): Promise<IBrokerDeskCsr> => {
  const { admin, csr } = await loadOrgCsr(csrId);
  if (body.email !== undefined && body.email !== csr.email) {
    const clash = await MyGlobal.prisma.broker_desk_csrs.findFirst({
      where: {
        email: body.email,
        broker_desk_organization_id: admin.broker_desk_organization_id,
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
  if (body.active === false) await expireSessions(csr.id);
  return toCsr(updated);
};

export const deleteAdminCsrs = async (csrId: string): Promise<void> => {
  const { csr } = await loadOrgCsr(csrId);
  const now = new Date();
  await MyGlobal.prisma.broker_desk_csrs.update({
    where: { id: csr.id },
    data: { deleted_at: now, active: false, updated_at: now },
  });
  await expireSessions(csr.id);
};
