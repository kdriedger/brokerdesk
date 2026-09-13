import { HttpException } from "@nestjs/common";

import {
  IBrokerDeskActivity,
  IPageIBrokerDeskActivitySummary,
} from "../../api/structures/BrokerDeskCrmActivity";
import { MyGlobal } from "../../MyGlobal";
import {
  isActivityType,
  toActivity,
  toActivitySummary,
  toCsrCrmSummary,
  toProducerCrmSummary,
} from "../../transformers/crm";
import { pageOf } from "../../utils/pagination";
import {
  orgProvinceOf,
  randomUUID,
  readProfile,
  requireOrgClient,
} from "./common";

const activityInclude = {
  producerAuthorship: { include: { producer: true } },
  csrAuthorship: { include: { csr: true } },
  client: true,
} as const;

const authorsOf = (row: {
  producerAuthorship: { producer: { id: string; email: string; display_name: string } } | null;
  csrAuthorship: { csr: { id: string; email: string; display_name: string } } | null;
}) => ({
  producer_author: row.producerAuthorship
    ? toProducerCrmSummary(row.producerAuthorship.producer)
    : null,
  csr_author: row.csrAuthorship
    ? toCsrCrmSummary(row.csrAuthorship.csr)
    : null,
});

const clientRefOf = async (clientId: string, email: string) => {
  const packed = await requireOrgClient(clientId);
  const profile = readProfile(
    packed.client.tags,
    packed.client,
    orgProvinceOf(packed),
  );
  return { id: clientId, legal_name: profile.legal_name || email };
};

export const getCrmActivities = async (
  clientId: string,
): Promise<IPageIBrokerDeskActivitySummary> => {
  await requireOrgClient(clientId);
  const where = { broker_desk_client_id: clientId, deleted_at: null };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_activities.count({ where }),
    MyGlobal.prisma.broker_desk_activities.findMany({
      where,
      orderBy: { occurred_at: "desc" },
      take: 50,
      include: activityInclude,
    }),
  ]);
  return pageOf(
    rows.map((row) =>
      toActivitySummary({
        id: row.id,
        type: row.type,
        subject: row.subject,
        occurred_at: row.occurred_at,
        ...authorsOf(row),
      }),
    ),
    total,
    1,
    50,
  );
};

export const getCrmActivity = async (
  clientId: string,
  activityId: string,
): Promise<IBrokerDeskActivity> => {
  const packed = await requireOrgClient(clientId);
  const row = await MyGlobal.prisma.broker_desk_activities.findFirst({
    where: { id: activityId, broker_desk_client_id: clientId },
    include: activityInclude,
  });
  if (!row) throw new HttpException("Activity not found", 404);
  const profile = readProfile(
    packed.client.tags,
    packed.client,
    orgProvinceOf(packed),
  );
  return toActivity({
    id: row.id,
    type: row.type,
    subject: row.subject,
    body: row.body,
    occurred_at: row.occurred_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    ...authorsOf(row),
    client: { id: packed.client.id, legal_name: profile.legal_name },
  });
};

export const postCrmActivity = async (
  clientId: string,
  body: IBrokerDeskActivity.ICreate,
): Promise<IBrokerDeskActivity> => {
  const packed = await requireOrgClient(clientId);
  if (!isActivityType(body.type))
    throw new HttpException("Invalid activity type", 400);
  const now = new Date();
  const occurredAt = body.occurred_at ? new Date(body.occurred_at) : now;
  const created = await MyGlobal.prisma.broker_desk_activities.create({
    data: {
      id: randomUUID(),
      broker_desk_client_id: clientId,
      type: body.type,
      subject: body.subject,
      body: body.body,
      occurred_at: occurredAt,
      created_at: now,
      updated_at: now,
    },
    include: activityInclude,
  });
  const profile = readProfile(
    packed.client.tags,
    packed.client,
    orgProvinceOf(packed),
  );
  return toActivity({
    id: created.id,
    type: created.type,
    subject: created.subject,
    body: created.body,
    occurred_at: created.occurred_at,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at,
    ...authorsOf(created),
    client: { id: packed.client.id, legal_name: profile.legal_name },
  });
};

export const putCrmActivity = async (
  clientId: string,
  activityId: string,
  body: IBrokerDeskActivity.IUpdate,
): Promise<IBrokerDeskActivity> => {
  const packed = await requireOrgClient(clientId);
  const existing = await MyGlobal.prisma.broker_desk_activities.findFirst({
    where: { id: activityId, broker_desk_client_id: clientId },
  });
  if (!existing) throw new HttpException("Activity not found", 404);
  if (body.type !== undefined && !isActivityType(body.type))
    throw new HttpException("Invalid activity type", 400);
  const updated = await MyGlobal.prisma.broker_desk_activities.update({
    where: { id: activityId },
    data: {
      type: body.type ?? undefined,
      subject: body.subject ?? undefined,
      body: body.body ?? undefined,
      occurred_at: body.occurred_at ? new Date(body.occurred_at) : undefined,
      updated_at: new Date(),
    },
    include: activityInclude,
  });
  const profile = readProfile(
    packed.client.tags,
    packed.client,
    orgProvinceOf(packed),
  );
  return toActivity({
    id: updated.id,
    type: updated.type,
    subject: updated.subject,
    body: updated.body,
    occurred_at: updated.occurred_at,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    deleted_at: updated.deleted_at,
    ...authorsOf(updated),
    client: { id: packed.client.id, legal_name: profile.legal_name },
  });
};

export const deleteCrmActivity = async (
  clientId: string,
  activityId: string,
): Promise<void> => {
  await requireOrgClient(clientId);
  const existing = await MyGlobal.prisma.broker_desk_activities.findFirst({
    where: { id: activityId, broker_desk_client_id: clientId },
  });
  if (!existing) throw new HttpException("Activity not found", 404);
  await MyGlobal.prisma.broker_desk_activities.update({
    where: { id: activityId },
    data: { deleted_at: new Date(), updated_at: new Date() },
  });
};

export { clientRefOf };
