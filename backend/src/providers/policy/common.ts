import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { requireAdmin } from "../auth/admin";
import {
  csrInclude,
  policyInclude,
  PolicyRow,
  QuoteLineRow,
} from "./mappers";

export const orgIdOf = (admin: { broker_desk_organization_id: string }) =>
  admin.broker_desk_organization_id;

export const requireOrgAdmin = async () => {
  const ctx = await requireAdmin();
  return { ...ctx, orgId: orgIdOf(ctx.admin) };
};

export const loadPolicy = async (
  orgId: string,
  policyId: string,
): Promise<PolicyRow> => {
  const row = await MyGlobal.prisma.broker_desk_policies.findFirst({
    where: { id: policyId, organization_id: orgId, deleted_at: null },
    include: policyInclude,
  });
  if (!row) throw new HttpException("Policy not found", 404);
  return row;
};

export const requireCsr = async (orgId: string) => {
  const csr = await MyGlobal.prisma.broker_desk_csrs.findFirst({
    where: {
      broker_desk_organization_id: orgId,
      deleted_at: null,
      active: true,
    },
    include: csrInclude,
    orderBy: { created_at: "asc" },
  });
  if (!csr)
    throw new HttpException(
      "No active CSR in the organization to attribute this action",
      409,
    );
  return csr;
};

export type CoverageInput = {
  code: string;
  name: string;
  limit_amount: number | null;
  deductible: number | null;
  premium: number;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return null;
  return value as Record<string, unknown>;
};

const numOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const numOrZero = (value: unknown): number => numOrNull(value) ?? 0;

const str = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const coverageFromRecord = (
  rec: Record<string, unknown>,
  fallbackCode: string,
): CoverageInput | null => {
  const code = str(rec.code) ?? str(rec.coverage_code) ?? fallbackCode;
  const name = str(rec.name) ?? str(rec.coverage_name) ?? code;
  if (!code) return null;
  return {
    code,
    name,
    limit_amount: numOrNull(rec.limit_amount) ?? numOrNull(rec.limit),
    deductible: numOrNull(rec.deductible),
    premium: numOrZero(rec.premium) ?? numOrZero(rec.premium_cad),
  };
};

export const coveragesFromQuoteLine = (line: QuoteLineRow): CoverageInput[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line.coverage_selections);
  } catch {
    return [];
  }
  if (Array.isArray(parsed)) {
    const out: CoverageInput[] = [];
    for (const item of parsed) {
      const rec = asRecord(item);
      if (!rec) continue;
      const cov = coverageFromRecord(rec, "");
      if (cov) out.push(cov);
    }
    return out;
  }
  const root = asRecord(parsed);
  if (!root) return [];
  const out: CoverageInput[] = [];
  for (const [code, value] of Object.entries(root)) {
    if (typeof value === "boolean") {
      if (value) out.push({ code, name: code, limit_amount: null, deductible: null, premium: 0 });
      continue;
    }
    const rec = asRecord(value);
    if (!rec) continue;
    const cov = coverageFromRecord(rec, code);
    if (cov) out.push(cov);
  }
  return out;
};

export const coveragesFromProduct = async (
  productId: string,
): Promise<CoverageInput[]> => {
  const items = await MyGlobal.prisma.broker_desk_coverage_items.findMany({
    where: { broker_desk_product_id: productId, deleted_at: null },
    orderBy: { code: "asc" },
  });
  return items.map((item) => ({
    code: item.code,
    name: item.name,
    limit_amount: item.default_limit,
    deductible: null,
    premium: 0,
  }));
};

export const writeCoverages = async (
  policyId: string,
  coverages: CoverageInput[],
  now: Date,
): Promise<void> => {
  if (coverages.length === 0) return;
  await MyGlobal.prisma.broker_desk_policy_coverages.createMany({
    data: coverages.map((c) => ({
      id: randomUUID(),
      broker_desk_policy_id: policyId,
      code: c.code,
      name: c.name,
      limit_amount: c.limit_amount,
      deductible: c.deductible,
      premium: c.premium,
      created_at: now,
      updated_at: now,
    })),
  });
};

export const withinTerm = (at: Date, start: Date, end: Date): boolean =>
  at.getTime() >= start.getTime() && at.getTime() <= end.getTime();

export const uniquePolicyNumber = async (
  orgId: string,
  preferred: string,
): Promise<string> => {
  const existing = await MyGlobal.prisma.broker_desk_policies.findFirst({
    where: { organization_id: orgId, org_policy_number: preferred },
    select: { id: true },
  });
  if (!existing) return preferred;
  return `${preferred}-${randomUUID().slice(0, 8)}`;
};
