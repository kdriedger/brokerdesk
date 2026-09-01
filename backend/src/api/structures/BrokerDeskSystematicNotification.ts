import { tags } from "typia";

import { IBrokerDeskOrganization } from "./BrokerDeskSystematicOrganization";

/**
 * Trigger family that raised a notification; mirrors the five persisted
 * notification triggers required by the platform and lets consumers render
 * type-specific icons, grouping, and deep links without parsing prose.
 */
export type EBrokerDeskNotificationType =
  | "task_due"
  | "producer_licence_expiring"
  | "policy_expiring"
  | "renewal_due"
  | "submission_status_changed";

/**
 * Actor family a notification recipient belongs to.
 *
 * Brokerage identities are physically realized as separate actor tables
 * (administrators, producers, CSRs, and portal clients), so the role
 * selects which table holds the recipient row identified by the recipient
 * user identifier.
 */
export type EBrokerDeskRecipientRole = "ADMIN" | "PRODUCER" | "CSR" | "CLIENT";

/**
 * Alert record addressed to exactly one staff member or portal user, raised
 * by persisted system triggers such as task due dates, expiring producer
 * licences, expiring policies, upcoming renewals, and carrier submission
 * status changes.
 *
 * Rows are written exclusively by the platform's persisted triggers; users
 * never author notifications, they only browse, acknowledge, and dismiss
 * them, so no creation or free-form update endpoint exists for this
 * resource.
 */
export interface IBrokerDeskNotification {
  /** Primary key of the notification. */
  id: string & tags.Format<"uuid">;

  /** Brokerage tenant that owns the notification. */
  organization: IBrokerDeskOrganization.ISummary;

  /** Trigger family that raised the alert. */
  type: EBrokerDeskNotificationType;

  /** Short human-readable headline displayed in notification lists. */
  title: string;

  /** Free-form message elaborating the alert beyond its headline. */
  body: string;

  /** Actor family the recipient belongs to. */
  recipient_role: EBrokerDeskRecipientRole;

  /** Identifier of the addressed person within the actor table selected by recipient_role. */
  recipient_user_id: string & tags.Format<"uuid">;

  /** Logical table name of the entity that triggered the notification (deep-link target). */
  source_entity_type: string;

  /** Primary key of the triggering entity inside the table named by source_entity_type. */
  source_entity_id: string & tags.Format<"uuid">;

  /** Moment the recipient acknowledged the alert; null while unread. */
  read_at: (string & tags.Format<"date-time">) | null;

  /** Moment the trigger persisted this alert; inbox listings sort descending on it. */
  created_at: string & tags.Format<"date-time">;

  /** Last modification time, advanced when acknowledgement is stamped. */
  updated_at: string & tags.Format<"date-time">;

  /** Soft-dismissal marker; null while the notification remains visible in the inbox. */
  deleted_at: (string & tags.Format<"date-time">) | null;
}

export namespace IBrokerDeskNotification {
  /**
   * Essential display projection for paginated inbox listings; the
   * free-form body is deferred to the detail read so dense inbox rows stay
   * scannable.
   */
  export interface ISummary {
    /** Primary key of the notification. */
    id: string & tags.Format<"uuid">;

    /** Brokerage tenant that owns the notification. */
    organization: IBrokerDeskOrganization.ISummary;

    /** Trigger family that raised the alert. */
    type: EBrokerDeskNotificationType;

    /** Short human-readable headline displayed in notification lists. */
    title: string;

    /** Logical table name of the triggering entity (deep-link target). */
    source_entity_type: string;

    /** Primary key of the triggering entity. */
    source_entity_id: string & tags.Format<"uuid">;

    /** Moment the recipient acknowledged the alert; null while unread. */
    read_at: (string & tags.Format<"date-time">) | null;

    /** Moment the trigger persisted this alert. */
    created_at: string & tags.Format<"date-time">;
  }

  /**
   * Search criteria for the recipient's inbox; every field is optional.
   *
   * The recipient is always resolved from the JWT identity, so no recipient
   * filter is accepted from the client.
   */
  export interface IRequest {
    /** 1-based page index to return. */
    page?: number;

    /** Maximum number of notifications per page. */
    limit?: number;

    /** Restrict to alerts raised by the given trigger family. */
    type?: EBrokerDeskNotificationType;

    /** Acknowledgement filter; true returns only read alerts, false only unread, omitted returns all. */
    read?: boolean;

    /** Restrict to alerts raised from the given source table (deep-link filtering). */
    source_entity_type?: string;

    /** Restrict to alerts raised from the given source entity. */
    source_entity_id?: string & tags.Format<"uuid">;

    /** Inclusive lower bound on the persisted-at timestamp. */
    created_from?: string & tags.Format<"date-time">;

    /** Inclusive upper bound on the persisted-at timestamp. */
    created_to?: string & tags.Format<"date-time">;

    /** Column to order results by. */
    order_by?: "created_at" | "read_at";

    /** Ordering direction; defaults to descending (newest first). */
    order_direction?: "asc" | "desc";
  }

  /**
   * Unread badge count for the authenticated recipient's inbox; dismissed
   * notifications are excluded.
   */
  export interface IUnreadCount {
    /** Number of unread, non-dismissed notifications. */
    unread_count: number;
  }
}
