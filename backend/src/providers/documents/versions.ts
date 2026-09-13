import { HttpException } from "@nestjs/common";

import { IBrokerDeskDocumentVersion } from "../../api/structures/BrokerDeskDocument";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { pageArgs, pageOf } from "../../utils/pagination";
import { requireAdmin } from "../auth/admin";
import { toVersionSummary } from "./mappers";

const assertDocument = async (orgId: string, documentId: string) => {
  const row = await MyGlobal.prisma.broker_desk_documents.findFirst({
    where: { id: documentId, broker_desk_organization_id: orgId },
  });
  if (!row) throw new HttpException("Document not found", 404);
  return row;
};

export const patchDocumentVersions = async (
  documentId: string,
  body: IBrokerDeskDocumentVersion.IRequest,
): Promise<IPage<IBrokerDeskDocumentVersion.ISummary>> => {
  const { admin } = await requireAdmin();
  await assertDocument(admin.broker_desk_organization_id, documentId);
  const { page, limit, skip } = pageArgs(body);
  const where = { broker_desk_document_id: documentId };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_document_versions.count({ where }),
    MyGlobal.prisma.broker_desk_document_versions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { version_number: "desc" },
    }),
  ]);
  return pageOf(rows.map(toVersionSummary), total, page, limit);
};

export const getDocumentVersion = async (
  documentId: string,
  versionId: string,
): Promise<IBrokerDeskDocumentVersion.ISummary> => {
  const { admin } = await requireAdmin();
  await assertDocument(admin.broker_desk_organization_id, documentId);
  const row = await MyGlobal.prisma.broker_desk_document_versions.findFirst({
    where: { id: versionId, broker_desk_document_id: documentId },
  });
  if (!row) throw new HttpException("Document version not found", 404);
  return toVersionSummary(row);
};
