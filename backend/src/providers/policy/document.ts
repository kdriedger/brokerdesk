import { HttpException } from "@nestjs/common";
import { Prisma } from "../../prisma/client";

import { IBrokerDeskPolicyDocument } from "../../api/structures/BrokerDeskPolicyDocument";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { pageArgs, pageOf } from "../../utils/pagination";
import { loadPolicy, requireOrgAdmin } from "./common";
import { toDocument, toDocumentSummary, toPolicySummary } from "./mappers";

export const indexPolicyDocuments = async (
  policyId: string,
  body: IBrokerDeskPolicyDocument.IRequest,
): Promise<IPage<IBrokerDeskPolicyDocument.ISummary>> => {
  const { orgId } = await requireOrgAdmin();
  await loadPolicy(orgId, policyId);
  const { page, limit, skip } = pageArgs(body);
  const where: Prisma.broker_desk_documentsWhereInput = {
    broker_desk_organization_id: orgId,
    deleted_at: null,
    owner_type: "policy",
    policyOwner: { broker_desk_policy_id: policyId },
  };
  if (body.kind) where.kind = body.kind;
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";
  const orderBy: Prisma.broker_desk_documentsOrderByWithRelationInput =
    body.sort_by === "filename"
      ? { filename: sortOrder }
      : { created_at: sortOrder };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_documents.count({ where }),
    MyGlobal.prisma.broker_desk_documents.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toDocumentSummary), total, page, limit);
};

export const atPolicyDocument = async (
  policyId: string,
  documentId: string,
): Promise<IBrokerDeskPolicyDocument> => {
  const { orgId } = await requireOrgAdmin();
  const policy = await loadPolicy(orgId, policyId);
  const row = await MyGlobal.prisma.broker_desk_documents.findFirst({
    where: {
      id: documentId,
      broker_desk_organization_id: orgId,
      deleted_at: null,
      policyOwner: { broker_desk_policy_id: policyId },
    },
  });
  if (!row) throw new HttpException("Document not found", 404);
  return toDocument(row, toPolicySummary(policy));
};
