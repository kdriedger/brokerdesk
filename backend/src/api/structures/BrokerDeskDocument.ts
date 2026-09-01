import { tags } from "typia";

import { IPage } from "./IPage";

/**
 * Kind of paperwork a template produces.
 */
export type EDocumentTemplateKind =
  | "quote_proposal"
  | "policy_schedule"
  | "coi"
  | "certificate"
  | "invoice"
  | "custom";

/**
 * Language of a template wording.
 */
export type EDocumentLocale = "en" | "fr";

/**
 * Discriminator of the entity that owns a filed document.
 */
export type EDocumentOwnerType = "client" | "quote" | "policy" | "invoice";

/**
 * Staff actor category that filed a document.
 */
export type EDocumentUploaderType = "admin" | "producer" | "csr";

/**
 * Business classification of a filed document.
 */
export type EDocumentKind =
  | "quote_proposal"
  | "policy_schedule"
  | "coi"
  | "certificate"
  | "invoice"
  | "custom"
  | "attachment";

export namespace IBrokerDeskDocumentTemplate {
  /** Read model of a document template. */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    kind: EDocumentTemplateKind;
    name: string;
    locale: EDocumentLocale;
    retired: boolean;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
  }

  /** Full read model of a document template including the wording body. */
  export interface IBody extends ISummary {
    body: string;
  }

  /** Request body for creating a document template. */
  export interface ICreate {
    kind: EDocumentTemplateKind;
    name: string;
    body: string;
    locale: EDocumentLocale;
  }

  /** Request body for updating a document template; all fields optional. */
  export interface IUpdate {
    name?: string;
    body?: string;
    locale?: EDocumentLocale;
  }

  /** Search criteria for the template library index. */
  export interface IRequest {
    page?: number & tags.Type<"uint32">;
    limit?: number & tags.Type<"uint32">;
    kind?: EDocumentTemplateKind;
    locale?: EDocumentLocale;
    retired?: boolean;
    name?: string;
  }

  /** Request body for rendering paperwork from a template. */
  export interface IRenderRequest {
    /** Polymorphic owner entity the placeholders resolve against. */
    owner_type: EDocumentOwnerType;
    /** Identifier of the owner entity. */
    owner_id: string & tags.Format<"uuid">;
  }

  /** Rendered paperwork output. */
  export interface IRendered {
    document: IBrokerDeskDocument.ISummary;
    /** Rendered HTML/text stored on the rendition. */
    rendered_content: string;
  }
}

export namespace IBrokerDeskDocument {
  /** Full read model of a filed document. */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    template: IBrokerDeskDocumentTemplate.ISummary | null;
    owner_type: EDocumentOwnerType;
    /** Identifier of the owning entity. */
    owner_id: string & tags.Format<"uuid">;
    kind: EDocumentKind;
    filename: string;
    mime_type: string;
    size_bytes: number & tags.Type<"int32">;
    version: number & tags.Type<"int32">;
    uploaded_by_type: EDocumentUploaderType;
    uploaded_by_id: string & tags.Format<"uuid">;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
  }

  /** Read model exposing integrity metadata (checksum, storage path). */
  export interface IDetail extends ISummary {
    storage_path: string;
    checksum: string;
  }

  /** Request body for uploading (filing) a document against an owner. */
  export interface ICreate {
    owner_type: EDocumentOwnerType;
    owner_id: string & tags.Format<"uuid">;
    kind: EDocumentKind;
    filename: string;
    mime_type: string;
    /** Raw content of the file, base64-encoded for binary payloads. */
    content: string & tags.Format<"byte">;
  }

  /** Request body for re-uploading (replacing) the current rendition. */
  export interface IReplace {
    filename?: string;
    mime_type?: string;
    content: string & tags.Format<"byte">;
  }

  /** Search criteria for the document registry index. */
  export interface IRequest {
    page?: number & tags.Type<"uint32">;
    limit?: number & tags.Type<"uint32">;
    owner_type?: EDocumentOwnerType;
    owner_id?: string & tags.Format<"uuid">;
    kind?: EDocumentKind;
    filename?: string;
    template_id?: string & tags.Format<"uuid">;
  }

  /** Download result for the current rendition. */
  export interface IDownload {
    id: string & tags.Format<"uuid">;
    version: number & tags.Type<"int32">;
    filename: string;
    mime_type: string;
    size_bytes: number & tags.Type<"int32">;
    checksum: string;
    /** Raw file content, base64-encoded for binary payloads. */
    content: string & tags.Format<"byte">;
  }
}

export namespace IBrokerDeskDocumentVersion {
  /** Read model of a historical rendition of a document. */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    version_number: number & tags.Type<"int32">;
    filename: string;
    mime_type: string;
    size_bytes: number & tags.Type<"int32">;
    checksum: string;
    uploader_role: string;
    created_at: string & tags.Format<"date-time">;
  }

  /** Search criteria for a document's rendition history. */
  export interface IRequest {
    page?: number & tags.Type<"uint32">;
    limit?: number & tags.Type<"uint32">;
  }
}

/** Convenience aliases for paginated reads. */
export type IPageIBrokerDeskDocumentTemplateISummary = IPage<IBrokerDeskDocumentTemplate.ISummary>;
export type IPageIBrokerDeskDocumentISummary = IPage<IBrokerDeskDocument.ISummary>;
export type IPageIBrokerDeskDocumentVersionISummary = IPage<IBrokerDeskDocumentVersion.ISummary>;
