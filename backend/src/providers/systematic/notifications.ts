import { HttpException } from "@nestjs/common";

import {
  EBrokerDeskNotificationType,
  EBrokerDeskRecipientRole,
  IBrokerDeskNotification,
} from "../../api/structures/BrokerDeskSystematicNotification";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { toOrganizationSummary } from "../../transformers/organization";
import { iso, isoRequired } from "../../utils/iso";
import { pageArgs, pageOf } from "../../utils/pagination";
import { requireAdmin } from "../auth/admin";
import { orgSelect } from "../billing/mappers";

const notificationTypes = [
  "task_due",
  "producer_licence_expiring",
  "policy_expiring",
  "renewal_due",
  "submission_status_changed",
] as const;

const recipientRoles = ["ADMIN", "PRODUCER", "CSR", "CLIENT"] as const;

const asType = (value: string): EBrokerDeskNotificationType =>
  notificationTypes.includes(value as EBrokerDeskNotificationType)
    ? (value as EBrokerDeskNotificationType)
    : "task_due";

const asRole = (value: string): EBrokerDeskRecipientRole =>
  recipientRoles.includes(value as EBrokerDeskRecipientRole)
    ? (value as EBrokerDeskRecipientRole)
    : "ADMIN";

const include = {
  organization: { select: orgSelect },
};

const toSummary = (row: {
  id: string;
  type: string;
  title: string;
  source_entity_type: string;
  source_entity_id: string;
  read_at: Date | null;
  created_at: Date;
  organization: {
    id: string;
    legal_name: string;
    operating_name: string | null;
    primary_province: string;
    default_currency: string;
  };
}): IBrokerDeskNotification.ISummary => ({
  id: row.id,
  organization: toOrganizationSummary(row.organization),
  type: asType(row.type),
  title: row.title,
  source_entity_type: row.source_entity_type,
  source_entity_id: row.source_entity_id,
  read_at: iso(row.read_at),
  created_at: isoRequired(row.created_at),
});

const toNotification = (row: {
  id: string;
  type: string;
  title: string;
  body: string;
  recipient_role: string;
  recipient_user_id: string;
  source_entity_type: string;
  source_entity_id: string;
  read_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  organization: {
    id: string;
    legal_name: string;
    operating_name: string | null;
    primary_province: string;
    default_currency: string;
  };
}): IBrokerDeskNotification => ({
  ...toSummary(row),
  body: row.body,
  recipient_role: asRole(row.recipient_role),
  recipient_user_id: row.recipient_user_id,
  updated_at: isoRequired(row.updated_at),
  deleted_at: iso(row.deleted_at),
});

const mine = (adminId: string, orgId: string) => ({
  broker_desk_organization_id: orgId,
  recipient_role: "ADMIN",
  recipient_user_id: adminId,
  deleted_at: null,
});

export const patchNotifications = async (
  body: IBrokerDeskNotification.IRequest,
): Promise<IPage<IBrokerDeskNotification.ISummary>> => {
  const { admin } = await requireAdmin();
  const { page, limit, skip } = pageArgs(body);
  const orderBy = body.order_by ?? "created_at";
  const direction = body.order_direction ?? "desc";
  const where = {
    ...mine(admin.id, admin.broker_desk_organization_id),
    ...(body.type ? { type: body.type } : {}),
    ...(body.read === true ? { read_at: { not: null } } : {}),
    ...(body.read === false ? { read_at: null } : {}),
    ...(body.source_entity_type
      ? { source_entity_type: body.source_entity_type }
      : {}),
    ...(body.source_entity_id
      ? { source_entity_id: body.source_entity_id }
      : {}),
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
    MyGlobal.prisma.broker_desk_notifications.count({ where }),
    MyGlobal.prisma.broker_desk_notifications.findMany({
      where,
      include,
      skip,
      take: limit,
      orderBy: { [orderBy]: direction },
    }),
  ]);
  return pageOf(rows.map(toSummary), total, page, limit);
};

export const getNotification = async (
  notificationId: string,
): Promise<IBrokerDeskNotification> => {
  const { admin } = await requireAdmin();
  const row = await MyGlobal.prisma.broker_desk_notifications.findFirst({
    where: {
      id: notificationId,
      ...mine(admin.id, admin.broker_desk_organization_id),
    },
    include,
  });
  if (!row) throw new HttpException("Notification not found", 404);
  return toNotification(row);
};

export const markNotificationRead = async (
  notificationId: string,
): Promise<IBrokerDeskNotification> => {
  const { admin } = await requireAdmin();
  const existing = await MyGlobal.prisma.broker_desk_notifications.findFirst({
    where: {
      id: notificationId,
      ...mine(admin.id, admin.broker_desk_organization_id),
    },
    include,
  });
  if (!existing) throw new HttpException("Notification not found", 404);
  if (existing.read_at) return toNotification(existing);
  const now = new Date();
  const row = await MyGlobal.prisma.broker_desk_notifications.update({
    where: { id: notificationId },
    data: { read_at: now, updated_at: now },
    include,
  });
  return toNotification(row);
};

export const getNotificationUnreadCount = async (): Promise<
  IBrokerDeskNotification.IUnreadCount
> => {
  const { admin } = await requireAdmin();
  const unread_count = await MyGlobal.prisma.broker_desk_notifications.count({
    where: {
      ...mine(admin.id, admin.broker_desk_organization_id),
      read_at: null,
    },
  });
  return { unread_count };
};
