import {
  EDocumentKind,
  EDocumentLocale,
  EDocumentOwnerType,
  EDocumentTemplateKind,
  EDocumentUploaderType,
  IBrokerDeskDocument,
  IBrokerDeskDocumentTemplate,
  IBrokerDeskDocumentVersion,
} from "../../api/structures/BrokerDeskDocument";
import { isoRequired } from "../../utils/iso";

const oneOf = <T extends string>(
  value: string,
  allowed: readonly T[],
  fallback: T,
): T => (allowed.includes(value as T) ? (value as T) : fallback);

export const asTemplateKind = (value: string): EDocumentTemplateKind =>
  oneOf(
    value,
    [
      "quote_proposal",
      "policy_schedule",
      "coi",
      "certificate",
      "invoice",
      "custom",
    ] as const,
    "custom",
  );

export const asLocale = (value: string): EDocumentLocale =>
  oneOf(value, ["en", "fr"] as const, "en");

export const asOwnerType = (value: string): EDocumentOwnerType =>
  oneOf(value, ["client", "quote", "policy", "invoice"] as const, "client");

export const asUploaderType = (value: string): EDocumentUploaderType =>
  oneOf(value, ["admin", "producer", "csr"] as const, "admin");

export const asDocumentKind = (value: string): EDocumentKind =>
  oneOf(
    value,
    [
      "quote_proposal",
      "policy_schedule",
      "coi",
      "certificate",
      "invoice",
      "custom",
      "attachment",
    ] as const,
    "attachment",
  );

export const toTemplateSummary = (row: {
  id: string;
  kind: string;
  name: string;
  locale: string;
  retired: boolean;
  created_at: Date;
  updated_at: Date;
}): IBrokerDeskDocumentTemplate.ISummary => ({
  id: row.id,
  kind: asTemplateKind(row.kind),
  name: row.name,
  locale: asLocale(row.locale),
  retired: row.retired,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
});

export const toTemplateBody = (row: {
  id: string;
  kind: string;
  name: string;
  locale: string;
  retired: boolean;
  body: string;
  created_at: Date;
  updated_at: Date;
}): IBrokerDeskDocumentTemplate.IBody => ({
  ...toTemplateSummary(row),
  body: row.body,
});

export const toDocumentSummary = (row: {
  id: string;
  owner_type: string;
  kind: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  version: number;
  uploaded_by_type: string;
  uploaded_by_id: string;
  created_at: Date;
  updated_at: Date;
  template?: {
    id: string;
    kind: string;
    name: string;
    locale: string;
    retired: boolean;
    created_at: Date;
    updated_at: Date;
  } | null;
  clientOwner?: { broker_desk_client_id: string } | null;
  quoteOwner?: { broker_desk_quote_id: string } | null;
  policyOwner?: { broker_desk_policy_id: string } | null;
  invoiceOwner?: { broker_desk_invoice_id: string } | null;
}): IBrokerDeskDocument.ISummary => {
  const owner_type = asOwnerType(row.owner_type);
  const owner_id =
    owner_type === "client"
      ? (row.clientOwner?.broker_desk_client_id ?? row.uploaded_by_id)
      : owner_type === "quote"
        ? (row.quoteOwner?.broker_desk_quote_id ?? row.uploaded_by_id)
        : owner_type === "policy"
          ? (row.policyOwner?.broker_desk_policy_id ?? row.uploaded_by_id)
          : (row.invoiceOwner?.broker_desk_invoice_id ?? row.uploaded_by_id);
  return {
    id: row.id,
    template: row.template ? toTemplateSummary(row.template) : null,
    owner_type,
    owner_id,
    kind: asDocumentKind(row.kind),
    filename: row.filename,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    version: row.version,
    uploaded_by_type: asUploaderType(row.uploaded_by_type),
    uploaded_by_id: row.uploaded_by_id,
    created_at: isoRequired(row.created_at),
    updated_at: isoRequired(row.updated_at),
  };
};

export const toDocumentDetail = (row: {
  id: string;
  owner_type: string;
  kind: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  version: number;
  uploaded_by_type: string;
  uploaded_by_id: string;
  created_at: Date;
  updated_at: Date;
  storage_path: string;
  checksum: string;
  template?: {
    id: string;
    kind: string;
    name: string;
    locale: string;
    retired: boolean;
    created_at: Date;
    updated_at: Date;
  } | null;
  clientOwner?: { broker_desk_client_id: string } | null;
  quoteOwner?: { broker_desk_quote_id: string } | null;
  policyOwner?: { broker_desk_policy_id: string } | null;
  invoiceOwner?: { broker_desk_invoice_id: string } | null;
}): IBrokerDeskDocument.IDetail => ({
  ...toDocumentSummary(row),
  storage_path: row.storage_path,
  checksum: row.checksum,
});

export const toVersionSummary = (row: {
  id: string;
  version_number: number;
  filename: string;
  mime_type: string;
  size_bytes: number;
  checksum: string;
  uploader_role: string;
  created_at: Date;
}): IBrokerDeskDocumentVersion.ISummary => ({
  id: row.id,
  version_number: row.version_number,
  filename: row.filename,
  mime_type: row.mime_type,
  size_bytes: row.size_bytes,
  checksum: row.checksum,
  uploader_role: row.uploader_role,
  created_at: isoRequired(row.created_at),
});

export const documentInclude = {
  template: true,
  clientOwner: true,
  quoteOwner: true,
  policyOwner: true,
  invoiceOwner: true,
};
