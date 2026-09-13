import { HttpException } from "@nestjs/common";

import {
  IBrokerDeskPolicyCancellation,
  IBrokerDeskPolicyCoverage,
} from "../../api/structures/BrokerDeskPolicy";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { pageArgs, pageOf } from "../../utils/pagination";
import { loadPolicy, requireOrgAdmin } from "./common";
import {
  csrInclude,
  toCancellation,
  toCancellationSummary,
  toCoverage,
  toCoverageSummary,
  toPolicySummary,
} from "./mappers";

export const indexCoverages = async (
  policyId: string,
): Promise<IPage<IBrokerDeskPolicyCoverage.ISummary>> => {
  const { orgId } = await requireOrgAdmin();
  await loadPolicy(orgId, policyId);
  const { page, limit, skip } = pageArgs({});
  const where = {
    broker_desk_policy_id: policyId,
    deleted_at: null as Date | null,
  };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_policy_coverages.count({ where }),
    MyGlobal.prisma.broker_desk_policy_coverages.findMany({
      where,
      orderBy: { created_at: "asc" },
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toCoverageSummary), total, page, limit);
};

export const atCoverage = async (
  policyId: string,
  coverageId: string,
): Promise<IBrokerDeskPolicyCoverage> => {
  const { orgId } = await requireOrgAdmin();
  const policy = await loadPolicy(orgId, policyId);
  const row = await MyGlobal.prisma.broker_desk_policy_coverages.findFirst({
    where: { id: coverageId, broker_desk_policy_id: policyId },
  });
  if (!row) throw new HttpException("Coverage not found", 404);
  return toCoverage(row, toPolicySummary(policy));
};

export const indexCancellations = async (
  policyId: string,
): Promise<IPage<IBrokerDeskPolicyCancellation.ISummary>> => {
  const { orgId } = await requireOrgAdmin();
  await loadPolicy(orgId, policyId);
  const { page, limit, skip } = pageArgs({});
  const where = { broker_desk_policy_id: policyId };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_policy_cancellations.count({ where }),
    MyGlobal.prisma.broker_desk_policy_cancellations.findMany({
      where,
      include: {
        reinstatement: { include: { csr: { include: csrInclude } } },
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toCancellationSummary), total, page, limit);
};

export const atCancellation = async (
  policyId: string,
  cancellationId: string,
): Promise<IBrokerDeskPolicyCancellation> => {
  const { orgId } = await requireOrgAdmin();
  const policy = await loadPolicy(orgId, policyId);
  const row = await MyGlobal.prisma.broker_desk_policy_cancellations.findFirst({
    where: { id: cancellationId, broker_desk_policy_id: policyId },
    include: {
      reinstatement: { include: { csr: { include: csrInclude } } },
    },
  });
  if (!row) throw new HttpException("Cancellation not found", 404);
  return toCancellation(row, toPolicySummary(policy));
};
