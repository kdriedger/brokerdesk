import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import {
  EBrokerDeskInvoiceTaxCode,
  IBrokerDeskInvoice,
  IBrokerDeskInvoiceLine,
} from "../../api/structures/BrokerDeskBilling";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { parseSettings } from "../../transformers/organization";
import { pageArgs, pageOf } from "../../utils/pagination";
import { requireAdmin } from "../auth/admin";
import { writeAdminAudit } from "../systematic/auditWrite";
import {
  asInvoiceStatus,
  asTaxCode,
  cad,
  invoiceInclude,
  taxRateFor,
  toInvoice,
  toInvoiceLine,
  toInvoiceSummary,
  totalsFromLines,
} from "./mappers";

const orgIdOf = (admin: { broker_desk_organization_id: string }): string =>
  admin.broker_desk_organization_id;

const loadInvoice = async (orgId: string, invoiceId: string) => {
  const row = await MyGlobal.prisma.broker_desk_invoices.findFirst({
    where: { id: invoiceId, broker_desk_organization_id: orgId },
    include: invoiceInclude,
  });
  if (!row) throw new HttpException("Invoice not found", 404);
  return row;
};

const requireDraft = (status: string): void => {
  if (status !== "draft")
    throw new HttpException("Only draft invoices are editable", 409);
};

const recompute = async (
  invoiceId: string,
  extra?: { status?: string; updated_at?: Date },
) => {
  const lines = await MyGlobal.prisma.broker_desk_invoice_lines.findMany({
    where: { broker_desk_invoice_id: invoiceId, deleted_at: null },
  });
  const totals = totalsFromLines(lines);
  await MyGlobal.prisma.broker_desk_invoices.update({
    where: { id: invoiceId },
    data: { ...totals, ...extra },
  });
};

export const patchInvoices = async (
  body: IBrokerDeskInvoice.IRequest,
): Promise<IPage<IBrokerDeskInvoice.ISummary>> => {
  const { admin } = await requireAdmin();
  const orgId = orgIdOf(admin);
  const { page, limit, skip } = pageArgs(body);
  const now = new Date();
  const where = {
    broker_desk_organization_id: orgId,
    deleted_at: null,
    ...(body.broker_desk_client_id
      ? { broker_desk_client_id: body.broker_desk_client_id }
      : {}),
    ...(body.broker_desk_policy_id
      ? { broker_desk_policy_id: body.broker_desk_policy_id }
      : {}),
    ...(body.status ? { status: body.status } : {}),
    ...(body.issue_date_from || body.issue_date_to
      ? {
          issue_date: {
            ...(body.issue_date_from
              ? { gte: new Date(body.issue_date_from) }
              : {}),
            ...(body.issue_date_to
              ? { lte: new Date(body.issue_date_to) }
              : {}),
          },
        }
      : {}),
    ...(body.overdue_only
      ? {
          due_date: { lt: now },
          status: { in: ["sent", "partial"] },
        }
      : {}),
    ...(body.search
      ? { invoice_number: { contains: body.search, mode: "insensitive" as const } }
      : {}),
  };
  const sort = body.sort ?? "created_at";
  const order = body.order ?? "desc";
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_invoices.count({ where }),
    MyGlobal.prisma.broker_desk_invoices.findMany({
      where,
      include: invoiceInclude,
      skip,
      take: limit,
      orderBy: { [sort]: order },
    }),
  ]);
  return pageOf(rows.map(toInvoiceSummary), total, page, limit);
};

export const getInvoice = async (
  invoiceId: string,
): Promise<IBrokerDeskInvoice> => {
  const { admin } = await requireAdmin();
  return toInvoice(await loadInvoice(orgIdOf(admin), invoiceId));
};

const freezeLine = (
  body: IBrokerDeskInvoiceLine.ICreate,
  settings: ReturnType<typeof parseSettings>,
  province: string,
  now: Date,
) => {
  const tax_code = asTaxCode(body.tax_code);
  return {
    id: randomUUID(),
    description: body.description,
    amount: cad(body.amount),
    tax_code,
    tax_rate: taxRateFor(tax_code, settings, province),
    created_at: now,
    updated_at: now,
  };
};

export const createInvoice = async (
  body: IBrokerDeskInvoice.ICreate,
): Promise<IBrokerDeskInvoice> => {
  const { admin, session } = await requireAdmin();
  const orgId = orgIdOf(admin);
  const org = await MyGlobal.prisma.broker_desk_organizations.findFirstOrThrow({
    where: { id: orgId },
  });
  const client = await MyGlobal.prisma.broker_desk_clients.findFirst({
    where: { id: body.broker_desk_client_id, organization_id: orgId },
  });
  if (!client) throw new HttpException("Client not found", 404);
  if (body.broker_desk_policy_id) {
    const policy = await MyGlobal.prisma.broker_desk_policies.findFirst({
      where: {
        id: body.broker_desk_policy_id,
        organization_id: orgId,
        deleted_at: null,
      },
    });
    if (!policy) throw new HttpException("Policy not found", 404);
  }
  if (body.broker_desk_billing_address_id) {
    const address = await MyGlobal.prisma.broker_desk_addresses.findFirst({
      where: { id: body.broker_desk_billing_address_id, deleted_at: null },
    });
    if (!address) throw new HttpException("Billing address not found", 404);
  }
  const settings = parseSettings(org.settings);
  const now = new Date();
  const invoiceId = randomUUID();
  const lineRows = body.invoice_lines.map((line) =>
    freezeLine(line, settings, org.primary_province, now),
  );
  const totals = totalsFromLines(lineRows);
  try {
    await MyGlobal.prisma.broker_desk_invoices.create({
      data: {
        id: invoiceId,
        broker_desk_organization_id: orgId,
        broker_desk_client_id: body.broker_desk_client_id,
        broker_desk_policy_id: body.broker_desk_policy_id,
        broker_desk_billing_address_id: body.broker_desk_billing_address_id,
        invoice_number: body.invoice_number,
        issue_date: new Date(body.issue_date),
        due_date: new Date(body.due_date),
        status: "draft",
        ...totals,
        currency: "CAD",
        created_at: now,
        updated_at: now,
        invoiceLines: {
          create: lineRows.map((line) => ({
            id: line.id,
            description: line.description,
            amount: line.amount,
            tax_code: line.tax_code,
            tax_rate: line.tax_rate,
            created_at: line.created_at,
            updated_at: line.updated_at,
          })),
        },
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: unknown }).code === "P2002"
    )
      throw new HttpException("Invoice number already exists", 409);
    throw error;
  }
  await writeAdminAudit({
    orgId,
    adminId: admin.id,
    sessionId: session.id,
    action: "create",
    entityType: "invoice",
    entityRefId: invoiceId,
    after: { invoice_number: body.invoice_number, status: "draft" },
  });
  return toInvoice(await loadInvoice(orgId, invoiceId));
};

export const updateInvoice = async (
  invoiceId: string,
  body: IBrokerDeskInvoice.IUpdate,
): Promise<IBrokerDeskInvoice> => {
  const { admin, session } = await requireAdmin();
  const orgId = orgIdOf(admin);
  const existing = await loadInvoice(orgId, invoiceId);
  if (existing.deleted_at) throw new HttpException("Invoice not found", 404);
  requireDraft(existing.status);
  const org = await MyGlobal.prisma.broker_desk_organizations.findFirstOrThrow({
    where: { id: orgId },
  });
  const settings = parseSettings(org.settings);
  const now = new Date();
  if (body.invoice_lines) {
    await MyGlobal.prisma.broker_desk_invoice_lines.updateMany({
      where: { broker_desk_invoice_id: invoiceId, deleted_at: null },
      data: { deleted_at: now, updated_at: now },
    });
    const lineRows = body.invoice_lines.map((line) =>
      freezeLine(line, settings, org.primary_province, now),
    );
    if (lineRows.length > 0) {
      await MyGlobal.prisma.broker_desk_invoice_lines.createMany({
        data: lineRows.map((line) => ({
          ...line,
          broker_desk_invoice_id: invoiceId,
        })),
      });
    }
  }
  if (body.broker_desk_billing_address_id) {
    const address = await MyGlobal.prisma.broker_desk_addresses.findFirst({
      where: { id: body.broker_desk_billing_address_id, deleted_at: null },
    });
    if (!address) throw new HttpException("Billing address not found", 404);
  }
  await recompute(invoiceId, {
    updated_at: now,
  });
  await MyGlobal.prisma.broker_desk_invoices.update({
    where: { id: invoiceId },
    data: {
      broker_desk_billing_address_id:
        body.broker_desk_billing_address_id === undefined
          ? undefined
          : body.broker_desk_billing_address_id,
      issue_date: body.issue_date ? new Date(body.issue_date) : undefined,
      due_date: body.due_date ? new Date(body.due_date) : undefined,
      updated_at: now,
    },
  });
  await writeAdminAudit({
    orgId,
    adminId: admin.id,
    sessionId: session.id,
    action: "update",
    entityType: "invoice",
    entityRefId: invoiceId,
    before: { status: existing.status },
    after: { status: existing.status },
  });
  return toInvoice(await loadInvoice(orgId, invoiceId));
};

export const eraseInvoice = async (invoiceId: string): Promise<void> => {
  const { admin, session } = await requireAdmin();
  const orgId = orgIdOf(admin);
  const existing = await loadInvoice(orgId, invoiceId);
  if (existing.deleted_at) return;
  const now = new Date();
  await MyGlobal.prisma.broker_desk_invoices.update({
    where: { id: invoiceId },
    data: { deleted_at: now, updated_at: now },
  });
  await writeAdminAudit({
    orgId,
    adminId: admin.id,
    sessionId: session.id,
    action: "delete",
    entityType: "invoice",
    entityRefId: invoiceId,
    before: { status: existing.status, invoice_number: existing.invoice_number },
  });
};

export const sendInvoice = async (
  invoiceId: string,
): Promise<IBrokerDeskInvoice> => {
  const { admin, session } = await requireAdmin();
  const orgId = orgIdOf(admin);
  const existing = await loadInvoice(orgId, invoiceId);
  if (existing.deleted_at) throw new HttpException("Invoice not found", 404);
  requireDraft(existing.status);
  const now = new Date();
  await MyGlobal.prisma.broker_desk_invoices.update({
    where: { id: invoiceId },
    data: { status: "sent", updated_at: now },
  });
  await writeAdminAudit({
    orgId,
    adminId: admin.id,
    sessionId: session.id,
    action: "update",
    entityType: "invoice",
    entityRefId: invoiceId,
    before: { status: "draft" },
    after: { status: "sent" },
  });
  return toInvoice(await loadInvoice(orgId, invoiceId));
};

export const voidInvoice = async (
  invoiceId: string,
  body: IBrokerDeskInvoice.IVoid,
): Promise<IBrokerDeskInvoice> => {
  const { admin, session } = await requireAdmin();
  const orgId = orgIdOf(admin);
  const existing = await loadInvoice(orgId, invoiceId);
  if (existing.deleted_at) throw new HttpException("Invoice not found", 404);
  if (existing.status === "void")
    throw new HttpException("Invoice is already void", 409);
  const now = new Date();
  await MyGlobal.prisma.broker_desk_invoices.update({
    where: { id: invoiceId },
    data: { status: "void", updated_at: now },
  });
  await writeAdminAudit({
    orgId,
    adminId: admin.id,
    sessionId: session.id,
    action: "update",
    entityType: "invoice",
    entityRefId: invoiceId,
    before: { status: existing.status },
    after: { status: "void", reason: body.reason },
  });
  return toInvoice(await loadInvoice(orgId, invoiceId));
};

export const listInvoiceLines = async (
  invoiceId: string,
): Promise<IBrokerDeskInvoiceLine[]> => {
  const { admin } = await requireAdmin();
  const invoice = await loadInvoice(orgIdOf(admin), invoiceId);
  return invoice.invoiceLines.map((line) => toInvoiceLine(line, invoice));
};

export const addInvoiceLine = async (
  invoiceId: string,
  body: IBrokerDeskInvoiceLine.ICreate,
): Promise<IBrokerDeskInvoice> => {
  const { admin } = await requireAdmin();
  const orgId = orgIdOf(admin);
  const existing = await loadInvoice(orgId, invoiceId);
  if (existing.deleted_at) throw new HttpException("Invoice not found", 404);
  requireDraft(existing.status);
  const org = await MyGlobal.prisma.broker_desk_organizations.findFirstOrThrow({
    where: { id: orgId },
  });
  const now = new Date();
  const frozen = freezeLine(
    body,
    parseSettings(org.settings),
    org.primary_province,
    now,
  );
  await MyGlobal.prisma.broker_desk_invoice_lines.create({
    data: { ...frozen, broker_desk_invoice_id: invoiceId },
  });
  await recompute(invoiceId, { updated_at: now });
  return toInvoice(await loadInvoice(orgId, invoiceId));
};

export const updateInvoiceLine = async (
  invoiceId: string,
  lineId: string,
  body: IBrokerDeskInvoiceLine.IUpdate,
): Promise<IBrokerDeskInvoice> => {
  const { admin } = await requireAdmin();
  const orgId = orgIdOf(admin);
  const existing = await loadInvoice(orgId, invoiceId);
  if (existing.deleted_at) throw new HttpException("Invoice not found", 404);
  requireDraft(existing.status);
  const line = await MyGlobal.prisma.broker_desk_invoice_lines.findFirst({
    where: {
      id: lineId,
      broker_desk_invoice_id: invoiceId,
      deleted_at: null,
    },
  });
  if (!line) throw new HttpException("Invoice line not found", 404);
  const org = await MyGlobal.prisma.broker_desk_organizations.findFirstOrThrow({
    where: { id: orgId },
  });
  const now = new Date();
  const tax_code: EBrokerDeskInvoiceTaxCode = body.tax_code
    ? asTaxCode(body.tax_code)
    : asTaxCode(line.tax_code);
  const tax_rate = body.tax_code
    ? taxRateFor(tax_code, parseSettings(org.settings), org.primary_province)
    : line.tax_rate;
  await MyGlobal.prisma.broker_desk_invoice_lines.update({
    where: { id: lineId },
    data: {
      description: body.description ?? undefined,
      amount: body.amount === undefined ? undefined : cad(body.amount),
      tax_code: body.tax_code ? tax_code : undefined,
      tax_rate,
      updated_at: now,
    },
  });
  await recompute(invoiceId, { updated_at: now });
  return toInvoice(await loadInvoice(orgId, invoiceId));
};

export const eraseInvoiceLine = async (
  invoiceId: string,
  lineId: string,
): Promise<IBrokerDeskInvoice> => {
  const { admin } = await requireAdmin();
  const orgId = orgIdOf(admin);
  const existing = await loadInvoice(orgId, invoiceId);
  if (existing.deleted_at) throw new HttpException("Invoice not found", 404);
  requireDraft(existing.status);
  const line = await MyGlobal.prisma.broker_desk_invoice_lines.findFirst({
    where: {
      id: lineId,
      broker_desk_invoice_id: invoiceId,
      deleted_at: null,
    },
  });
  if (!line) throw new HttpException("Invoice line not found", 404);
  const now = new Date();
  await MyGlobal.prisma.broker_desk_invoice_lines.update({
    where: { id: lineId },
    data: { deleted_at: now, updated_at: now },
  });
  await recompute(invoiceId, { updated_at: now });
  return toInvoice(await loadInvoice(orgId, invoiceId));
};

export { asInvoiceStatus, loadInvoice };
