import { tags } from "typia";

import {
  ETaskStatus,
  IBrokerDeskAdminSummary,
  IBrokerDeskCsrSummary,
  IBrokerDeskPolicySummary,
  IBrokerDeskProducerSummary,
} from "./BrokerDeskCrmShared";

/**
 * Follow-up work item assigned to a staff member of the owning brokerage,
 * optionally anchored to a client or policy, with assignee resolved through
 * the role-specific assignment junctions.
 */
export interface IBrokerDeskTask {
  /** Primary key. */
  id: string & tags.Format<"uuid">;
  /** Short summary of the promised work. */
  title: string;
  /** Longer free-form elaboration. */
  description: string | null;
  /** Moment by which the task should be completed. */
  due_at: string & tags.Format<"date-time">;
  /** Lifecycle standing: open, done, or cancelled. */
  status: ETaskStatus;
  /** Creation timestamp. */
  created_at: string & tags.Format<"date-time">;
  /** Last modification timestamp. */
  updated_at: string & tags.Format<"date-time">;
  /** Optional client anchor projection. */
  client: IBrokerDeskTask.IClientRef | null;
  /** Optional policy anchor projection. */
  policy: IBrokerDeskPolicySummary | null;
  /** Administrator assignee, if assigned to an admin. */
  admin_assignee: IBrokerDeskAdminSummary | null;
  /** Producer assignee, if assigned to a producer. */
  producer_assignee: IBrokerDeskProducerSummary | null;
  /** CSR assignee, if assigned to a CSR. */
  csr_assignee: IBrokerDeskCsrSummary | null;
}

export namespace IBrokerDeskTask {
  /** Owning-client projection embedded in task read DTOs. */
  export interface IClientRef {
    /** Primary key of the client. */
    id: string & tags.Format<"uuid">;
    /** Legal name of the client. */
    legal_name: string;
  }

  /** Essential list-item projection of a task. */
  export interface ISummary {
    /** Primary key. */
    id: string & tags.Format<"uuid">;
    /** Title. */
    title: string;
    /** Due moment. */
    due_at: string & tags.Format<"date-time">;
    /** Lifecycle standing. */
    status: ETaskStatus;
    /** Optional client anchor. */
    client: IClientRef | null;
    /** Resolved assignee projection, whichever role holds the task. */
    assignee:
      | { kind: "admin"; admin: IBrokerDeskAdminSummary }
      | { kind: "producer"; producer: IBrokerDeskProducerSummary }
      | { kind: "csr"; csr: IBrokerDeskCsrSummary }
      | null;
  }

  /**
   * Request body for creating a task. The assignee is referenced by role plus
   * staff identifier; the acting identity and tenant come from the JWT.
   */
  export interface ICreate {
    /** Short summary of the work. */
    title: string;
    /** Longer elaboration. */
    description?: string | null;
    /** Due moment. */
    due_at: string & tags.Format<"date-time">;
    /** Initial status; defaults to "open". */
    status?: ETaskStatus;
    /** Optional client anchor. */
    client_id?: string & tags.Format<"uuid">;
    /** Optional policy anchor. */
    policy_id?: string & tags.Format<"uuid">;
    /** Assign to an administrator. */
    admin_assignee_id?: string & tags.Format<"uuid">;
    /** Assign to a producer. */
    producer_assignee_id?: string & tags.Format<"uuid">;
    /** Assign to a CSR. */
    csr_assignee_id?: string & tags.Format<"uuid">;
  }

  /** Request body for updating a task; all fields optional. */
  export interface IUpdate {
    /** Title. */
    title?: string;
    /** Description. */
    description?: string | null;
    /** Due moment. */
    due_at?: string & tags.Format<"date-time">;
    /** Lifecycle standing. */
    status?: ETaskStatus;
    /** Reassign to an administrator (clears other assignees). */
    admin_assignee_id?: string & tags.Format<"uuid">;
    /** Reassign to a producer (clears other assignees). */
    producer_assignee_id?: string & tags.Format<"uuid">;
    /** Reassign to a CSR (clears other assignees). */
    csr_assignee_id?: string & tags.Format<"uuid">;
  }

  /** Filter criteria for the task index. */
  export interface IRequest {
    /** Page number. */
    page?: number & tags.Type<"uint32">;
    /** Page size. */
    limit?: number & tags.Type<"uint32">;
    /** Lifecycle standing filter. */
    status?: ETaskStatus;
    /** Client anchor filter. */
    client_id?: string & tags.Format<"uuid">;
    /** Policy anchor filter. */
    policy_id?: string & tags.Format<"uuid">;
    /** Free-text match against title. */
    search?: string;
    /** Include only tasks due on or after this moment. */
    due_from?: string & tags.Format<"date-time">;
    /** Include only tasks due on or before this moment. */
    due_to?: string & tags.Format<"date-time">;
  }

  /** Response of the personal task queue for the acting staff member. */
  export interface IMyQueue {
    /** Tasks assigned to the acting staff member. */
    data: ISummary[];
  }
}

/** Paginated task summary page alias. */
export interface IPageIBrokerDeskTaskSummary extends IPage<IBrokerDeskTask.ISummary> {}

import { IPage } from "./IPage";
