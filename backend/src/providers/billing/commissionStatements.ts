import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import { IBrokerDeskCommissionStatement } from "../../api/structures/BrokerDeskBilling";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { pageArgs, pageOf } from "../../utils/pagination";
import { requireAdmin } from "../auth/admin";
import { writeAdminAudit } from "../systematic/auditWrite";
import { cad, statementInclude, toStatement, toStatementSummary } from "./mappers";

const loadStatement = async (orgId: string, statementId: string) => {
  const row = await MyGlobal.prisma.broker_desk_commission_statements.findFirst(
    {
      where: { id: statementId, broker_desk_organization_id: orgId },
      include: statementInclude,
    },
  );
  if (!row) throw new HttpException("Commission statement not found", 404);
  return row;
};

export const patchCommissionStatements = async (
  body: IBrokerDeskCommissionStatement.IRequest,
): Promise<IPage<IBrokerDeskCommissionStatement.ISummary>> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const { page, limit, skip } = pageArgs(body);
  const where = {
    broker_desk_organization_id: orgId,
    deleted_at: null,
    ...(body.broker_desk_producer_id
      ? { broker_desk_producer_id: body.broker_desk_producer_id }
      : {}),
    ...(body.status ? { status: body.status } : {}),
    ...(body.period_start_from || body.period_start_to
      ? {
          period_start: {
            ...(body.period_start_from
              ? { gte: new Date(body.period_start_from) }
              : {}),
            ...(body.period_start_to
              ? { lte: new Date(body.period_start_to) }
              : {}),
          },
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_commission_statements.count({ where }),
    MyGlobal.prisma.broker_desk_commission_statements.findMany({
      where,
      include: statementInclude,
      skip,
      take: limit,
      orderBy: { period_start: "desc" },
    }),
  ]);
  return pageOf(rows.map(toStatementSummary), total, page, limit);
};

export const getCommissionStatement = async (
  statementId: string,
): Promise<IBrokerDeskCommissionStatement> => {
  const { admin } = await requireAdmin();
  return toStatement(
    await loadStatement(admin.broker_desk_organization_id, statementId),
  );
};

export const createCommissionStatement = async (
  body: IBrokerDeskCommissionStatement.ICreate,
): Promise<IBrokerDeskCommissionStatement> => {
  const { admin, session } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const producer = await MyGlobal.prisma.broker_desk_producers.findFirst({
    where: {
      id: body.broker_desk_producer_id,
      broker_desk_organization_id: orgId,
      deleted_at: null,
    },
  });
  if (!producer) throw new HttpException("Producer not found", 404);
  const periodStart = new Date(body.period_start);
  const periodEnd = new Date(body.period_end);
  if (periodEnd.getTime() < periodStart.getTime())
    throw new HttpException("period_end must be on or after period_start", 400);

  const duplicate =
    await MyGlobal.prisma.broker_desk_commission_statements.findFirst({
      where: {
        broker_desk_producer_id: producer.id,
        period_start: periodStart,
        period_end: periodEnd,
        deleted_at: null,
      },
    });
  if (duplicate)
    throw new HttpException(
      "A statement already exists for this producer and period",
      409,
    );

  const members = await MyGlobal.prisma.broker_desk_commissions.findMany({
    where: {
      broker_desk_organization_id: orgId,
      broker_desk_producer_id: producer.id,
      deleted_at: null,
      broker_desk_commission_statement_id: null,
      created_at: { gte: periodStart, lte: periodEnd },
      status: { in: ["estimated", "due"] },
    },
  });
  const agency = cad(
    members.reduce((sum, row) => sum + row.agency_amount_cad, 0),
  );
  const producerTotal = cad(
    members.reduce((sum, row) => sum + row.producer_amount_cad, 0),
  );
  const now = new Date();
  const id = randomUUID();
  try {
    await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.broker_desk_commission_statements.create({
        data: {
          id,
          broker_desk_organization_id: orgId,
          broker_desk_producer_id: producer.id,
          period_start: periodStart,
          period_end: periodEnd,
          agency_amount_total: agency,
          producer_amount_total: producerTotal,
          status: "open",
          created_at: now,
          updated_at: now,
        },
      });
      if (members.length > 0) {
        await tx.broker_desk_commissions.updateMany({
          where: { id: { in: members.map((row) => row.id) } },
          data: {
            broker_desk_commission_statement_id: id,
            status: "due",
            updated_at: now,
          },
        });
      }
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: unknown }).code === "P2002"
    )
      throw new HttpException(
        "A statement already exists for this producer and period",
        409,
      );
    throw error;
  }
  await writeAdminAudit({
    orgId,
    adminId: admin.id,
    sessionId: session.id,
    action: "create",
    entityType: "commission",
    entityRefId: id,
    after: {
      producer_id: producer.id,
      agency_amount_total: agency,
      producer_amount_total: producerTotal,
    },
  });
  return toStatement(await loadStatement(orgId, id));
};

export const markCommissionStatementPaid = async (
  statementId: string,
): Promise<IBrokerDeskCommissionStatement> => {
  const { admin, session } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const existing = await loadStatement(orgId, statementId);
  if (existing.deleted_at)
    throw new HttpException("Commission statement not found", 404);
  if (existing.status === "paid") return toStatement(existing);
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.broker_desk_commission_statements.update({
      where: { id: statementId },
      data: { status: "paid", paid_at: now, updated_at: now },
    });
    await tx.broker_desk_commissions.updateMany({
      where: {
        broker_desk_commission_statement_id: statementId,
        deleted_at: null,
      },
      data: { status: "paid", updated_at: now },
    });
  });
  await writeAdminAudit({
    orgId,
    adminId: admin.id,
    sessionId: session.id,
    action: "update",
    entityType: "commission",
    entityRefId: statementId,
    before: { status: existing.status },
    after: { status: "paid" },
  });
  return toStatement(await loadStatement(orgId, statementId));
};
