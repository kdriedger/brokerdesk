import { tags } from "typia";

import {
  EActivityType,
  IBrokerDeskCsrSummary,
  IBrokerDeskProducerSummary,
} from "./BrokerDeskCrmShared";

/**
 * Client interaction history entry typed call, email, meeting, note, or
 * other, permanently attributed to the producer or CSR who logged it.
 */
export interface IBrokerDeskActivity {
  /** Primary key. */
  id: string & tags.Format<"uuid">;
  /** Classification of the documented interaction. */
  type: EActivityType;
  /** Short staff-written headline. */
  subject: string;
  /** Free-form substance of the entry. */
  body: string;
  /** When the interaction actually took place. */
  occurred_at: string & tags.Format<"date-time">;
  /** When the entry was written into the system. */
  created_at: string & tags.Format<"date-time">;
  /** When the entry was last revised. */
  updated_at: string & tags.Format<"date-time">;
  /** Soft-delete marker, null while visible on the timeline. */
  deleted_at: (string & tags.Format<"date-time">) | null;
  /** Producer author, when logged by a producer. */
  producer_author: IBrokerDeskProducerSummary | null;
  /** CSR author, when logged by a CSR. */
  csr_author: IBrokerDeskCsrSummary | null;
  /** Owning client projection. */
  client: IBrokerDeskActivity.IClientRef;
}

export namespace IBrokerDeskActivity {
  /** Owning-client projection embedded in activity read DTOs. */
  export interface IClientRef {
    /** Primary key of the client. */
    id: string & tags.Format<"uuid">;
    /** Legal name of the client. */
    legal_name: string;
  }

  /** Essential list-item projection of an activity. */
  export interface ISummary {
    /** Primary key. */
    id: string & tags.Format<"uuid">;
    /** Interaction classification. */
    type: EActivityType;
    /** Headline. */
    subject: string;
    /** When the interaction took place. */
    occurred_at: string & tags.Format<"date-time">;
    /** Producer author, if any. */
    producer_author: IBrokerDeskProducerSummary | null;
    /** CSR author, if any. */
    csr_author: IBrokerDeskCsrSummary | null;
  }

  /**
   * Request body for creating an activity on a client's timeline. The acting
   * staff identity is resolved from the JWT, not supplied here.
   */
  export interface ICreate {
    /** Classification of the interaction. */
    type: EActivityType;
    /** Short headline. */
    subject: string;
    /** Free-form substance. */
    body: string;
    /** When the interaction took place; defaults to now. */
    occurred_at?: string & tags.Format<"date-time">;
  }

  /** Request body for updating an activity; all fields optional. */
  export interface IUpdate {
    /** Classification. */
    type?: EActivityType;
    /** Headline. */
    subject?: string;
    /** Substance. */
    body?: string;
    /** When the interaction took place. */
    occurred_at?: string & tags.Format<"date-time">;
  }

  /** Filter criteria for the activity index. */
  export interface IRequest {
    /** Page number. */
    page?: number & tags.Type<"uint32">;
    /** Page size. */
    limit?: number & tags.Type<"uint32">;
    /** Owning client filter. */
    client_id?: string & tags.Format<"uuid">;
    /** Interaction type filter. */
    type?: EActivityType;
    /** Free-text match against subject and body. */
    search?: string;
    /** Include only entries occurring on or after this moment. */
    occurred_from?: string & tags.Format<"date-time">;
    /** Include only entries occurring on or before this moment. */
    occurred_to?: string & tags.Format<"date-time">;
  }
}

/** Paginated activity summary page alias. */
export interface IPageIBrokerDeskActivitySummary extends IPage<IBrokerDeskActivity.ISummary> {}

import { IPage } from "./IPage";
