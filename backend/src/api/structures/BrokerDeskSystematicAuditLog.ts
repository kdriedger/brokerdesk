import { tags } from "typia";

import { IBrokerDeskOrganization } from "./BrokerDeskSystematicOrganization";

/**
 * Staff actor family that performed an audited event; routes attribution
 * resolution to the matching one-to-one companion record.
 */
export type EBrokerDeskAuditActorType = "admin" | "producer" | "csr";

/**
 * Verb performed on the audited entity; `access` denotes a read touching
 * client personal information captured for privacy accountability (PIPEDA)
 * rather than a data mutation.
 */
export type EBrokerDeskAuditAction = "create" | "update" | "delete" | "access";

/**
 * Logical domain type label of the audited entity; paired with the entity
 * reference identifier it forms the lookup path for the complete change
 * history of any single record.
 */
export type EBrokerDeskAuditEntityType =
  | "client"
  | "quote"
  | "policy"
  | "endorsement"
  | "invoice"
  | "commission"
  | "admin"
  | "producer"
  | "csr"
  | "product";

/**
 * Immutable append-only audit trail entry attributing a recorded creation,
 * modification, deletion, or client-PII access event on a critical business
 * entity to the acting staff member within one brokerage.
 *
 * Rows are written once by the platform and never mutated or soft-deleted,
 * so this DTO is served exclusively by read-only endpoints. Concrete
 * attribution to the acting identity lives one-to-one in exactly one of the
 * three attribution compositions selected by the actor_type discriminator.
 */
export interface IBrokerDeskAuditLog {
  /** Primary key of the audit entry. */
  id: string & tags.Format<"uuid">;

  /** Brokerage tenant owning the entry; inherits the scope of the change described. */
  organization: IBrokerDeskOrganization.ISummary;

  /** Staff actor family that performed the recorded event. */
  actor_type: EBrokerDeskAuditActorType;

  /** Verb performed on the affected entity. */
  action: EBrokerDeskAuditAction;

  /** Logical domain type of the audited entity. */
  entity_type: EBrokerDeskAuditEntityType;

  /** Primary key of the affected entity row. */
  entity_ref_id: string & tags.Format<"uuid">;

  /** Serialized JSON text of the entity state before the change; null for create and access events. */
  before_data: string | null;

  /** Serialized JSON text of the entity state after the change; null for delete and access events. */
  after_data: string | null;

  /** Administrator attribution; populated when actor_type is `admin`. */
  admin_attribution: IBrokerDeskAuditLogOfAdmin | null;

  /** Producer attribution; populated when actor_type is `producer`. */
  producer_attribution: IBrokerDeskAuditLogOfProducer | null;

  /** CSR attribution; populated when actor_type is `csr`. */
  csr_attribution: IBrokerDeskAuditLogOfCsr | null;

  /** Recording moment of the event; doubles as the occurrence moment because rows are immutable. */
  created_at: string & tags.Format<"date-time">;
}

export namespace IBrokerDeskAuditLog {
  /**
   * Essential display projection for paginated audit trail listings.
   *
   * The serialized before/after snapshots and attribution compositions are
   * deferred to the detail read.
   */
  export interface ISummary {
    /** Primary key of the audit entry. */
    id: string & tags.Format<"uuid">;

    /** Brokerage tenant owning the entry. */
    organization: IBrokerDeskOrganization.ISummary;

    /** Staff actor family that performed the recorded event. */
    actor_type: EBrokerDeskAuditActorType;

    /** Verb performed on the affected entity. */
    action: EBrokerDeskAuditAction;

    /** Logical domain type of the audited entity. */
    entity_type: EBrokerDeskAuditEntityType;

    /** Primary key of the affected entity row. */
    entity_ref_id: string & tags.Format<"uuid">;

    /** Recording moment of the event. */
    created_at: string & tags.Format<"date-time">;
  }

  /**
   * Search criteria for the audit trail listing; every field is optional.
   *
   * Tenant scope is always taken from the JWT identity and never accepted
   * from the client, so administrators review the trail strictly within
   * their own brokerage.
   */
  export interface IRequest {
    /** 1-based page index to return. */
    page?: number;

    /** Maximum number of entries per page. */
    limit?: number;

    /** Restrict to entries performed by the given actor family. */
    actor_type?: EBrokerDeskAuditActorType;

    /** Restrict to entries performing the given verb. */
    action?: EBrokerDeskAuditAction;

    /** Restrict to entries affecting the given entity type. */
    entity_type?: EBrokerDeskAuditEntityType;

    /** Restrict to entries affecting the given entity row; combine with entity_type to review a single record's history. */
    entity_ref_id?: string & tags.Format<"uuid">;

    /** Inclusive lower bound on the recording timestamp. */
    created_from?: string & tags.Format<"date-time">;

    /** Inclusive upper bound on the recording timestamp. */
    created_to?: string & tags.Format<"date-time">;

    /** Column to order results by. */
    order_by?: "created_at";

    /** Ordering direction; defaults to descending (newest first). */
    order_direction?: "asc" | "desc";
  }
}

/**
 * Administrator attribution binding an audit entry to the acting
 * administrator account and to the sign-in session in effect at the time.
 *
 * Administrator accounts and sessions live in the user administration and
 * auth modules; this composition exposes their identifiers so compliance
 * reviewers can resolve who changed a critical record and from which
 * authenticated device. Rows are written once alongside the audit entry and
 * never updated or deleted.
 */
export interface IBrokerDeskAuditLogOfAdmin {
  /** Primary key of the attribution row. */
  id: string & tags.Format<"uuid">;

  /** Audit entry this attribution annotates; strictly one-to-one. */
  broker_desk_audit_log_id: string & tags.Format<"uuid">;

  /** Administrator account whose credentials were used for the audited action. */
  broker_desk_admin_id: string & tags.Format<"uuid">;

  /** Authenticated sign-in session during which the audited action occurred. */
  broker_desk_admin_session_id: string & tags.Format<"uuid">;

  /** Timestamp at which the attribution row was written; immutable afterwards. */
  created_at: string & tags.Format<"date-time">;
}

/**
 * Producer attribution identifying a producer member as the actor behind an
 * audit entry, pairing the entry with the exact producer sign-in session
 * that was active when the action occurred.
 *
 * The session reference preserves device-level investigation context (ip,
 * href, referrer stored on the session) for PIPEDA-aware reviews of how
 * client personal information was accessed.
 */
export interface IBrokerDeskAuditLogOfProducer {
  /** Primary key of the attribution row. */
  id: string & tags.Format<"uuid">;

  /** Audit entry this attribution annotates; strictly one-to-one. */
  broker_desk_audit_log_id: string & tags.Format<"uuid">;

  /** Producer account identified as the actor of the annotated entry. */
  broker_desk_producer_id: string & tags.Format<"uuid">;

  /** Producer sign-in session during which the audited action was performed. */
  broker_desk_producer_session_id: string & tags.Format<"uuid">;

  /** Timestamp at which the attribution row was written; immutable afterwards. */
  created_at: string & tags.Format<"date-time">;
}

/**
 * CSR attribution binding an audit entry to the customer service
 * representative who performed the audited change.
 *
 * The session identifier is stored deliberately as a bare reference rather
 * than an enforced foreign key so the immutable audit history survives
 * session-table housekeeping.
 */
export interface IBrokerDeskAuditLogOfCsr {
  /** Primary key of the attribution row. */
  id: string & tags.Format<"uuid">;

  /** Audit entry attributed to the CSR; strictly one-to-one. */
  broker_desk_audit_log_id: string & tags.Format<"uuid">;

  /** Customer service representative who performed the audited action. */
  broker_desk_csr_id: string & tags.Format<"uuid">;

  /** CSR sign-in session that was active when the audit entry was written. */
  broker_desk_csr_session_id: string & tags.Format<"uuid">;

  /** Timestamp at which the attribution row was persisted; immutable afterwards. */
  created_at: string & tags.Format<"date-time">;
}
