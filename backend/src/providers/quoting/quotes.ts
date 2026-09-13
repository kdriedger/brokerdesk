import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import { IPage } from "../../api/structures/IPage";
import {
  IBrokerDeskQuote,
  IBrokerDeskQuoteLine,
} from "../../api/structures/BrokerDeskQuoting";
import { MyGlobal } from "../../MyGlobal";
import { Prisma } from "../../prisma/client";
import { requireAdmin } from "../auth/admin";
import { pageArgs, pageOf } from "../../utils/pagination";
import {
  asQuoteStatus,
  assertQuoteMutable,
  assertTransition,
  coveragesFromSelections,
  loadProduct,
  loadQuote,
  parseDate,
  parseJsonObject,
  priceLineAmounts,
  quoteInclude,
  refreshQuoteTotals,
  resolveProducer,
  roundCad,
  toPolicy,
  toQuote,
  toQuoteLineSummary,
  toQuoteSummary,
  jsonString,
  assertEligible,
  commissionEstimate,
  taxFor,
} from "./common";

const insertLine = async (
  quote: Awaited<ReturnType<typeof loadQuote>>,
  body: IBrokerDeskQuoteLine.ICreate,
  now: Date,
) => {
  const product = await loadProduct(body.broker_desk_product_id);
  assertEligible(product, quote, body.rating_inputs);
  let premium = body.premium_cad ?? null;
  let fee = body.broker_fee_cad ?? null;
  let tax: number | null = null;
  let commission: number | null = null;
  if (premium !== null) {
    premium = roundCad(premium);
    fee = roundCad(fee ?? 0);
    tax = taxFor(quote.organization, premium, fee);
    commission = commissionEstimate(product, premium);
  }
  return MyGlobal.prisma.broker_desk_quote_lines.create({
    data: {
      id: randomUUID(),
      broker_desk_quote_id: quote.id,
      broker_desk_product_id: product.id,
      carrier_name_snapshot: product.carrier.name,
      carrier_code_snapshot: product.carrier.code,
      coverage_selections: jsonString(body.coverage_selections),
      rating_inputs: jsonString(body.rating_inputs),
      premium_cad: premium,
      broker_fee_cad: fee,
      tax_amount_cad: tax,
      commission_estimate_cad: commission,
      accepted: false,
      created_at: now,
      updated_at: now,
    },
  });
};

export const patchQuotes = async (
  body: IBrokerDeskQuote.IRequest,
): Promise<IPage<IBrokerDeskQuote.ISummary>> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const { page, limit, skip } = pageArgs(body);
  const where: Prisma.broker_desk_quotesWhereInput = {
    broker_desk_organization_id: orgId,
    deleted_at: null,
    broker_desk_client_id: body.broker_desk_client_id,
    broker_desk_producer_id: body.broker_desk_producer_id,
    status: body.status,
    expires_at: body.expires_before
      ? { lt: parseDate(body.expires_before) }
      : undefined,
    ...(body.search
      ? {
          OR: [
            { notes: { contains: body.search, mode: "insensitive" } },
            {
              client: {
                email: { contains: body.search, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };
  const sort = body.sort ?? "created_at";
  const order = body.order ?? "desc";
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_quotes.count({ where }),
    MyGlobal.prisma.broker_desk_quotes.findMany({
      where,
      include: quoteInclude,
      orderBy: { [sort]: order },
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toQuoteSummary), total, page, limit);
};

export const postQuotes = async (
  body: IBrokerDeskQuote.ICreate,
): Promise<IBrokerDeskQuote> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const client = await MyGlobal.prisma.broker_desk_clients.findFirst({
    where: { id: body.broker_desk_client_id, organization_id: orgId },
  });
  if (!client) throw new HttpException("Client not found", 404);
  const producer = await resolveProducer(orgId, admin.email);
  const now = new Date();
  const expiresAt = body.expires_at
    ? parseDate(body.expires_at)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const quoteId = randomUUID();
  await MyGlobal.prisma.broker_desk_quotes.create({
    data: {
      id: quoteId,
      broker_desk_organization_id: orgId,
      broker_desk_client_id: client.id,
      broker_desk_producer_id: producer.id,
      status: "draft",
      desired_effective_date:
        body.desired_effective_date === undefined ||
        body.desired_effective_date === null
          ? null
          : parseDate(body.desired_effective_date),
      expires_at: expiresAt,
      notes: body.notes ?? null,
      total_premium_cad: 0,
      total_broker_fee_cad: 0,
      tax_amount_cad: 0,
      grand_total_cad: 0,
      created_at: now,
      updated_at: now,
    },
  });
  const created = await loadQuote(orgId, quoteId);
  for (const line of body.lines ?? []) {
    await insertLine(created, line, now);
  }
  if ((body.lines ?? []).length > 0) await refreshQuoteTotals(MyGlobal.prisma, quoteId);
  return toQuote(await loadQuote(orgId, quoteId));
};

export const getQuote = async (quoteId: string): Promise<IBrokerDeskQuote> => {
  const { admin } = await requireAdmin();
  return toQuote(await loadQuote(admin.broker_desk_organization_id, quoteId));
};

export const putQuote = async (
  quoteId: string,
  body: IBrokerDeskQuote.IUpdate,
): Promise<IBrokerDeskQuote> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const quote = await loadQuote(orgId, quoteId);
  const current = asQuoteStatus(quote.status);
  if (body.status !== undefined) assertTransition(current, body.status);
  else assertQuoteMutable(current, "update");
  const now = new Date();
  await MyGlobal.prisma.broker_desk_quotes.update({
    where: { id: quote.id },
    data: {
      desired_effective_date:
        body.desired_effective_date === undefined
          ? undefined
          : body.desired_effective_date === null
            ? null
            : parseDate(body.desired_effective_date),
      expires_at:
        body.expires_at === undefined ? undefined : parseDate(body.expires_at),
      notes: body.notes === undefined ? undefined : body.notes,
      status: body.status,
      updated_at: now,
    },
  });
  return toQuote(await loadQuote(orgId, quoteId));
};

export const deleteQuote = async (quoteId: string): Promise<void> => {
  const { admin } = await requireAdmin();
  const quote = await loadQuote(admin.broker_desk_organization_id, quoteId);
  const now = new Date();
  await MyGlobal.prisma.broker_desk_quotes.update({
    where: { id: quote.id },
    data: { deleted_at: now, updated_at: now },
  });
};

export const postQuotePrice = async (
  quoteId: string,
  body: IBrokerDeskQuote.IPrice,
): Promise<IBrokerDeskQuote.IPriceResult> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const quote = await loadQuote(orgId, quoteId);
  const status = asQuoteStatus(quote.status);
  if (status !== "draft" && status !== "priced")
    throw new HttpException("Quote is not in a priceable state", 400);
  const overrides = new Map(
    body.lines.map((line) => [line.broker_desk_quote_line_id, line]),
  );
  if (body.lines.length > 0) {
    for (const item of body.lines) {
      if (!quote.lines.some((line) => line.id === item.broker_desk_quote_line_id))
        throw new HttpException("Quote line does not belong to this quote", 400);
    }
  }
  const targets =
    body.lines.length === 0
      ? quote.lines
      : quote.lines.filter((line) => overrides.has(line.id));
  const now = new Date();
  for (const line of targets) {
    const override = overrides.get(line.id);
    const amounts = priceLineAmounts(
      line.product,
      quote.organization,
      parseJsonObject(line.rating_inputs),
      {
        premium_cad: line.premium_cad,
        broker_fee_cad: line.broker_fee_cad,
      },
      {
        manual_premium_cad: override?.manual_premium_cad,
        manual_broker_fee_cad: override?.manual_broker_fee_cad,
      },
    );
    await MyGlobal.prisma.broker_desk_quote_lines.update({
      where: { id: line.id },
      data: { ...amounts, updated_at: now },
    });
  }
  await refreshQuoteTotals(MyGlobal.prisma, quote.id, {
    status: status === "draft" ? "priced" : status,
    updated_at: now,
  });
  const refreshed = await loadQuote(orgId, quoteId);
  return {
    total_premium_cad: refreshed.total_premium_cad,
    total_broker_fee_cad: refreshed.total_broker_fee_cad,
    tax_amount_cad: refreshed.tax_amount_cad,
    grand_total_cad: refreshed.grand_total_cad,
    lines: refreshed.lines.map(toQuoteLineSummary),
  };
};

export const postQuoteBind = async (
  quoteId: string,
  body: IBrokerDeskQuote.IBind,
): Promise<IBrokerDeskQuote.IBindResult> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const quote = await loadQuote(orgId, quoteId);
  const status = asQuoteStatus(quote.status);
  if (status === "bound")
    throw new HttpException("Quote is already bound", 409);
  if (status !== "submitted")
    throw new HttpException("Quote must be submitted before binding", 400);
  const line = quote.lines.find(
    (item) => item.id === body.broker_desk_quote_line_id,
  );
  if (!line) throw new HttpException("Quote line not found on this quote", 404);
  if (line.premium_cad === null)
    throw new HttpException("Accepted line is not priced", 400);
  const now = new Date();
  const policyId = randomUUID();
  const year = now.getFullYear();
  const existing = await MyGlobal.prisma.broker_desk_policies.count({
    where: { organization_id: orgId },
  });
  const orgPolicyNumber = `BD-${year}-${String(existing + 1).padStart(5, "0")}`;
  const termStart = quote.desired_effective_date ?? now;
  const termEnd = new Date(termStart.getTime());
  termEnd.setFullYear(termEnd.getFullYear() + 1);
  const fee = line.broker_fee_cad ?? 0;
  const tax = line.tax_amount_cad ?? 0;
  const coverages = coveragesFromSelections(
    parseJsonObject(line.coverage_selections),
    line.product,
    line.premium_cad,
  );
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.broker_desk_quote_lines.updateMany({
      where: { broker_desk_quote_id: quote.id },
      data: { accepted: false, updated_at: now },
    });
    await tx.broker_desk_quote_lines.update({
      where: { id: line.id },
      data: { accepted: true, updated_at: now },
    });
    await tx.broker_desk_quotes.update({
      where: { id: quote.id },
      data: { status: "bound", updated_at: now },
    });
    await tx.broker_desk_policies.create({
      data: {
        id: policyId,
        organization_id: orgId,
        client_id: quote.broker_desk_client_id,
        carrier_id: line.product.carrier.id,
        product_id: line.broker_desk_product_id,
        producer_id: quote.broker_desk_producer_id,
        quote_id: quote.id,
        quote_line_id: line.id,
        org_policy_number: orgPolicyNumber,
        status: "active",
        term_start: termStart,
        term_end: termEnd,
        billed_premium_cad: line.premium_cad ?? 0,
        broker_fee_cad: fee,
        tax_amount_cad: tax,
        payment_plan: "annual",
        province_of_risk: quote.organization.primary_province,
        created_at: now,
        updated_at: now,
      },
    });
    for (const coverage of coverages) {
      await tx.broker_desk_policy_coverages.create({
        data: {
          id: randomUUID(),
          broker_desk_policy_id: policyId,
          code: coverage.code,
          name: coverage.name,
          limit_amount: coverage.limit_amount,
          deductible: coverage.deductible,
          premium: coverage.premium,
          created_at: now,
          updated_at: now,
        },
      });
    }
  });
  const boundQuote = await loadQuote(orgId, quoteId);
  const policy = await MyGlobal.prisma.broker_desk_policies.findFirstOrThrow({
    where: { id: policyId },
    include: {
      organization: true,
      client: { include: { tags: true } },
      carrier: { include: { _count: { select: { products: true } } } },
      product: {
        include: {
          carrier: { include: { _count: { select: { products: true } } } },
          coverageItems: true,
          commissionSchedule: true,
        },
      },
      producer: { include: { organization: true } },
      coverages: {
        where: { deleted_at: null },
        orderBy: { created_at: "asc" },
      },
    },
  });
  const accepted = boundQuote.lines.find((item) => item.id === line.id);
  if (!accepted) throw new HttpException("Bound line missing after commit", 500);
  return {
    policy: toPolicy(policy, toQuote(boundQuote), toQuoteLineSummary(accepted)),
    quote: toQuote(boundQuote),
  };
};
