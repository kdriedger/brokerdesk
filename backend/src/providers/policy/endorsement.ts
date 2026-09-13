import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import {
  IBrokerDeskPolicyEndorsement,
} from "../../api/structures/BrokerDeskPolicy";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { pageArgs, pageOf } from "../../utils/pagination";
import { loadPolicy, requireCsr, requireOrgAdmin, withinTerm } from "./common";
import {
  csrInclude,
  toEndorsement,
  toEndorsementSummary,
  toPolicySummary,
} from "./mappers";

const loadEndorsement = async (
  orgId: string,
  policyId: string,
  endorsementId: string,
) => {
  const policy = await loadPolicy(orgId, policyId);
  const row = await MyGlobal.prisma.broker_desk_policy_endorsements.findFirst({
    where: {
      id: endorsementId,
      broker_desk_policy_id: policyId,
      deleted_at: null,
    },
    include: { creator: { include: csrInclude } },
  });
  if (!row) throw new HttpException("Endorsement not found", 404);
  return { policy, row };
};

export const indexEndorsements = async (
  policyId: string,
  body: IBrokerDeskPolicyEndorsement.IRequest,
): Promise<IPage<IBrokerDeskPolicyEndorsement.ISummary>> => {
  const { orgId } = await requireOrgAdmin();
  await loadPolicy(orgId, policyId);
  const { page, limit, skip } = pageArgs(body);
  const where = {
    broker_desk_policy_id: policyId,
    deleted_at: null as Date | null,
    ...(body.kind ? { status: body.kind } : {}),
  };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_policy_endorsements.count({ where }),
    MyGlobal.prisma.broker_desk_policy_endorsements.findMany({
      where,
      include: { creator: { include: csrInclude } },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toEndorsementSummary), total, page, limit);
};

export const atEndorsement = async (
  policyId: string,
  endorsementId: string,
): Promise<IBrokerDeskPolicyEndorsement> => {
  const { orgId } = await requireOrgAdmin();
  const { policy, row } = await loadEndorsement(orgId, policyId, endorsementId);
  return toEndorsement(row, toPolicySummary(policy));
};

export const createEndorsement = async (
  policyId: string,
  body: IBrokerDeskPolicyEndorsement.ICreate,
): Promise<IBrokerDeskPolicyEndorsement> => {
  const { orgId } = await requireOrgAdmin();
  const policy = await loadPolicy(orgId, policyId);
  const effective = new Date(body.effective_at);
  if (!withinTerm(effective, policy.term_start, policy.term_end))
    throw new HttpException(
      "Endorsement effective date must fall within the policy term",
      400,
    );
  const csr = await requireCsr(orgId);
  const now = new Date();
  const id = randomUUID();
  await MyGlobal.prisma.broker_desk_policy_endorsements.create({
    data: {
      id,
      broker_desk_policy_id: policyId,
      created_by: csr.id,
      type: body.type,
      effective_at: effective,
      description: body.description ?? null,
      premium_delta: body.premium_delta,
      fee_delta: body.fee_delta,
      status: "draft",
      created_at: now,
      updated_at: now,
    },
  });
  const { row } = await loadEndorsement(orgId, policyId, id);
  return toEndorsement(row, toPolicySummary(policy));
};

export const updateEndorsement = async (
  policyId: string,
  endorsementId: string,
  body: IBrokerDeskPolicyEndorsement.IUpdate,
): Promise<IBrokerDeskPolicyEndorsement> => {
  const { orgId } = await requireOrgAdmin();
  const { policy, row } = await loadEndorsement(orgId, policyId, endorsementId);
  if (row.status !== "draft")
    throw new HttpException("Issued endorsements are immutable", 409);
  const effective = body.effective_at
    ? new Date(body.effective_at)
    : row.effective_at;
  if (!withinTerm(effective, policy.term_start, policy.term_end))
    throw new HttpException(
      "Endorsement effective date must fall within the policy term",
      400,
    );
  await MyGlobal.prisma.broker_desk_policy_endorsements.update({
    where: { id: endorsementId },
    data: {
      type: body.type ?? undefined,
      effective_at: body.effective_at ? effective : undefined,
      description:
        body.description === undefined ? undefined : body.description,
      premium_delta: body.premium_delta ?? undefined,
      fee_delta: body.fee_delta ?? undefined,
      updated_at: new Date(),
    },
  });
  const loaded = await loadEndorsement(orgId, policyId, endorsementId);
  return toEndorsement(loaded.row, toPolicySummary(loaded.policy));
};

export const issueEndorsement = async (
  policyId: string,
  endorsementId: string,
): Promise<IBrokerDeskPolicyEndorsement> => {
  const { orgId } = await requireOrgAdmin();
  const { policy, row } = await loadEndorsement(orgId, policyId, endorsementId);
  if (row.status !== "draft")
    throw new HttpException("Endorsement is already issued", 409);
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.broker_desk_policy_endorsements.update({
      where: { id: endorsementId },
      data: { status: "issued", issued_at: now, updated_at: now },
    }),
    MyGlobal.prisma.broker_desk_policies.update({
      where: { id: policyId },
      data: {
        billed_premium_cad: policy.billed_premium_cad + row.premium_delta,
        broker_fee_cad: policy.broker_fee_cad + row.fee_delta,
        updated_at: now,
      },
    }),
  ]);
  const loaded = await loadEndorsement(orgId, policyId, endorsementId);
  return toEndorsement(loaded.row, toPolicySummary(loaded.policy));
};
