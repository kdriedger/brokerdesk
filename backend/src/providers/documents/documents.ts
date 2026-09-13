import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { HttpException } from "@nestjs/common";

import {
  EDocumentOwnerType,
  IBrokerDeskDocument,
} from "../../api/structures/BrokerDeskDocument";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { pageArgs, pageOf } from "../../utils/pagination";
import { requireAdmin } from "../auth/admin";
import { documentInclude, toDocumentDetail, toDocumentSummary } from "./mappers";

const writeBytes = async (
  orgId: string,
  documentId: string,
  version: number,
  bytes: Buffer,
): Promise<string> => {
  const dir = path.join(process.cwd(), "var", "documents", orgId, documentId);
  await mkdir(dir, { recursive: true });
  const storage_path = path.join(
    "var",
    "documents",
    orgId,
    documentId,
    `v${version}`,
  );
  await writeFile(path.join(process.cwd(), storage_path), bytes);
  return storage_path;
};

const checksumOf = (bytes: Buffer): string =>
  createHash("sha256").update(bytes).digest("hex");

const decodeContent = (content: string): Buffer => {
  try {
    return Buffer.from(content, "base64");
  } catch {
    throw new HttpException("Invalid file content", 400);
  }
};

const loadDocument = async (orgId: string, documentId: string) => {
  const row = await MyGlobal.prisma.broker_desk_documents.findFirst({
    where: { id: documentId, broker_desk_organization_id: orgId },
    include: documentInclude,
  });
  if (!row) throw new HttpException("Document not found", 404);
  return row;
};

const assertOwner = async (
  orgId: string,
  ownerType: EDocumentOwnerType,
  ownerId: string,
): Promise<void> => {
  if (ownerType === "client") {
    const client = await MyGlobal.prisma.broker_desk_clients.findFirst({
      where: { id: ownerId, organization_id: orgId },
    });
    if (!client) throw new HttpException("Client not found", 404);
    return;
  }
  if (ownerType === "quote") {
    const quote = await MyGlobal.prisma.broker_desk_quotes.findFirst({
      where: {
        id: ownerId,
        broker_desk_organization_id: orgId,
        deleted_at: null,
      },
    });
    if (!quote) throw new HttpException("Quote not found", 404);
    return;
  }
  if (ownerType === "policy") {
    const policy = await MyGlobal.prisma.broker_desk_policies.findFirst({
      where: { id: ownerId, organization_id: orgId, deleted_at: null },
    });
    if (!policy) throw new HttpException("Policy not found", 404);
    return;
  }
  const invoice = await MyGlobal.prisma.broker_desk_invoices.findFirst({
    where: {
      id: ownerId,
      broker_desk_organization_id: orgId,
      deleted_at: null,
    },
  });
  if (!invoice) throw new HttpException("Invoice not found", 404);
};

const bindOwner = async (
  documentId: string,
  ownerType: EDocumentOwnerType,
  ownerId: string,
  now: Date,
): Promise<void> => {
  if (ownerType === "client") {
    await MyGlobal.prisma.broker_desk_document_client_owners.create({
      data: {
        id: randomUUID(),
        broker_desk_document_id: documentId,
        broker_desk_client_id: ownerId,
        created_at: now,
        updated_at: now,
      },
    });
    return;
  }
  if (ownerType === "quote") {
    await MyGlobal.prisma.broker_desk_document_quote_owners.create({
      data: {
        id: randomUUID(),
        broker_desk_document_id: documentId,
        broker_desk_quote_id: ownerId,
        created_at: now,
      },
    });
    return;
  }
  if (ownerType === "policy") {
    await MyGlobal.prisma.broker_desk_document_policy_owners.create({
      data: {
        id: randomUUID(),
        broker_desk_document_id: documentId,
        broker_desk_policy_id: ownerId,
        created_at: now,
        updated_at: now,
      },
    });
    return;
  }
  await MyGlobal.prisma.broker_desk_document_invoice_owners.create({
    data: {
      id: randomUUID(),
      broker_desk_document_id: documentId,
      broker_desk_invoice_id: ownerId,
      created_at: now,
    },
  });
};

export const patchDocuments = async (
  body: IBrokerDeskDocument.IRequest,
): Promise<IPage<IBrokerDeskDocument.ISummary>> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const { page, limit, skip } = pageArgs(body);
  const where = {
    broker_desk_organization_id: orgId,
    deleted_at: null,
    ...(body.owner_type ? { owner_type: body.owner_type } : {}),
    ...(body.kind ? { kind: body.kind } : {}),
    ...(body.filename
      ? { filename: { contains: body.filename, mode: "insensitive" as const } }
      : {}),
    ...(body.template_id
      ? { broker_desk_document_template_id: body.template_id }
      : {}),
    ...(body.owner_id && body.owner_type === "client"
      ? { clientOwner: { broker_desk_client_id: body.owner_id } }
      : {}),
    ...(body.owner_id && body.owner_type === "quote"
      ? { quoteOwner: { broker_desk_quote_id: body.owner_id } }
      : {}),
    ...(body.owner_id && body.owner_type === "policy"
      ? { policyOwner: { broker_desk_policy_id: body.owner_id } }
      : {}),
    ...(body.owner_id && body.owner_type === "invoice"
      ? { invoiceOwner: { broker_desk_invoice_id: body.owner_id } }
      : {}),
    ...(body.owner_id && !body.owner_type
      ? {
          OR: [
            { clientOwner: { broker_desk_client_id: body.owner_id } },
            { quoteOwner: { broker_desk_quote_id: body.owner_id } },
            { policyOwner: { broker_desk_policy_id: body.owner_id } },
            { invoiceOwner: { broker_desk_invoice_id: body.owner_id } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_documents.count({ where }),
    MyGlobal.prisma.broker_desk_documents.findMany({
      where,
      include: documentInclude,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
  ]);
  return pageOf(rows.map(toDocumentSummary), total, page, limit);
};

export const getDocument = async (
  documentId: string,
): Promise<IBrokerDeskDocument.IDetail> => {
  const { admin } = await requireAdmin();
  const row = await loadDocument(admin.broker_desk_organization_id, documentId);
  if (row.deleted_at) throw new HttpException("Document not found", 404);
  return toDocumentDetail(row);
};

export const createDocument = async (
  body: IBrokerDeskDocument.ICreate,
): Promise<IBrokerDeskDocument.ISummary> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  await assertOwner(orgId, body.owner_type, body.owner_id);
  const bytes = decodeContent(body.content);
  const now = new Date();
  const documentId = randomUUID();
  const versionId = randomUUID();
  const storage_path = await writeBytes(orgId, documentId, 1, bytes);
  const checksum = checksumOf(bytes);
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.broker_desk_documents.create({
      data: {
        id: documentId,
        broker_desk_organization_id: orgId,
        owner_type: body.owner_type,
        kind: body.kind,
        filename: body.filename,
        mime_type: body.mime_type,
        size_bytes: bytes.length,
        storage_path,
        checksum,
        version: 1,
        uploaded_by_type: "admin",
        uploaded_by_id: admin.id,
        created_at: now,
        updated_at: now,
      },
    });
    await tx.broker_desk_document_versions.create({
      data: {
        id: versionId,
        broker_desk_document_id: documentId,
        version_number: 1,
        filename: body.filename,
        mime_type: body.mime_type,
        size_bytes: bytes.length,
        storage_path,
        checksum,
        uploader_role: "ADMIN",
        created_at: now,
        ofAdmin: {
          create: {
            id: randomUUID(),
            broker_desk_admin_id: admin.id,
            created_at: now,
            updated_at: now,
          },
        },
      },
    });
  });
  await bindOwner(documentId, body.owner_type, body.owner_id, now);
  return toDocumentSummary(await loadDocument(orgId, documentId));
};

export const replaceDocument = async (
  documentId: string,
  body: IBrokerDeskDocument.IReplace,
): Promise<IBrokerDeskDocument.ISummary> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const existing = await loadDocument(orgId, documentId);
  if (existing.deleted_at) throw new HttpException("Document not found", 404);
  const bytes = decodeContent(body.content);
  const now = new Date();
  const nextVersion = existing.version + 1;
  const storage_path = await writeBytes(orgId, documentId, nextVersion, bytes);
  const checksum = checksumOf(bytes);
  const filename = body.filename ?? existing.filename;
  const mime_type = body.mime_type ?? existing.mime_type;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.broker_desk_document_versions.create({
      data: {
        id: randomUUID(),
        broker_desk_document_id: documentId,
        version_number: nextVersion,
        filename,
        mime_type,
        size_bytes: bytes.length,
        storage_path,
        checksum,
        uploader_role: "ADMIN",
        created_at: now,
        ofAdmin: {
          create: {
            id: randomUUID(),
            broker_desk_admin_id: admin.id,
            created_at: now,
            updated_at: now,
          },
        },
      },
    });
    await tx.broker_desk_documents.update({
      where: { id: documentId },
      data: {
        filename,
        mime_type,
        size_bytes: bytes.length,
        storage_path,
        checksum,
        version: nextVersion,
        uploaded_by_type: "admin",
        uploaded_by_id: admin.id,
        updated_at: now,
      },
    });
  });
  return toDocumentSummary(await loadDocument(orgId, documentId));
};

export const eraseDocument = async (documentId: string): Promise<void> => {
  const { admin } = await requireAdmin();
  const existing = await loadDocument(
    admin.broker_desk_organization_id,
    documentId,
  );
  if (existing.deleted_at) return;
  const now = new Date();
  await MyGlobal.prisma.broker_desk_documents.update({
    where: { id: documentId },
    data: { deleted_at: now, updated_at: now },
  });
};

export const downloadDocument = async (
  documentId: string,
): Promise<IBrokerDeskDocument.IDownload> => {
  const { admin } = await requireAdmin();
  const row = await loadDocument(admin.broker_desk_organization_id, documentId);
  if (row.deleted_at) throw new HttpException("Document not found", 404);
  let bytes: Buffer;
  try {
    bytes = await readFile(path.join(process.cwd(), row.storage_path));
  } catch {
    throw new HttpException("Stored file is missing", 404);
  }
  return {
    id: row.id,
    version: row.version,
    filename: row.filename,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    checksum: row.checksum,
    content: bytes.toString("base64"),
  };
};
