import { IBrokerDeskRevenueDashboard } from "../../api/structures/BrokerDeskBilling";
import { MyGlobal } from "../../MyGlobal";
import { requireAdmin } from "../auth/admin";
import { asInvoiceStatus } from "./mappers";

export const postRevenueDashboardSummary = async (
  body: IBrokerDeskRevenueDashboard.IRequest,
): Promise<IBrokerDeskRevenueDashboard> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const producerId = body.broker_desk_producer_id;
  const now = new Date();
  const ytd = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const mtd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const policyWhere = {
    organization_id: orgId,
    deleted_at: null,
    ...(producerId ? { producer_id: producerId } : {}),
  };
  const quoteWhere = {
    broker_desk_organization_id: orgId,
    deleted_at: null,
    ...(producerId ? { broker_desk_producer_id: producerId } : {}),
  };
  const invoiceWhere = {
    broker_desk_organization_id: orgId,
    deleted_at: null,
    ...(producerId
      ? { policy: { producer_id: producerId } }
      : {}),
  };
  const commissionWhere = {
    broker_desk_organization_id: orgId,
    deleted_at: null,
    status: "due",
    ...(producerId ? { broker_desk_producer_id: producerId } : {}),
  };

  const [
    due,
    premiumMtd,
    premiumYtd,
    quotes,
    receivables,
  ] = await Promise.all([
    MyGlobal.prisma.broker_desk_commissions.aggregate({
      where: commissionWhere,
      _sum: { agency_amount_cad: true },
    }),
    MyGlobal.prisma.broker_desk_policies.aggregate({
      where: { ...policyWhere, created_at: { gte: mtd } },
      _sum: { billed_premium_cad: true },
    }),
    MyGlobal.prisma.broker_desk_policies.aggregate({
      where: { ...policyWhere, created_at: { gte: ytd } },
      _sum: { billed_premium_cad: true },
    }),
    MyGlobal.prisma.broker_desk_quotes.groupBy({
      by: ["status"],
      where: quoteWhere,
      _count: { _all: true },
    }),
    MyGlobal.prisma.broker_desk_invoices.groupBy({
      by: ["status"],
      where: invoiceWhere,
      _sum: { total: true },
      _count: { _all: true },
    }),
  ]);

  const quotes_by_status: IBrokerDeskRevenueDashboard.IQuoteStatusCount[] =
    quotes.map((row) => ({
      status: row.status,
      count: row._count._all,
    }));

  const receivables_by_status: IBrokerDeskRevenueDashboard.IReceivableStatusTotal[] =
    receivables.map((row) => ({
      status: asInvoiceStatus(row.status),
      total: row._sum.total ?? 0,
      invoice_count: row._count._all,
    }));

  return {
    commission_due: due._sum.agency_amount_cad ?? 0,
    bound_premium_mtd: premiumMtd._sum.billed_premium_cad ?? 0,
    bound_premium_ytd: premiumYtd._sum.billed_premium_cad ?? 0,
    quotes_by_status,
    receivables_by_status,
  };
};
