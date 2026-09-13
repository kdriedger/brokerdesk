import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import { IBrokerDeskProducer } from "../../api/structures/BrokerDeskActorsProducer";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { toProducer, toProducerSummary } from "../../transformers/producer";
import { pageArgs, pageOf } from "../../utils/pagination";
import { PasswordUtil } from "../../utils/PasswordUtil";
import { hashToken, newSecretToken, placeholderPasswordHash } from "../../utils/token";
import { requireAdmin } from "../auth/admin";
import { producerInclude } from "../auth/producer";

const RESET_MS = 60 * 60 * 1000;

const orgWhere = (orgId: string, body: IBrokerDeskProducer.IRequest) => ({
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

export const loadOrgProducer = async (producerId: string) => {
  const { admin } = await requireAdmin();
  const producer = await MyGlobal.prisma.broker_desk_producers.findFirst({
    where: {
      id: producerId,
      broker_desk_organization_id: admin.broker_desk_organization_id,
      deleted_at: null,
    },
    include: producerInclude,
  });
  if (!producer) throw new HttpException("Not found", 404);
  return { admin, producer };
};

const expireSessions = async (producerId: string): Promise<void> => {
  await MyGlobal.prisma.broker_desk_producer_sessions.updateMany({
    where: {
      broker_desk_producer_id: producerId,
      expired_at: { gt: new Date() },
    },
    data: { expired_at: new Date() },
  });
};

export const patchAdminProducers = async (
  body: IBrokerDeskProducer.IRequest,
): Promise<IPage<IBrokerDeskProducer.ISummary>> => {
  const { admin } = await requireAdmin();
  const { page, limit, skip } = pageArgs(body);
  const where = orgWhere(admin.broker_desk_organization_id, body);
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_producers.count({ where }),
    MyGlobal.prisma.broker_desk_producers.findMany({
      where,
      include: { organization: true },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toProducerSummary), total, page, limit);
};

export const postAdminProducers = async (
  body: IBrokerDeskProducer.ICreate,
): Promise<IBrokerDeskProducer> => {
  const { admin } = await requireAdmin();
  const existing = await MyGlobal.prisma.broker_desk_producers.findFirst({
    where: { email: body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  const now = new Date();
  const created = await MyGlobal.prisma.broker_desk_producers.create({
    data: {
      id: randomUUID(),
      broker_desk_organization_id: admin.broker_desk_organization_id,
      email: body.email,
      password_hash: placeholderPasswordHash(PasswordUtil.hash),
      display_name: body.display_name,
      active: body.active,
      created_at: now,
      updated_at: now,
    },
    include: producerInclude,
  });
  const token = newSecretToken();
  await MyGlobal.prisma.broker_desk_producer_email_verifications.create({
    data: {
      id: randomUUID(),
      broker_desk_producer_id: created.id,
      email: created.email,
      token: hashToken(token),
      created_at: now,
      expired_at: new Date(now.getTime() + RESET_MS),
    },
  });
  if (process.env.NODE_ENV !== "production")
    console.log(
      `[dev] invited producer email setup token for ${created.email}: ${token}`,
    );
  return toProducer(created);
};

export const getAdminProducersAt = async (
  producerId: string,
): Promise<IBrokerDeskProducer> => {
  const { producer } = await loadOrgProducer(producerId);
  return toProducer(producer);
};

export const putAdminProducers = async (
  producerId: string,
  body: IBrokerDeskProducer.IUpdate,
): Promise<IBrokerDeskProducer> => {
  const { producer } = await loadOrgProducer(producerId);
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
  if (body.active === false) await expireSessions(producer.id);
  return toProducer(updated);
};

export const deleteAdminProducers = async (
  producerId: string,
): Promise<void> => {
  const { producer } = await loadOrgProducer(producerId);
  const now = new Date();
  await MyGlobal.prisma.broker_desk_producers.update({
    where: { id: producer.id },
    data: { deleted_at: now, active: false, updated_at: now },
  });
  await expireSessions(producer.id);
};
