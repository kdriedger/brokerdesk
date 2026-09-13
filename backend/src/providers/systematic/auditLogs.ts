import { HttpException } from "@nestjs/common";

import {
  EBrokerDeskAuditAction,
  EBrokerDeskAuditActorType,
  EBrokerDeskAuditEntityType,
  IBrokerDeskAuditLog,
  IBrokerDeskAuditLogOfAdmin,
  IBrokerDeskAuditLogOfCsr,
  IBrokerDeskAuditLogOfProducer,
} from "../../api/structures/BrokerDeskSystematicAuditLog";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { toOrganizationSummary } from "../../transformers/organization";
import { isoRequired } from "../../utils/iso";
import { pageArgs, pageOf } from "../../utils/pagination";
import { requireAdmin } from "../auth/admin";
import { orgSelect } from "../billing/mappers";

const actorTypes = ["admin", "producer", "csr"] as const;
const actions = ["create", "update", "delete", "access"] as const;
const entityTypes = [
  "client",
  "quote",
  "policy",
  "endorsement",
  "invoice",
  "commission",
  "admin",
  "producer",
  "csr",
  "product",
] as const;

const asActor = (value: string): EBrokerDeskAuditActorType =>
  actorTypes.includes(value as EBrokerDeskAuditActorType)
    ? (value as EBrokerDeskAuditActorType)
    : "admin";

const asAction = (value: string): EBrokerDeskAuditAction =>
  actions.includes(value as EBrokerDeskAuditAction)
    ? (value as EBrokerDeskAuditAction)
    : "access";

const asEntity = (value: string): EBrokerDeskAuditEntityType =>
  entityTypes.includes(value as EBrokerDeskAuditEntityType)
    ? (value as EBrokerDeskAuditEntityType)
    : "client";

const include = {
  organization: { select: orgSelect },
  adminAttribution: true,
  producerAttribution: true,
  ofCsr: true,
};

const toAdminAttr = (
  row: {
    id: string;
    broker_desk_audit_log_id: string;
    broker_desk_admin_id: string;
    broker_desk_admin_session_id: string;
    created_at: Date;
  } | null,
): IBrokerDeskAuditLogOfAdmin | null =>
  row
    ? {
        id: row.id,
        broker_desk_audit_log_id: row.broker_desk_audit_log_id,
        broker_desk_admin_id: row.broker_desk_admin_id,
        broker_desk_admin_session_id: row.broker_desk_admin_session_id,
        created_at: isoRequired(row.created_at),
      }
    : null;

const toProducerAttr = (
  row: {
    id: string;
    broker_desk_audit_log_id: string;
    broker_desk_producer_id: string;
    broker_desk_producer_session_id: string;
    created_at: Date;
  } | null,
): IBrokerDeskAuditLogOfProducer | null =>
  row
    ? {
        id: row.id,
        broker_desk_audit_log_id: row.broker_desk_audit_log_id,
        broker_desk_producer_id: row.broker_desk_producer_id,
        broker_desk_producer_session_id: row.broker_desk_producer_session_id,
        created_at: isoRequired(row.created_at),
      }
    : null;

const toCsrAttr = (
  row: {
    id: string;
    broker_desk_audit_log_id: string;
    broker_desk_csr_id: string;
    broker_desk_csr_session_id: string;
    created_at: Date;
  } | null,
): IBrokerDeskAuditLogOfCsr | null =>
  row
    ? {
        id: row.id,
        broker_desk_audit_log_id: row.broker_desk_audit_log_id,
        broker_desk_csr_id: row.broker_desk_csr_id,
        broker_desk_csr_session_id: row.broker_desk_csr_session_id,
        created_at: isoRequired(row.created_at),
      }
    : null;

const toSummary = (row: {
  id: string;
  actor_type: string;
  action: string;
  entity_type: string;
  entity_ref_id: string;
  created_at: Date;
  organization: {
    id: string;
    legal_name: string;
    operating_name: string | null;
    primary_province: string;
    default_currency: string;
  };
}): IBrokerDeskAuditLog.ISummary => ({
  id: row.id,
  organization: toOrganizationSummary(row.organization),
  actor_type: asActor(row.actor_type),
  action: asAction(row.action),
  entity_type: asEntity(row.entity_type),
  entity_ref_id: row.entity_ref_id,
  created_at: isoRequired(row.created_at),
});

const toAudit = (row: {
  id: string;
  actor_type: string;
  action: string;
  entity_type: string;
  entity_ref_id: string;
  before_data: string | null;
  after_data: string | null;
  created_at: Date;
  organization: {
    id: string;
    legal_name: string;
    operating_name: string | null;
    primary_province: string;
    default_currency: string;
  };
  adminAttribution: {
    id: string;
    broker_desk_audit_log_id: string;
    broker_desk_admin_id: string;
    broker_desk_admin_session_id: string;
    created_at: Date;
  } | null;
  producerAttribution: {
    id: string;
    broker_desk_audit_log_id: string;
    broker_desk_producer_id: string;
    broker_desk_producer_session_id: string;
    created_at: Date;
  } | null;
  ofCsr: {
    id: string;
    broker_desk_audit_log_id: string;
    broker_desk_csr_id: string;
    broker_desk_csr_session_id: string;
    created_at: Date;
  } | null;
}): IBrokerDeskAuditLog => ({
  ...toSummary(row),
  before_data: row.before_data,
  after_data: row.after_data,
  admin_attribution: toAdminAttr(row.adminAttribution),
  producer_attribution: toProducerAttr(row.producerAttribution),
  csr_attribution: toCsrAttr(row.ofCsr),
});

export const patchAuditLogs = async (
  body: IBrokerDeskAuditLog.IRequest,
): Promise<IPage<IBrokerDeskAuditLog.ISummary>> => {
  const { admin } = await requireAdmin();
  const { page, limit, skip } = pageArgs(body);
  const direction = body.order_direction ?? "desc";
  const where = {
    broker_desk_organization_id: admin.broker_desk_organization_id,
    ...(body.actor_type ? { actor_type: body.actor_type } : {}),
    ...(body.action ? { action: body.action } : {}),
    ...(body.entity_type ? { entity_type: body.entity_type } : {}),
    ...(body.entity_ref_id ? { entity_ref_id: body.entity_ref_id } : {}),
    ...(body.created_from || body.created_to
      ? {
          created_at: {
            ...(body.created_from ? { gte: new Date(body.created_from) } : {}),
            ...(body.created_to ? { lte: new Date(body.created_to) } : {}),
          },
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_audit_logs.count({ where }),
    MyGlobal.prisma.broker_desk_audit_logs.findMany({
      where,
      include,
      skip,
      take: limit,
      orderBy: { created_at: direction },
    }),
  ]);
  return pageOf(rows.map(toSummary), total, page, limit);
};

export const getAuditLog = async (
  auditLogId: string,
): Promise<IBrokerDeskAuditLog> => {
  const { admin } = await requireAdmin();
  const row = await MyGlobal.prisma.broker_desk_audit_logs.findFirst({
    where: {
      id: auditLogId,
      broker_desk_organization_id: admin.broker_desk_organization_id,
    },
    include,
  });
  if (!row) throw new HttpException("Audit log not found", 404);
  return toAudit(row);
};
