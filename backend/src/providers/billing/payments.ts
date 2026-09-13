import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import { IBrokerDeskPayment } from "../../api/structures/BrokerDeskBilling";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { pageArgs, pageOf } from "../../utils/pagination";
import { requireAdmin } from "../auth/admin";
import { writeAdminAudit } from "../systematic/auditWrite";
import { cad, invoiceInclude, paymentInclude, toPayment } from "./mappers";
import { loadInvoice } from "./invoices";

const nextInvoiceStatus = (
  current: string,
  total: number,
  paid: number,
): string => {
  if (current === "void" || current === "draft") return current;
  if (paid <= 0) return current === "paid" ? "sent" : current;
  if (paid + 1e-9 >= total) return "paid";
  return "partial";
};

export const patchPayments = async (
  body: IBrokerDeskPayment.IRequest,
): Promise<IPage<IBrokerDeskPayment.ISummary>> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const { page, limit, skip } = pageArgs(body);
  const where = {
    invoice: {
      broker_desk_organization_id: orgId,
      deleted_at: null,
    },
    ...(body.method ? { method: body.method } : {}),
    ...(body.paid_at_from || body.paid_at_to
      ? {
          paid_at: {
            ...(body.paid_at_from ? { gte: new Date(body.paid_at_from) } : {}),
            ...(body.paid_at_to ? { lte: new Date(body.paid_at_to) } : {}),
          },
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_payments.count({ where }),
    MyGlobal.prisma.broker_desk_payments.findMany({
      where,
      include: paymentInclude,
      skip,
      take: limit,
      orderBy: { paid_at: "desc" },
    }),
  ]);
  return pageOf(
    rows.map((row) => toPayment(row, row.invoice)),
    total,
    page,
    limit,
  );
};

export const getPayment = async (
  paymentId: string,
): Promise<IBrokerDeskPayment> => {
  const { admin } = await requireAdmin();
  const row = await MyGlobal.prisma.broker_desk_payments.findFirst({
    where: {
      id: paymentId,
      invoice: {
        broker_desk_organization_id: admin.broker_desk_organization_id,
      },
    },
    include: paymentInclude,
  });
  if (!row) throw new HttpException("Payment not found", 404);
  return toPayment(row, row.invoice);
};

export const createPayment = async (
  invoiceId: string,
  body: IBrokerDeskPayment.ICreate,
): Promise<IBrokerDeskPayment> => {
  const { admin, session } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const invoice = await loadInvoice(orgId, invoiceId);
  if (invoice.deleted_at) throw new HttpException("Invoice not found", 404);
  if (invoice.status === "void")
    throw new HttpException("Cannot pay a void invoice", 409);
  if (invoice.status === "draft")
    throw new HttpException("Cannot pay a draft invoice", 409);
  const existing = await MyGlobal.prisma.broker_desk_payments.findFirst({
    where: {
      broker_desk_invoice_id: invoiceId,
      idempotency_key: body.idempotency_key,
    },
    include: paymentInclude,
  });
  if (existing) return toPayment(existing, existing.invoice);

  if (body.amount <= 0)
    throw new HttpException("Payment amount must be positive", 400);

  const now = new Date();
  const paymentId = randomUUID();
  try {
    await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.broker_desk_payments.create({
        data: {
          id: paymentId,
          broker_desk_invoice_id: invoiceId,
          amount: cad(body.amount),
          method: body.method,
          paid_at: new Date(body.paid_at),
          reference: body.reference,
          idempotency_key: body.idempotency_key,
          created_at: now,
          updated_at: now,
        },
      });
      const paid = await tx.broker_desk_payments.aggregate({
        where: { broker_desk_invoice_id: invoiceId },
        _sum: { amount: true },
      });
      const paidTotal = paid._sum.amount ?? 0;
      await tx.broker_desk_invoices.update({
        where: { id: invoiceId },
        data: {
          status: nextInvoiceStatus(invoice.status, invoice.total, paidTotal),
          updated_at: now,
        },
      });
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: unknown }).code === "P2002"
    ) {
      const again = await MyGlobal.prisma.broker_desk_payments.findFirst({
        where: {
          broker_desk_invoice_id: invoiceId,
          idempotency_key: body.idempotency_key,
        },
        include: paymentInclude,
      });
      if (again) return toPayment(again, again.invoice);
    }
    throw error;
  }

  await writeAdminAudit({
    orgId,
    adminId: admin.id,
    sessionId: session.id,
    action: "update",
    entityType: "invoice",
    entityRefId: invoiceId,
    after: { payment_id: paymentId, amount: cad(body.amount) },
  });

  const created = await MyGlobal.prisma.broker_desk_payments.findFirst({
    where: { id: paymentId },
    include: paymentInclude,
  });
  if (!created) throw new HttpException("Payment not found", 404);
  return toPayment(created, created.invoice);
};
