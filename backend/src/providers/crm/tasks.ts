import { HttpException } from "@nestjs/common";

import {
  IBrokerDeskTask,
  IPageIBrokerDeskTaskSummary,
} from "../../api/structures/BrokerDeskCrmTask";
import { MyGlobal } from "../../MyGlobal";
import {
  isTaskStatus,
  toAdminCrmSummary,
  toCsrCrmSummary,
  toPolicySummary,
  toProducerCrmSummary,
  toTask,
  toTaskSummary,
} from "../../transformers/crm";
import { pageArgs, pageOf } from "../../utils/pagination";
import {
  orgProvinceOf,
  randomUUID,
  readProfile,
  requireCrmAdmin,
  requireOrgClient,
} from "./common";

const taskInclude = {
  client: { include: { tags: true } },
  policy: true,
  adminAssignment: { include: { admin: true } },
  producerAssignment: { include: { producer: true } },
  csrAssignment: { include: { csr: true } },
} as const;

type TaskRow = Awaited<
  ReturnType<typeof MyGlobal.prisma.broker_desk_tasks.findFirstOrThrow>
> & {
  client: {
    id: string;
    email: string;
    organization_id: string;
    active: boolean;
    tags: {
      id: string;
      value: string;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    }[];
  } | null;
  policy: {
    id: string;
    org_policy_number: string;
    status: string;
  } | null;
  adminAssignment: {
    admin: { id: string; email: string; display_name: string };
  } | null;
  producerAssignment: {
    producer: { id: string; email: string; display_name: string };
  } | null;
  csrAssignment: {
    csr: { id: string; email: string; display_name: string };
  } | null;
};

const clientRef = (
  client: TaskRow["client"],
  orgProvince: string,
): IBrokerDeskTask.IClientRef | null => {
  if (!client) return null;
  const profile = readProfile(client.tags, client, orgProvince);
  return { id: client.id, legal_name: profile.legal_name };
};

const assigneeOf = (
  row: TaskRow,
): IBrokerDeskTask.ISummary["assignee"] => {
  if (row.adminAssignment)
    return { kind: "admin", admin: toAdminCrmSummary(row.adminAssignment.admin) };
  if (row.producerAssignment)
    return {
      kind: "producer",
      producer: toProducerCrmSummary(row.producerAssignment.producer),
    };
  if (row.csrAssignment)
    return { kind: "csr", csr: toCsrCrmSummary(row.csrAssignment.csr) };
  return null;
};

const toDetail = (row: TaskRow, orgProvince: string): IBrokerDeskTask =>
  toTask({
    id: row.id,
    title: row.title,
    description: row.description,
    due_at: row.due_at,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    client: clientRef(row.client, orgProvince),
    policy: row.policy ? toPolicySummary(row.policy) : null,
    admin_assignee: row.adminAssignment
      ? toAdminCrmSummary(row.adminAssignment.admin)
      : null,
    producer_assignee: row.producerAssignment
      ? toProducerCrmSummary(row.producerAssignment.producer)
      : null,
    csr_assignee: row.csrAssignment
      ? toCsrCrmSummary(row.csrAssignment.csr)
      : null,
  });

const toSummary = (row: TaskRow, orgProvince: string) =>
  toTaskSummary({
    id: row.id,
    title: row.title,
    due_at: row.due_at,
    status: row.status,
    client: clientRef(row.client, orgProvince),
    assignee: assigneeOf(row),
  });

const countAssignees = (body: {
  admin_assignee_id?: string;
  producer_assignee_id?: string;
  csr_assignee_id?: string;
}): number =>
  (body.admin_assignee_id ? 1 : 0) +
  (body.producer_assignee_id ? 1 : 0) +
  (body.csr_assignee_id ? 1 : 0);

const bindAssignee = async (
  taskId: string,
  body: {
    admin_assignee_id?: string;
    producer_assignee_id?: string;
    csr_assignee_id?: string;
  },
  fallbackAdminId: string,
  now: Date,
): Promise<void> => {
  const count = countAssignees(body);
  if (count > 1)
    throw new HttpException("Exactly one assignee is required", 400);
  const adminId = count === 0 ? fallbackAdminId : body.admin_assignee_id;
  await MyGlobal.prisma.broker_desk_task_of_admins.deleteMany({
    where: { broker_desk_task_id: taskId },
  });
  await MyGlobal.prisma.broker_desk_task_of_producers.deleteMany({
    where: { broker_desk_task_id: taskId },
  });
  await MyGlobal.prisma.broker_desk_task_of_csrs.deleteMany({
    where: { broker_desk_task_id: taskId },
  });
  if (adminId) {
    await MyGlobal.prisma.broker_desk_task_of_admins.create({
      data: {
        id: randomUUID(),
        broker_desk_task_id: taskId,
        broker_desk_admin_id: adminId,
        created_at: now,
        updated_at: now,
      },
    });
    return;
  }
  if (body.producer_assignee_id) {
    await MyGlobal.prisma.broker_desk_task_of_producers.create({
      data: {
        id: randomUUID(),
        broker_desk_task_id: taskId,
        broker_desk_producer_id: body.producer_assignee_id,
        created_at: now,
        updated_at: now,
      },
    });
    return;
  }
  if (body.csr_assignee_id) {
    await MyGlobal.prisma.broker_desk_task_of_csrs.create({
      data: {
        id: randomUUID(),
        broker_desk_task_id: taskId,
        broker_desk_csr_id: body.csr_assignee_id,
        created_at: now,
        updated_at: now,
      },
    });
  }
};

const loadTask = async (taskId: string, orgId: string): Promise<TaskRow> => {
  const row = await MyGlobal.prisma.broker_desk_tasks.findFirst({
    where: { id: taskId, organization_id: orgId },
    include: taskInclude,
  });
  if (!row) throw new HttpException("Task not found", 404);
  return row;
};

export const patchCrmTasks = async (
  body: IBrokerDeskTask.IRequest,
): Promise<IPageIBrokerDeskTaskSummary> => {
  const ctx = await requireCrmAdmin();
  const orgId = ctx.admin.broker_desk_organization_id;
  const orgProvince = orgProvinceOf(ctx);
  const { page, limit, skip } = pageArgs(body);
  const where = {
    organization_id: orgId,
    ...(body.status ? { status: body.status } : {}),
    ...(body.client_id ? { client_id: body.client_id } : {}),
    ...(body.policy_id ? { policy_id: body.policy_id } : {}),
    ...(body.search
      ? { title: { contains: body.search, mode: "insensitive" as const } }
      : {}),
    ...(body.due_from || body.due_to
      ? {
          due_at: {
            ...(body.due_from ? { gte: new Date(body.due_from) } : {}),
            ...(body.due_to ? { lte: new Date(body.due_to) } : {}),
          },
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_tasks.count({ where }),
    MyGlobal.prisma.broker_desk_tasks.findMany({
      where,
      orderBy: { due_at: "asc" },
      skip,
      take: limit,
      include: taskInclude,
    }),
  ]);
  return pageOf(
    rows.map((row) => toSummary(row, orgProvince)),
    total,
    page,
    limit,
  );
};

export const getCrmTasksMe = async (): Promise<IBrokerDeskTask.IMyQueue> => {
  const ctx = await requireCrmAdmin();
  const orgProvince = orgProvinceOf(ctx);
  const rows = await MyGlobal.prisma.broker_desk_tasks.findMany({
    where: {
      organization_id: ctx.admin.broker_desk_organization_id,
      adminAssignment: { broker_desk_admin_id: ctx.admin.id },
    },
    orderBy: { due_at: "asc" },
    include: taskInclude,
  });
  return { data: rows.map((row) => toSummary(row, orgProvince)) };
};

export const getCrmTask = async (taskId: string): Promise<IBrokerDeskTask> => {
  const ctx = await requireCrmAdmin();
  const row = await loadTask(taskId, ctx.admin.broker_desk_organization_id);
  return toDetail(row, orgProvinceOf(ctx));
};

export const postCrmTask = async (
  body: IBrokerDeskTask.ICreate,
): Promise<IBrokerDeskTask> => {
  const ctx = await requireCrmAdmin();
  const orgId = ctx.admin.broker_desk_organization_id;
  if (body.status !== undefined && !isTaskStatus(body.status))
    throw new HttpException("Invalid task status", 400);
  if (body.client_id) await requireOrgClient(body.client_id);
  if (body.policy_id) {
    const policy = await MyGlobal.prisma.broker_desk_policies.findFirst({
      where: { id: body.policy_id, organization_id: orgId },
    });
    if (!policy) throw new HttpException("Policy not found", 404);
  }
  const now = new Date();
  const id = randomUUID();
  await MyGlobal.prisma.broker_desk_tasks.create({
    data: {
      id,
      organization_id: orgId,
      client_id: body.client_id ?? null,
      policy_id: body.policy_id ?? null,
      title: body.title,
      description: body.description ?? null,
      due_at: new Date(body.due_at),
      status: body.status ?? "open",
      created_at: now,
      updated_at: now,
    },
  });
  await bindAssignee(id, body, ctx.admin.id, now);
  const row = await loadTask(id, orgId);
  return toDetail(row, orgProvinceOf(ctx));
};

export const putCrmTask = async (
  taskId: string,
  body: IBrokerDeskTask.IUpdate,
): Promise<IBrokerDeskTask> => {
  const ctx = await requireCrmAdmin();
  const orgId = ctx.admin.broker_desk_organization_id;
  await loadTask(taskId, orgId);
  if (body.status !== undefined && !isTaskStatus(body.status))
    throw new HttpException("Invalid task status", 400);
  const now = new Date();
  await MyGlobal.prisma.broker_desk_tasks.update({
    where: { id: taskId },
    data: {
      title: body.title ?? undefined,
      description:
        body.description === undefined ? undefined : body.description,
      due_at: body.due_at ? new Date(body.due_at) : undefined,
      status: body.status ?? undefined,
      updated_at: now,
    },
  });
  if (
    body.admin_assignee_id !== undefined ||
    body.producer_assignee_id !== undefined ||
    body.csr_assignee_id !== undefined
  ) {
    await bindAssignee(taskId, body, ctx.admin.id, now);
  }
  const row = await loadTask(taskId, orgId);
  return toDetail(row, orgProvinceOf(ctx));
};

export const deleteCrmTask = async (taskId: string): Promise<void> => {
  const ctx = await requireCrmAdmin();
  await loadTask(taskId, ctx.admin.broker_desk_organization_id);
  await MyGlobal.prisma.broker_desk_tasks.delete({ where: { id: taskId } });
};
