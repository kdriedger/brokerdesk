import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { HttpException } from "@nestjs/common";

import {
  EDocumentOwnerType,
  IBrokerDeskDocument,
  IBrokerDeskDocumentTemplate,
} from "../../api/structures/BrokerDeskDocument";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { pageArgs, pageOf } from "../../utils/pagination";
import { requireAdmin } from "../auth/admin";
import {
  asDocumentKind,
  documentInclude,
  toDocumentSummary,
  toTemplateBody,
  toTemplateSummary,
} from "./mappers";

const storageRoot = (): string =>
  path.join(process.cwd(), "var", "documents");

const writeBytes = async (
  orgId: string,
  documentId: string,
  version: number,
  bytes: Buffer,
): Promise<string> => {
  const dir = path.join(storageRoot(), orgId, documentId);
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

const loadTemplate = async (orgId: string, templateId: string) => {
  const row = await MyGlobal.prisma.broker_desk_document_templates.findFirst({
    where: { id: templateId, broker_desk_organization_id: orgId },
  });
  if (!row) throw new HttpException("Document template not found", 404);
  return row;
};

export const patchDocumentTemplates = async (
  body: IBrokerDeskDocumentTemplate.IRequest,
): Promise<IPage<IBrokerDeskDocumentTemplate.ISummary>> => {
  const { admin } = await requireAdmin();
  const { page, limit, skip } = pageArgs(body);
  const where = {
    broker_desk_organization_id: admin.broker_desk_organization_id,
    deleted_at: null,
    ...(body.kind ? { kind: body.kind } : {}),
    ...(body.locale ? { locale: body.locale } : {}),
    ...(body.retired === undefined ? {} : { retired: body.retired }),
    ...(body.name
      ? { name: { contains: body.name, mode: "insensitive" as const } }
      : {}),
  };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_document_templates.count({ where }),
    MyGlobal.prisma.broker_desk_document_templates.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
  ]);
  return pageOf(rows.map(toTemplateSummary), total, page, limit);
};

export const getDocumentTemplate = async (
  templateId: string,
): Promise<IBrokerDeskDocumentTemplate.IBody> => {
  const { admin } = await requireAdmin();
  return toTemplateBody(
    await loadTemplate(admin.broker_desk_organization_id, templateId),
  );
};

export const createDocumentTemplate = async (
  body: IBrokerDeskDocumentTemplate.ICreate,
): Promise<IBrokerDeskDocumentTemplate.IBody> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const now = new Date();
  const id = randomUUID();
  try {
    const row = await MyGlobal.prisma.broker_desk_document_templates.create({
      data: {
        id,
        broker_desk_organization_id: orgId,
        broker_desk_admin_id: admin.id,
        kind: body.kind,
        name: body.name,
        body: body.body,
        locale: body.locale,
        retired: false,
        created_at: now,
        updated_at: now,
      },
    });
    return toTemplateBody(row);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: unknown }).code === "P2002"
    )
      throw new HttpException(
        "A template with this kind and name already exists",
        409,
      );
    throw error;
  }
};

export const updateDocumentTemplate = async (
  templateId: string,
  body: IBrokerDeskDocumentTemplate.IUpdate,
): Promise<IBrokerDeskDocumentTemplate.IBody> => {
  const { admin } = await requireAdmin();
  const existing = await loadTemplate(
    admin.broker_desk_organization_id,
    templateId,
  );
  try {
    const row = await MyGlobal.prisma.broker_desk_document_templates.update({
      where: { id: existing.id },
      data: {
        name: body.name,
        body: body.body,
        locale: body.locale,
        updated_at: new Date(),
      },
    });
    return toTemplateBody(row);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: unknown }).code === "P2002"
    )
      throw new HttpException(
        "A template with this kind and name already exists",
        409,
      );
    throw error;
  }
};

export const retireDocumentTemplate = async (
  templateId: string,
): Promise<void> => {
  const { admin } = await requireAdmin();
  const existing = await loadTemplate(
    admin.broker_desk_organization_id,
    templateId,
  );
  const now = new Date();
  await MyGlobal.prisma.broker_desk_document_templates.update({
    where: { id: existing.id },
    data: { retired: true, updated_at: now },
  });
};

const ownerRecord = async (
  orgId: string,
  ownerType: EDocumentOwnerType,
  ownerId: string,
): Promise<Record<string, string | number | null>> => {
  if (ownerType === "client") {
    const client = await MyGlobal.prisma.broker_desk_clients.findFirst({
      where: { id: ownerId, organization_id: orgId },
    });
    if (!client) throw new HttpException("Client not found", 404);
    return { id: client.id, email: client.email };
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
    return {
      id: quote.id,
      status: quote.status,
      total_premium_cad: quote.total_premium_cad,
      grand_total_cad: quote.grand_total_cad,
    };
  }
  if (ownerType === "policy") {
    const policy = await MyGlobal.prisma.broker_desk_policies.findFirst({
      where: { id: ownerId, organization_id: orgId, deleted_at: null },
    });
    if (!policy) throw new HttpException("Policy not found", 404);
    return {
      id: policy.id,
      org_policy_number: policy.org_policy_number,
      billed_premium_cad: policy.billed_premium_cad,
      status: policy.status,
    };
  }
  const invoice = await MyGlobal.prisma.broker_desk_invoices.findFirst({
    where: {
      id: ownerId,
      broker_desk_organization_id: orgId,
      deleted_at: null,
    },
  });
  if (!invoice) throw new HttpException("Invoice not found", 404);
  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    total: invoice.total,
    status: invoice.status,
  };
};

const renderBody = (
  template: string,
  vars: Record<string, string | number | null>,
): string =>
  template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_match, key: string) => {
    const direct = vars[key];
    if (direct !== undefined && direct !== null) return String(direct);
    const nested = vars[key.split(".").pop() ?? key];
    if (nested !== undefined && nested !== null) return String(nested);
    return "";
  });

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

export const renderDocumentTemplate = async (
  templateId: string,
  body: IBrokerDeskDocumentTemplate.IRenderRequest,
): Promise<IBrokerDeskDocumentTemplate.IRendered> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const template = await loadTemplate(orgId, templateId);
  if (template.retired)
    throw new HttpException("Template is retired", 409);
  const vars = await ownerRecord(orgId, body.owner_type, body.owner_id);
  const rendered = renderBody(template.body, vars);
  const bytes = Buffer.from(rendered, "utf8");
  const now = new Date();
  const documentId = randomUUID();
  const versionId = randomUUID();
  const storage_path = await writeBytes(orgId, documentId, 1, bytes);
  const checksum = checksumOf(bytes);
  const filename = `${template.name}.html`;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.broker_desk_documents.create({
      data: {
        id: documentId,
        broker_desk_organization_id: orgId,
        broker_desk_document_template_id: template.id,
        owner_type: body.owner_type,
        kind: asDocumentKind(template.kind),
        filename,
        mime_type: "text/html",
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
        filename,
        mime_type: "text/html",
        size_bytes: bytes.length,
        storage_path,
        checksum,
        rendered_content: rendered,
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
  const document = await MyGlobal.prisma.broker_desk_documents.findFirstOrThrow(
    {
      where: { id: documentId },
      include: documentInclude,
    },
  );
  return {
    document: toDocumentSummary(document),
    rendered_content: rendered,
  };
};
