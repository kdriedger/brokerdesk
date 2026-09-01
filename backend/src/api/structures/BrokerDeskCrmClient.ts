import { tags } from "typia";

import { IBrokerDeskCsr } from "./BrokerDeskActorsCsr";
import { IBrokerDeskProducer } from "./BrokerDeskActorsProducer";

import { IBrokerDeskAddress } from "./BrokerDeskCrmAddress";
import {
  EClientLanguage,
  EClientStatus,
  EClientType,
  IBrokerDeskProducerSummary,
} from "./BrokerDeskCrmShared";

/**
 * Contact person belonging to a business client.
 *
 * Full entity described in the CRM schema; the projection here covers every
 * public column of {@link broker_desk_client_contacts} with soft-delete state.
 */
export interface IBrokerDeskClientContact {
  /** Primary key. */
  id: string & tags.Format<"uuid">;
  /** Full display name of the contact person. */
  name: string;
  /** Optional job title within the client's organization. */
  title: string | null;
  /** Email address used to reach the contact. */
  email: string | null;
  /** Free-form telephone number. */
  phone: string | null;
  /** Whether this contact is the client's preferred main contact. */
  is_primary: boolean;
  /** Creation timestamp. */
  created_at: string & tags.Format<"date-time">;
  /** Last modification timestamp. */
  updated_at: string & tags.Format<"date-time">;
  /** Soft-deletion timestamp, null while active. */
  deleted_at: (string & tags.Format<"date-time">) | null;
}

export namespace IBrokerDeskClientContact {
  /** Request body for creating a contact under a business client. */
  export interface ICreate {
    /** Full display name of the contact person. */
    name: string;
    /** Optional job title. */
    title?: string | null;
    /** Optional email address. */
    email?: string | null;
    /** Optional telephone number. */
    phone?: string | null;
    /** Whether this is the primary contact. */
    is_primary?: boolean;
  }

  /** Request body for updating a contact; all fields optional. */
  export interface IUpdate {
    /** Full display name. */
    name?: string;
    /** Optional job title. */
    title?: string | null;
    /** Optional email address. */
    email?: string | null;
    /** Optional telephone number. */
    phone?: string | null;
    /** Whether this is the primary contact. */
    is_primary?: boolean;
  }
}

/**
 * Atomic tag assignment on a client.
 */
export interface IBrokerDeskClientTag {
  /** Primary key of the tag assignment row. */
  id: string & tags.Format<"uuid">;
  /** The atomic tag text, e.g. "vip" or "construction". */
  value: string;
  /** When the tag was assigned. */
  created_at: string & tags.Format<"date-time">;
  /** When the tag assignment was last modified. */
  updated_at: string & tags.Format<"date-time">;
  /** Soft-deletion timestamp, null while the tag is active. */
  deleted_at: (string & tags.Format<"date-time">) | null;
}

/**
 * Metadata record of a document attached to a client.
 */
export interface IBrokerDeskClientDocument {
  /** Primary key of the document. */
  id: string & tags.Format<"uuid">;
  /** Kind of document, e.g. "policy_schedule" or "correspondence". */
  kind: string;
  /** Original filename shown to staff. */
  filename: string;
  /** MIME type of the stored content. */
  mime_type: string;
  /** Size of the stored content in bytes. */
  size: number & tags.Type<"int64">;
  /** Object-storage key where the content resides. */
  storage_path: string;
  /** Content checksum for integrity verification. */
  checksum: string | null;
  /** Version number for repeated uploads of the same document. */
  version: number & tags.Type<"int32">;
  /** Creation timestamp. */
  created_at: string & tags.Format<"date-time">;
  /** Soft-deletion timestamp, null while the document is active. */
  deleted_at: (string & tags.Format<"date-time">) | null;
  /** Staff member who uploaded the document. */
  uploaded_by: IBrokerDeskProducer.ISummary | IBrokerDeskCsr.ISummary;
}

/**
 * Insurance client of the brokerage — an individual or a business.
 */
export interface IBrokerDeskClient {
  /** Primary key. */
  id: string & tags.Format<"uuid">;
  /** Whether the client is an individual or a business. */
  client_type: EClientType;
  /** Legal name used on paperwork (business name, or "First Last"). */
  legal_name: string;
  /** First name for individual clients. */
  first_name: string | null;
  /** Last name for individual clients. */
  last_name: string | null;
  /** Preferred display name. */
  preferred_name: string | null;
  /** Primary province of the client (ON, QC, AB, BC, ...). */
  primary_province: string;
  /** Preferred correspondence language. */
  language: EClientLanguage;
  /** Primary email address. */
  email: string | null;
  /** Primary phone number. */
  phone: string | null;
  /** Lifecycle status of the client relationship. */
  status: EClientStatus;
  /** Free-form staff notes about the client. */
  notes: string | null;
  /** Creation timestamp. */
  created_at: string & tags.Format<"date-time">;
  /** Last modification timestamp. */
  updated_at: string & tags.Format<"date-time">;
  /** Soft-deletion timestamp, null while the client is active. */
  deleted_at: (string & tags.Format<"date-time">) | null;
  /** Producer who owns this book-of-business relationship. */
  assigned_producer: IBrokerDeskProducerSummary;
  /** Typed addresses owned by the client (mailing, billing, risk). */
  addresses: IBrokerDeskAddress[];
  /** Contacts of a business client. */
  contacts: IBrokerDeskClientContact[];
  /** Atomic tag assignments applied to the client. */
  tags: IBrokerDeskClientTag[];
}

export namespace IBrokerDeskClient {
  /** List-item projection of a client used in search results. */
  export interface ISummary {
    /** Primary key. */
    id: string & tags.Format<"uuid">;
    /** Whether the client is an individual or a business. */
    client_type: EClientType;
    /** Legal name. */
    legal_name: string;
    /** Preferred display name. */
    preferred_name: string | null;
    /** Primary province. */
    primary_province: string;
    /** Primary email. */
    email: string | null;
    /** Primary phone. */
    phone: string | null;
    /** Lifecycle status. */
    status: EClientStatus;
    /** Creation timestamp. */
    created_at: string & tags.Format<"date-time">;
    /** Owning producer. */
    assigned_producer: IBrokerDeskProducerSummary;
    /** Active tag values for quick scanning. */
    tag_values: string[];
  }

  /** Request body for creating a client. */
  export interface ICreate {
    /** Whether the client is an individual or a business. */
    client_type: EClientType;
    /** Legal name (required for business clients). */
    legal_name: string;
    /** First name (individual clients). */
    first_name?: string | null;
    /** Last name (individual clients). */
    last_name?: string | null;
    /** Preferred display name. */
    preferred_name?: string | null;
    /** Primary province code. */
    primary_province: string;
    /** Preferred language. */
    language?: EClientLanguage;
    /** Primary email address. */
    email?: string | null;
    /** Primary phone number. */
    phone?: string | null;
    /** Initial lifecycle status; defaults to "prospect". */
    status?: EClientStatus;
    /** Free-form notes. */
    notes?: string | null;
    /** Initial tag values to attach. */
    tags?: string[];
    /** Initial contact directory entries for business clients. */
    contacts?: IBrokerDeskClientContact.ICreate[];
  }

  /** Request body for updating a client; all fields optional. */
  export interface IUpdate {
    /** Legal name. */
    legal_name?: string;
    /** First name. */
    first_name?: string | null;
    /** Last name. */
    last_name?: string | null;
    /** Preferred display name. */
    preferred_name?: string | null;
    /** Primary province code. */
    primary_province?: string;
    /** Preferred language. */
    language?: EClientLanguage;
    /** Primary email. */
    email?: string | null;
    /** Primary phone. */
    phone?: string | null;
    /** Lifecycle status. */
    status?: EClientStatus;
    /** Free-form notes. */
    notes?: string | null;
    /** Producer assignment change. */
    assigned_producer_id?: string & tags.Format<"uuid">;
  }

  /** Search and filter criteria for the client index. */
  export interface IRequest {
    /** Page number, defaults to 1. */
    page?: number & tags.Type<"uint32">;
    /** Page size, defaults to 20. */
    limit?: number & tags.Type<"uint32">;
    /** Free-text match against name fields. */
    search?: string;
    /** Filter by lifecycle status. */
    status?: EClientStatus;
    /** Filter by owning producer. */
    assigned_producer_id?: string & tags.Format<"uuid">;
    /** Filter by primary province. */
    primary_province?: string;
    /** Filter by client type. */
    client_type?: EClientType;
    /** Filter to clients carrying ALL of these tags. */
    tags?: string[];
    /** Sort field, e.g. "created_at" or "legal_name". */
    sort?: string;
    /** Sort direction. */
    order?: "asc" | "desc";
  }

  /**
   * Chronological timeline entry mixing activities, tasks, quotes, and
   * policies for one client.
   */
  export interface ITimelineItem {
    /** Discriminates the entry kind. */
    kind: "activity" | "task" | "quote" | "policy";
    /** Primary key of the underlying record. */
    id: string & tags.Format<"uuid">;
    /** Short headline displayed in the timeline. */
    title: string;
    /** Optional longer body text. */
    body: string | null;
    /** Chronological sort key of the entry. */
    occurred_at: string & tags.Format<"date-time">;
  }

  /** Response of the client timeline endpoint. */
  export interface ITimeline {
    /** The owning client. */
    client: ISummary;
    /** Chronologically ordered mixed entries. */
    items: ITimelineItem[];
  }
}

/** Alias for the paginated client summary page. */
export interface IPageIBrokerDeskClientSummary extends IPage<IBrokerDeskClient.ISummary> {}

import { IPage } from "./IPage";
