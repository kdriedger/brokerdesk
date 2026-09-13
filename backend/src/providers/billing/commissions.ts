import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import { IBrokerDeskCommission } from "../../api/structures/BrokerDeskBilling";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { pageArgs, pageOf } from "../../utils/pagination";
import { requireAdmin } from "../auth/admin";
import { writeAdminAudit } from "../systematic/auditWrite";
import {
  cad,
  commissionInclude,
  toCommission,
  toCommissionSummary,
} from "./mappers";

const loadCommission = async (orgId: string, commissionId: string) => {
  const row = await MyGlobal.prisma.broker_desk_commissions.findFirst({
    where: { id: commissionId, broker_desk_organization_id: orgId },
    include: commissionInclude,
  });
  if (!row) throw new HttpException("Commission not found", 404);
  return row;
};

const commissionWhere = (
  orgId: string,
  body: IBrokerDeskCommission.IRequest,
  producerId?: string,
) => ({
  broker_desk_organization_id: orgId,
  deleted_at: null,
  ...(producerId ? { broker_desk_producer_id: producerId } : {}),
  ...(body.broker_desk_producer_id && !producerId
    ? { broker_desk_producer_id: body.broker_desk_producer_id }
    : {}),
  ...(body.broker_desk_carrier_id
    ? { broker_desk_carrier_id: body.broker_desk_carrier_id }
    : {}),
  ...(body.broker_desk_policy_id
    ? { broker_desk_policy_id: body.broker_desk_policy_id }
    : {}),
  ...(body.status ? { status: body.status } : {}),
  ...(body.statement_period
    ? { statement_period: body.statement_period }
    : {}),
  ...(body.statement_period_from || body.statement_period_to
    ? {
        statement_period: {
          ...(body.statement_period_from
            ? { gte: body.statement_period_from }
            : {}),
          ...(body.statement_period_to
            ? { lte: body.statement_period_to }
            : {}),
        },
      }
    : {}),
});

export const patchCommissions = async (
  body: IBrokerDeskCommission.IRequest,
): Promise<IPage<IBrokerDeskCommission.ISummary>> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const { page, limit, skip } = pageArgs(body);
  const where = commissionWhere(orgId, body);
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_commissions.count({ where }),
    MyGlobal.prisma.broker_desk_commissions.findMany({
      where,
      include: commissionInclude,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
  ]);
  return pageOf(rows.map(toCommissionSummary), total, page, limit);
};

export const patchMyCommissions = async (
  body: IBrokerDeskCommission.IRequest,
): Promise<IPage<IBrokerDeskCommission.ISummary>> => {
  await requireAdmin();
  const { page, limit } = pageArgs(body);
  return pageOf([], 0, page, limit);
};

export const getCommission = async (
  commissionId: string,
): Promise<IBrokerDeskCommission> => {
  const { admin } = await requireAdmin();
  return toCommission(
    await loadCommission(admin.broker_desk_organization_id, commissionId),
  );
};

export const createCommission = async (
  body: IBrokerDeskCommission.ICreate,
): Promise<IBrokerDeskCommission> => {
  const { admin, session } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const policy = await MyGlobal.prisma.broker_desk_policies.findFirst({
    where: {
      id: body.broker_desk_policy_id,
      organization_id: orgId,
      deleted_at: null,
    },
  });
  if (!policy) throw new HttpException("Policy not found", 404);
  const carrier = await MyGlobal.prisma.broker_desk_carriers.findFirst({
    where: { id: body.broker_desk_carrier_id },
  });
  if (!carrier) throw new HttpException("Carrier not found", 404);
  const producer = await MyGlobal.prisma.broker_desk_producers.findFirst({
    where: {
      id: body.broker_desk_producer_id,
      broker_desk_organization_id: orgId,
      deleted_at: null,
    },
  });
  if (!producer) throw new HttpException("Producer not found", 404);
  if (body.broker_desk_policy_endorsement_id) {
    const endorsement =
      await MyGlobal.prisma.broker_desk_policy_endorsements.findFirst({
        where: {
          id: body.broker_desk_policy_endorsement_id,
          broker_desk_policy_id: policy.id,
        },
      });
    if (!endorsement) throw new HttpException("Endorsement not found", 404);
  }
  const now = new Date();
  const id = randomUUID();
  await MyGlobal.prisma.broker_desk_commissions.create({
    data: {
      id,
      broker_desk_organization_id: orgId,
      broker_desk_policy_id: body.broker_desk_policy_id,
      broker_desk_policy_endorsement_id: body.broker_desk_policy_endorsement_id,
      broker_desk_carrier_id: body.broker_desk_carrier_id,
      broker_desk_producer_id: body.broker_desk_producer_id,
      premium_basis_cad: cad(body.premium_basis_cad),
      agency_rate_percent: body.agency_rate_percent,
      agency_amount_cad: cad(body.agency_amount_cad),
      producer_split_rate_percent: body.producer_split_rate_percent,
      producer_amount_cad: cad(body.producer_amount_cad),
      status: body.status,
      statement_period: body.statement_period,
      created_at: now,
      updated_at: now,
    },
  });
  await writeAdminAudit({
    orgId,
    adminId: admin.id,
    sessionId: session.id,
    action: "create",
    entityType: "commission",
    entityRefId: id,
    after: { status: body.status, statement_period: body.statement_period },
  });
  return toCommission(await loadCommission(orgId, id));
};

export const updateCommission = async (
  commissionId: string,
  body: IBrokerDeskCommission.IUpdate,
): Promise<IBrokerDeskCommission> => {
  const { admin, session } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const existing = await loadCommission(orgId, commissionId);
  if (existing.deleted_at) throw new HttpException("Commission not found", 404);
  if (existing.statement && existing.statement.status === "paid")
    throw new HttpException(
      "Settled commissions on a paid statement are immutable",
      409,
    );
  const now = new Date();
  await MyGlobal.prisma.broker_desk_commissions.update({
    where: { id: commissionId },
    data: {
      agency_rate_percent: body.agency_rate_percent,
      agency_amount_cad:
        body.agency_amount_cad === undefined
          ? undefined
          : cad(body.agency_amount_cad),
      producer_split_rate_percent: body.producer_split_rate_percent,
      producer_amount_cad:
        body.producer_amount_cad === undefined
          ? undefined
          : cad(body.producer_amount_cad),
      status: body.status,
      statement_period: body.statement_period,
      updated_at: now,
    },
  });
  await writeAdminAudit({
    orgId,
    adminId: admin.id,
    sessionId: session.id,
    action: "update",
    entityType: "commission",
    entityRefId: commissionId,
    before: { status: existing.status },
    after: { status: body.status ?? existing.status },
  });
  return toCommission(await loadCommission(orgId, commissionId));
};

export const eraseCommission = async (commissionId: string): Promise<void> => {
  const { admin, session } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const existing = await loadCommission(orgId, commissionId);
  if (existing.deleted_at) return;
  if (existing.statement && existing.statement.status === "paid")
    throw new HttpException(
      "Settled commissions on a paid statement are immutable",
      409,
    );
  const now = new Date();
  await MyGlobal.prisma.broker_desk_commissions.update({
    where: { id: commissionId },
    data: { deleted_at: now, updated_at: now },
  });
  await writeAdminAudit({
    orgId,
    adminId: admin.id,
    sessionId: session.id,
    action: "delete",
    entityType: "commission",
    entityRefId: commissionId,
    before: { status: existing.status },
  });
};

export const invertCommission = async (
  commissionId: string,
): Promise<IBrokerDeskCommission.IInvert> => {
  const { admin } = await requireAdmin();
  const row = await loadCommission(
    admin.broker_desk_organization_id,
    commissionId,
  );
  const commission = toCommission(row);
  return {
    commission,
    policy: commission.policy,
    producer: commission.producer,
  };
};
