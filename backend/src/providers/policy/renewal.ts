import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";
import { Prisma } from "../../prisma/client";

import { IBrokerDeskPolicyRenewal } from "../../api/structures/BrokerDeskPolicy";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { pageArgs, pageOf } from "../../utils/pagination";
import {
  coveragesFromProduct,
  requireOrgAdmin,
  uniquePolicyNumber,
  writeCoverages,
} from "./common";
import { loadPolicy } from "./common";
import { renewalInclude, toRenewal } from "./mappers";

const loadRenewal = async (orgId: string, renewalId: string) => {
  const row = await MyGlobal.prisma.broker_desk_policy_renewals.findFirst({
    where: {
      id: renewalId,
      organization_id: orgId,
      deleted_at: null,
    },
    include: renewalInclude,
  });
  if (!row) throw new HttpException("Renewal not found", 404);
  return row;
};

export const indexRenewals = async (
  body: IBrokerDeskPolicyRenewal.IRequest,
): Promise<IPage<IBrokerDeskPolicyRenewal.ISummary>> => {
  const { orgId } = await requireOrgAdmin();
  const { page, limit, skip } = pageArgs(body);
  const where: Prisma.broker_desk_policy_renewalsWhereInput = {
    organization_id: orgId,
    deleted_at: null,
  };
  if (body.status) where.status = body.status;
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_policy_renewals.count({ where }),
    MyGlobal.prisma.broker_desk_policy_renewals.findMany({
      where,
      include: renewalInclude,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return pageOf(
    rows.map((row) => {
      const full = toRenewal(row);
      return {
        id: full.id,
        prior_policy: full.prior_policy,
        next_policy: full.next_policy,
        status: full.status,
        offered_premium_cad: full.offered_premium_cad,
        offered_at: full.offered_at,
        decided_at: full.decided_at,
      };
    }),
    total,
    page,
    limit,
  );
};

export const atRenewal = async (
  renewalId: string,
): Promise<IBrokerDeskPolicyRenewal> => {
  const { orgId } = await requireOrgAdmin();
  return toRenewal(await loadRenewal(orgId, renewalId));
};

export const offerRenewal = async (
  renewalId: string,
  body: IBrokerDeskPolicyRenewal.IOffer,
): Promise<IBrokerDeskPolicyRenewal> => {
  const { orgId } = await requireOrgAdmin();
  const row = await loadRenewal(orgId, renewalId);
  if (row.status !== "scheduled" && row.status !== "offered")
    throw new HttpException("Renewal cannot be offered in its current state", 409);
  const now = new Date();
  await MyGlobal.prisma.broker_desk_policy_renewals.update({
    where: { id: renewalId },
    data: {
      status: "offered",
      offered_premium_cad: body.offered_premium_cad,
      offered_at: now,
      notes: body.notes === undefined ? undefined : body.notes,
      updated_at: now,
    },
  });
  return toRenewal(await loadRenewal(orgId, renewalId));
};

export const decideRenewal = async (
  renewalId: string,
  body: IBrokerDeskPolicyRenewal.IDecide,
): Promise<IBrokerDeskPolicyRenewal> => {
  const { orgId } = await requireOrgAdmin();
  const row = await loadRenewal(orgId, renewalId);
  if (
    row.status === "accepted" ||
    row.status === "rewritten" ||
    row.status === "non_renewed" ||
    row.status === "lost"
  )
    throw new HttpException("Renewal already decided", 409);
  const now = new Date();
  if (body.decision === "non_renewed" || body.decision === "lost") {
    await MyGlobal.prisma.broker_desk_policy_renewals.update({
      where: { id: renewalId },
      data: {
        status: body.decision,
        decided_at: now,
        notes: body.notes === undefined ? undefined : body.notes,
        updated_at: now,
      },
    });
    return toRenewal(await loadRenewal(orgId, renewalId));
  }

  const prior = await loadPolicy(orgId, row.prior_policy_id);
  const nextId = randomUUID();
  const termStart = prior.term_end;
  const termEnd = new Date(prior.term_end);
  termEnd.setFullYear(termEnd.getFullYear() + 1);
  const orgNumber = await uniquePolicyNumber(
    orgId,
    `${prior.org_policy_number}-R`,
  );
  const premium = row.offered_premium_cad ?? prior.billed_premium_cad;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.broker_desk_policies.create({
      data: {
        id: nextId,
        organization_id: orgId,
        client_id: prior.client.id,
        carrier_id: prior.carrier.id,
        product_id: prior.product.id,
        producer_id: prior.producer.id,
        org_policy_number: orgNumber,
        carrier_policy_number: null,
        status: "active",
        term_start: termStart,
        term_end: termEnd,
        billed_premium_cad: premium,
        broker_fee_cad: prior.broker_fee_cad,
        tax_amount_cad: prior.tax_amount_cad,
        payment_plan: prior.payment_plan,
        province_of_risk: prior.province_of_risk,
        created_at: now,
        updated_at: now,
      },
    });
    await tx.broker_desk_policy_renewals.update({
      where: { id: renewalId },
      data: {
        status: body.decision,
        next_policy_id: nextId,
        decided_at: now,
        notes: body.notes === undefined ? undefined : body.notes,
        updated_at: now,
      },
    });
  });
  const liveCoverages = prior.coverages.filter((c) => c.deleted_at === null);
  if (liveCoverages.length > 0) {
    await writeCoverages(
      nextId,
      liveCoverages.map((c) => ({
        code: c.code,
        name: c.name,
        limit_amount: c.limit_amount,
        deductible: c.deductible,
        premium: c.premium,
      })),
      now,
    );
  } else {
    await writeCoverages(
      nextId,
      await coveragesFromProduct(prior.product.id),
      now,
    );
  }
  return toRenewal(await loadRenewal(orgId, renewalId));
};
