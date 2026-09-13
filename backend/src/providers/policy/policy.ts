import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";
import { Prisma } from "../../prisma/client";

import { IBrokerDeskPolicy } from "../../api/structures/BrokerDeskPolicy";
import { IBrokerDeskPolicyRenewalCandidate } from "../../api/structures/BrokerDeskPolicyRenewalCandidate";
import { IBrokerDeskQuote } from "../../api/structures/BrokerDeskQuoting";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { pageArgs, pageOf } from "../../utils/pagination";
import {
  coveragesFromProduct,
  coveragesFromQuoteLine,
  loadPolicy,
  requireOrgAdmin,
  uniquePolicyNumber,
  withinTerm,
  writeCoverages,
} from "./common";
import {
  policyInclude,
  policySummaryInclude,
  quoteInclude,
  quoteLineInclude,
  renewalInclude,
  toPolicy,
  toPolicySummary,
  toQuote,
  toRenewalSummary,
} from "./mappers";

const assertRefs = async (orgId: string, body: IBrokerDeskPolicy.ICreate) => {
  const [client, producer, product] = await Promise.all([
    MyGlobal.prisma.broker_desk_clients.findFirst({
      where: { id: body.client_id, organization_id: orgId },
    }),
    MyGlobal.prisma.broker_desk_producers.findFirst({
      where: {
        id: body.producer_id,
        broker_desk_organization_id: orgId,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.broker_desk_products.findFirst({
      where: { id: body.product_id, deleted_at: null },
    }),
  ]);
  if (!client) throw new HttpException("Client not found", 404);
  if (!producer) throw new HttpException("Producer not found", 404);
  if (!product) throw new HttpException("Product not found", 404);
  const carrier = await MyGlobal.prisma.broker_desk_carriers.findFirst({
    where: { id: body.carrier_id },
  });
  if (!carrier) throw new HttpException("Carrier not found", 404);
  if (product.broker_desk_carrier_id !== body.carrier_id)
    throw new HttpException("Product does not belong to carrier", 400);

  let quoteId: string | null = body.quote_id ?? null;
  let quoteLineId: string | null = body.quote_line_id ?? null;
  if (quoteLineId) {
    const line = await MyGlobal.prisma.broker_desk_quote_lines.findFirst({
      where: { id: quoteLineId },
      include: { quote: true },
    });
    if (!line) throw new HttpException("Quote line not found", 404);
    if (line.quote.broker_desk_organization_id !== orgId)
      throw new HttpException("Quote line not found", 404);
    if (quoteId && quoteId !== line.broker_desk_quote_id)
      throw new HttpException("Quote line does not belong to quote", 400);
    quoteId = line.broker_desk_quote_id;
  } else if (quoteId) {
    const quote = await MyGlobal.prisma.broker_desk_quotes.findFirst({
      where: {
        id: quoteId,
        broker_desk_organization_id: orgId,
        deleted_at: null,
      },
    });
    if (!quote) throw new HttpException("Quote not found", 404);
  }
  return { quoteId, quoteLineId };
};

const markQuoteBound = async (
  quoteId: string,
  quoteLineId: string,
  now: Date,
): Promise<void> => {
  await MyGlobal.prisma.broker_desk_quote_lines.updateMany({
    where: { broker_desk_quote_id: quoteId },
    data: { accepted: false, updated_at: now },
  });
  await MyGlobal.prisma.broker_desk_quote_lines.update({
    where: { id: quoteLineId },
    data: { accepted: true, updated_at: now },
  });
  await MyGlobal.prisma.broker_desk_quotes.update({
    where: { id: quoteId },
    data: { status: "bound", updated_at: now },
  });
};

export const indexPolicies = async (
  body: IBrokerDeskPolicy.IRequest,
): Promise<IPage<IBrokerDeskPolicy.ISummary>> => {
  const { orgId } = await requireOrgAdmin();
  const { page, limit, skip } = pageArgs(body);
  const where: Prisma.broker_desk_policiesWhereInput = {
    organization_id: orgId,
    deleted_at: null,
  };
  if (body.client_id) where.client_id = body.client_id;
  if (body.carrier_id) where.carrier_id = body.carrier_id;
  if (body.product_id) where.product_id = body.product_id;
  if (body.producer_id) where.producer_id = body.producer_id;
  if (body.status) where.status = body.status;
  if (body.province_of_risk) where.province_of_risk = body.province_of_risk;
  if (body.term_end_from || body.term_end_to) {
    where.term_end = {};
    if (body.term_end_from) where.term_end.gte = new Date(body.term_end_from);
    if (body.term_end_to) where.term_end.lte = new Date(body.term_end_to);
  }
  if (body.search) {
    where.OR = [
      { org_policy_number: { contains: body.search, mode: "insensitive" } },
      {
        carrier_policy_number: { contains: body.search, mode: "insensitive" },
      },
    ];
  }
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";
  const orderBy: Prisma.broker_desk_policiesOrderByWithRelationInput =
    body.sort_by === "term_end"
      ? { term_end: sortOrder }
      : body.sort_by === "billed_premium_cad"
        ? { billed_premium_cad: sortOrder }
        : body.sort_by === "org_policy_number"
          ? { org_policy_number: sortOrder }
          : { created_at: sortOrder };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_policies.count({ where }),
    MyGlobal.prisma.broker_desk_policies.findMany({
      where,
      include: policySummaryInclude,
      orderBy,
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toPolicySummary), total, page, limit);
};

export const atPolicy = async (policyId: string): Promise<IBrokerDeskPolicy> => {
  const { orgId } = await requireOrgAdmin();
  return toPolicy(await loadPolicy(orgId, policyId));
};

export const createPolicy = async (
  body: IBrokerDeskPolicy.ICreate,
): Promise<IBrokerDeskPolicy> => {
  const { orgId } = await requireOrgAdmin();
  const { quoteId, quoteLineId } = await assertRefs(orgId, body);
  const termStart = new Date(body.term_start);
  const termEnd = new Date(body.term_end);
  if (!(termStart.getTime() < termEnd.getTime()))
    throw new HttpException("term_end must be after term_start", 400);
  const now = new Date();
  const id = randomUUID();
  const number = await uniquePolicyNumber(orgId, body.org_policy_number);
  try {
    await MyGlobal.prisma.broker_desk_policies.create({
      data: {
        id,
        organization_id: orgId,
        client_id: body.client_id,
        carrier_id: body.carrier_id,
        product_id: body.product_id,
        producer_id: body.producer_id,
        quote_id: quoteId,
        quote_line_id: quoteLineId,
        org_policy_number: number,
        carrier_policy_number: body.carrier_policy_number ?? null,
        status: "active",
        term_start: termStart,
        term_end: termEnd,
        billed_premium_cad: body.billed_premium_cad,
        broker_fee_cad: body.broker_fee_cad,
        tax_amount_cad: body.tax_amount_cad,
        payment_plan: body.payment_plan,
        province_of_risk: body.province_of_risk,
        created_at: now,
        updated_at: now,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    )
      throw new HttpException("org_policy_number already exists", 409);
    throw err;
  }
  let coverages = await coveragesFromProduct(body.product_id);
  if (quoteLineId) {
    const line = await MyGlobal.prisma.broker_desk_quote_lines.findFirst({
      where: { id: quoteLineId },
      include: quoteLineInclude,
    });
    if (line) {
      const fromLine = coveragesFromQuoteLine(line);
      if (fromLine.length > 0) coverages = fromLine;
    }
    if (quoteId) await markQuoteBound(quoteId, quoteLineId, now);
  }
  await writeCoverages(id, coverages, now);
  return toPolicy(await loadPolicy(orgId, id));
};

export const updatePolicy = async (
  policyId: string,
  body: IBrokerDeskPolicy.IUpdate,
): Promise<IBrokerDeskPolicy> => {
  const { orgId } = await requireOrgAdmin();
  const current = await loadPolicy(orgId, policyId);
  if (body.producer_id) {
    const producer = await MyGlobal.prisma.broker_desk_producers.findFirst({
      where: {
        id: body.producer_id,
        broker_desk_organization_id: orgId,
        deleted_at: null,
      },
    });
    if (!producer) throw new HttpException("Producer not found", 404);
  }
  if (body.product_id) {
    const product = await MyGlobal.prisma.broker_desk_products.findFirst({
      where: { id: body.product_id, deleted_at: null },
    });
    if (!product) throw new HttpException("Product not found", 404);
    if (body.carrier_id && product.broker_desk_carrier_id !== body.carrier_id)
      throw new HttpException("Product does not belong to carrier", 400);
  }
  if (body.carrier_id) {
    const carrier = await MyGlobal.prisma.broker_desk_carriers.findFirst({
      where: { id: body.carrier_id },
    });
    if (!carrier) throw new HttpException("Carrier not found", 404);
  }
  const termStart = body.term_start
    ? new Date(body.term_start)
    : current.term_start;
  const termEnd = body.term_end ? new Date(body.term_end) : current.term_end;
  if (!(termStart.getTime() < termEnd.getTime()))
    throw new HttpException("term_end must be after term_start", 400);
  await MyGlobal.prisma.broker_desk_policies.update({
    where: { id: policyId },
    data: {
      carrier_id: body.carrier_id ?? undefined,
      product_id: body.product_id ?? undefined,
      producer_id: body.producer_id ?? undefined,
      carrier_policy_number:
        body.carrier_policy_number === undefined
          ? undefined
          : body.carrier_policy_number,
      status: body.status ?? undefined,
      term_start: body.term_start ? termStart : undefined,
      term_end: body.term_end ? termEnd : undefined,
      billed_premium_cad: body.billed_premium_cad ?? undefined,
      broker_fee_cad: body.broker_fee_cad ?? undefined,
      tax_amount_cad: body.tax_amount_cad ?? undefined,
      payment_plan: body.payment_plan ?? undefined,
      province_of_risk: body.province_of_risk ?? undefined,
      updated_at: new Date(),
    },
  });
  return toPolicy(await loadPolicy(orgId, policyId));
};

export const erasePolicy = async (policyId: string): Promise<void> => {
  const { orgId } = await requireOrgAdmin();
  await loadPolicy(orgId, policyId);
  const now = new Date();
  await MyGlobal.prisma.broker_desk_policies.update({
    where: { id: policyId },
    data: { deleted_at: now, updated_at: now },
  });
};

export const issuePolicy = async (
  policyId: string,
  body: IBrokerDeskPolicy.IIssue,
): Promise<IBrokerDeskPolicy> => {
  const { orgId } = await requireOrgAdmin();
  await loadPolicy(orgId, policyId);
  await MyGlobal.prisma.broker_desk_policies.update({
    where: { id: policyId },
    data: {
      carrier_policy_number: body.carrier_policy_number,
      updated_at: new Date(),
    },
  });
  return toPolicy(await loadPolicy(orgId, policyId));
};

export const cancelPolicy = async (
  policyId: string,
  body: IBrokerDeskPolicy.ICancellationResult extends never
    ? never
    : import("../../api/structures/BrokerDeskPolicy").IBrokerDeskPolicyCancellation.ICreate,
): Promise<IBrokerDeskPolicy.ICancellationResult> => {
  const { orgId } = await requireOrgAdmin();
  const policy = await loadPolicy(orgId, policyId);
  if (policy.status !== "active")
    throw new HttpException("Only active policies can be cancelled", 409);
  const effective = new Date(body.effective_date);
  if (!withinTerm(effective, policy.term_start, policy.term_end))
    throw new HttpException(
      "Cancellation effective date must fall within the policy term",
      400,
    );
  const now = new Date();
  const cancellationId = randomUUID();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.broker_desk_policy_cancellations.create({
      data: {
        id: cancellationId,
        broker_desk_policy_id: policyId,
        effective_date: effective,
        reason: body.reason,
        return_premium: body.return_premium ?? null,
        status: "requested",
        created_at: now,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.broker_desk_policies.update({
      where: { id: policyId },
      data: { status: "pending_cancel", updated_at: now },
    }),
  ]);
  const updated = await loadPolicy(orgId, policyId);
  const cancellation = updated.cancellations.find((c) => c.id === cancellationId);
  if (!cancellation)
    throw new HttpException("Failed to load cancellation", 500);
  const mapped = toPolicy(updated);
  const created = mapped.cancellations.find((c) => c.id === cancellationId);
  if (!created) throw new HttpException("Failed to map cancellation", 500);
  return { policy: mapped, cancellation: created };
};

export const reinstatePolicy = async (
  policyId: string,
  body: import("../../api/structures/BrokerDeskPolicy").IBrokerDeskPolicyReinstatement.ICreate,
): Promise<IBrokerDeskPolicy.IReinstatementResult> => {
  const { orgId } = await requireOrgAdmin();
  const policy = await loadPolicy(orgId, policyId);
  if (policy.status !== "pending_cancel" && policy.status !== "cancelled")
    throw new HttpException(
      "Only pending or cancelled policies can be reinstated",
      409,
    );
  const cancellation = policy.cancellations.find(
    (c) => c.id === body.cancellation_id,
  );
  if (!cancellation) throw new HttpException("Cancellation not found", 404);
  if (cancellation.reinstatement && cancellation.reinstatement.deleted_at === null)
    throw new HttpException("Cancellation already reinstated", 409);
  const csr = await requireCsrFromCommon(orgId);
  const now = new Date();
  const reinstatementId = randomUUID();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.broker_desk_policy_reinstatements.create({
      data: {
        id: reinstatementId,
        broker_desk_policy_cancellation_id: cancellation.id,
        broker_desk_csr_id: csr.id,
        effective_at: new Date(body.effective_at),
        notes: body.notes ?? null,
        created_at: now,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.broker_desk_policies.update({
      where: { id: policyId },
      data: { status: "active", updated_at: now },
    }),
  ]);
  const updated = await loadPolicy(orgId, policyId);
  const mapped = toPolicy(updated);
  const createdCancellation = mapped.cancellations.find(
    (c) => c.id === cancellation.id,
  );
  const reinstatement = createdCancellation?.reinstatement ?? null;
  if (!reinstatement)
    throw new HttpException("Failed to load reinstatement", 500);
  return { policy: mapped, reinstatement };
};

const requireCsrFromCommon = async (orgId: string) => {
  const { requireCsr } = await import("./common");
  return requireCsr(orgId);
};

export const renewalCandidates = async (
  body: IBrokerDeskPolicyRenewalCandidate.IRequest,
): Promise<IPage<IBrokerDeskPolicyRenewalCandidate>> => {
  const { orgId } = await requireOrgAdmin();
  const { page, limit, skip } = pageArgs(body);
  const now = new Date();
  const days = Math.max(0, body.days_ahead);
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const where: Prisma.broker_desk_policiesWhereInput = {
    organization_id: orgId,
    deleted_at: null,
    status: "active",
    term_end: { gte: now, lte: until },
  };
  const matching = await MyGlobal.prisma.broker_desk_policies.findMany({
    where,
    select: { id: true },
  });
  for (const row of matching) {
    const existing = await MyGlobal.prisma.broker_desk_policy_renewals.findFirst({
      where: { prior_policy_id: row.id, deleted_at: null },
      select: { id: true },
    });
    if (existing) continue;
    await MyGlobal.prisma.broker_desk_policy_renewals.create({
      data: {
        id: randomUUID(),
        organization_id: orgId,
        prior_policy_id: row.id,
        status: "scheduled",
        created_at: now,
        updated_at: now,
      },
    });
  }
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_policies.count({ where }),
    MyGlobal.prisma.broker_desk_policies.findMany({
      where,
      include: {
        ...policySummaryInclude,
        priorRenewal: { include: renewalInclude },
      },
      orderBy: { term_end: "asc" },
      skip,
      take: limit,
    }),
  ]);
  const data: IBrokerDeskPolicyRenewalCandidate[] = rows.map((row) => {
    const ms = row.term_end.getTime() - now.getTime();
    const daysTo = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
    return {
      policy: toPolicySummary(row),
      days_to_term_end: daysTo,
      existing_renewal: row.priorRenewal
        ? toRenewalSummary(row.priorRenewal)
        : null,
    };
  });
  return pageOf(data, total, page, limit);
};

export const bindQuote = async (
  quoteId: string,
  body: IBrokerDeskQuote.IBind,
): Promise<IBrokerDeskQuote.IBindResult> => {
  const { orgId } = await requireOrgAdmin();
  const quote = await MyGlobal.prisma.broker_desk_quotes.findFirst({
    where: {
      id: quoteId,
      broker_desk_organization_id: orgId,
      deleted_at: null,
    },
    include: quoteInclude,
  });
  if (!quote) throw new HttpException("Quote not found", 404);
  if (quote.status === "bound")
    throw new HttpException("Quote is already bound", 409);
  const line = quote.lines.find((l) => l.id === body.broker_desk_quote_line_id);
  if (!line) throw new HttpException("Quote line not found", 404);
  const existing = await MyGlobal.prisma.broker_desk_policies.findFirst({
    where: { quote_id: quoteId, deleted_at: null },
  });
  if (existing) throw new HttpException("Quote is already bound", 409);
  const now = new Date();
  const termStart = quote.desired_effective_date ?? now;
  const termEnd = new Date(termStart);
  termEnd.setFullYear(termEnd.getFullYear() + 1);
  const policyId = randomUUID();
  const orgNumber = await uniquePolicyNumber(
    orgId,
    `Q-${quote.id.slice(0, 8).toUpperCase()}`,
  );
  await MyGlobal.prisma.broker_desk_policies.create({
    data: {
      id: policyId,
      organization_id: orgId,
      client_id: quote.broker_desk_client_id,
      carrier_id: line.product.carrier.id,
      product_id: line.product.id,
      producer_id: quote.broker_desk_producer_id,
      quote_id: quote.id,
      quote_line_id: line.id,
      org_policy_number: orgNumber,
      status: "active",
      term_start: termStart,
      term_end: termEnd,
      billed_premium_cad: line.premium_cad ?? quote.total_premium_cad,
      broker_fee_cad: line.broker_fee_cad ?? quote.total_broker_fee_cad,
      tax_amount_cad: line.tax_amount_cad ?? quote.tax_amount_cad,
      payment_plan: "annual",
      province_of_risk: quote.producer.organization.primary_province,
      created_at: now,
      updated_at: now,
    },
  });
  const fromLine = coveragesFromQuoteLine(line);
  const coverages =
    fromLine.length > 0
      ? fromLine
      : await coveragesFromProduct(line.product.id);
  await writeCoverages(policyId, coverages, now);
  await markQuoteBound(quote.id, line.id, now);
  const [policy, boundQuote] = await Promise.all([
    loadPolicy(orgId, policyId),
    MyGlobal.prisma.broker_desk_quotes.findFirstOrThrow({
      where: { id: quote.id },
      include: quoteInclude,
    }),
  ]);
  return { policy: toPolicy(policy), quote: toQuote(boundQuote) };
};
