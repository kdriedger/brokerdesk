import { tags } from "typia";

import { IBrokerDeskCarrier } from "./BrokerDeskCatalogueCarrier";
import { IBrokerDeskClient } from "./BrokerDeskCrmClient";
import { IBrokerDeskCsr } from "./BrokerDeskActorsCsr";
import { IBrokerDeskPolicy } from "./BrokerDeskPolicy";
import { IBrokerDeskProducer } from "./BrokerDeskActorsProducer";
import { IBrokerDeskProduct } from "./BrokerDeskCatalogueProduct";

/**
 * Lifecycle status of a quotation.
 *
 * Transitions follow the mandated flow draft -> priced -> submitted ->
 * bound | declined | expired; only the `bound` outcome creates a policy.
 */
export type EQuoteStatus =
  | "draft"
  | "priced"
  | "submitted"
  | "bound"
  | "declined"
  | "expired";

/**
 * Workflow stage of an out-of-band carrier submission.
 */
export type ESubmissionStatus =
  | "pending"
  | "sent"
  | "acknowledged"
  | "quoted"
  | "declined";

/**
 * Direction of a carrier conversation log entry.
 */
export type ESubmissionMessageDirection = "outbound" | "inbound";

/**
 * Medium through which a carrier conversation exchange took place.
 */
export type ESubmissionMessageChannel =
  | "email"
  | "phone"
  | "portal"
  | "mail"
  | "fax";

/**
 * Full read view of a producer-owned quotation with comparative lines,
 * carrier submissions, and CAD money totals.
 */
export interface IBrokerDeskQuote {
  id: string & tags.Format<"uuid">;
  organization: IBrokerDeskQuotingOrganizationSummary;
  client: IBrokerDeskClient.ISummary;
  producer: IBrokerDeskProducer.ISummary;
  status: EQuoteStatus;
  desired_effective_date:
    | (string & tags.Format<"date-time">)
    | null;
  expires_at: string & tags.Format<"date-time">;
  notes: string | null;
  total_premium_cad: number;
  total_broker_fee_cad: number;
  tax_amount_cad: number;
  grand_total_cad: number;
  lines: IBrokerDeskQuoteLine.ISummary[];
  submissions: IBrokerDeskSubmission.ISummary[];
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
  deleted_at: (string & tags.Format<"date-time">) | null;
}

export namespace IBrokerDeskQuote {
  /**
   * Essential display fields of a quotation for paginated listings.
   */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    client: IBrokerDeskClient.ISummary;
    producer: IBrokerDeskProducer.ISummary;
    status: EQuoteStatus;
    desired_effective_date:
      | (string & tags.Format<"date-time">)
      | null;
    expires_at: string & tags.Format<"date-time">;
    total_premium_cad: number;
    total_broker_fee_cad: number;
    tax_amount_cad: number;
    grand_total_cad: number;
    line_count: number;
    created_at: string & tags.Format<"date-time">;
  }

  /**
   * Request body for creating a new quotation for a client.
   */
  export interface ICreate {
    broker_desk_client_id: string & tags.Format<"uuid">;
    desired_effective_date?:
      | (string & tags.Format<"date-time">)
      | null;
    expires_at?: string & tags.Format<"date-time">;
    notes?: string | null;
    lines?: IBrokerDeskQuoteLine.ICreate[];
  }

  /**
   * Mutable fields of a quotation; all optional.
   */
  export interface IUpdate {
    desired_effective_date?: (string & tags.Format<"date-time">) | null;
    expires_at?: string & tags.Format<"date-time">;
    notes?: string | null;
    status?: EQuoteStatus;
  }

  /**
   * Search and filter criteria for paginated quote listings.
   */
  export interface IRequest {
    page?: number;
    limit?: number;
    broker_desk_client_id?: string & tags.Format<"uuid">;
    broker_desk_producer_id?: string & tags.Format<"uuid">;
    status?: EQuoteStatus;
    expires_before?: string & tags.Format<"date-time">;
    search?: string;
    sort?: "created_at" | "expires_at" | "grand_total_cad";
    order?: "asc" | "desc";
  }

  /**
   * Request body for recalculating the quotation's premiums, fees,
   * taxes, and grand total from its rated lines (manual override allowed).
   */
  export interface IPrice {
    lines: IBrokerDeskQuoteLine.IPrice[];
  }

  /**
   * Response of a successful price calculation on a quotation.
   */
  export interface IPriceResult {
    total_premium_cad: number;
    total_broker_fee_cad: number;
    tax_amount_cad: number;
    grand_total_cad: number;
    lines: IBrokerDeskQuoteLine.ISummary[];
  }

  /**
   * Request body for the bind action, naming the accepted comparative
   * line that becomes the policy's binding basis.
   */
  export interface IBind {
    broker_desk_quote_line_id: string & tags.Format<"uuid">;
  }

  /**
   * Response of the transactional bind action: the newly created policy
   * whose origin columns link back to this quote.
   */
  export interface IBindResult {
    policy: IBrokerDeskPolicy;
    quote: IBrokerDeskQuote;
  }
}

/**
 * Comparative product-option line within a quotation, capturing one
 * carrier-product proposal for side-by-side comparison.
 */
export interface IBrokerDeskQuoteLine {
  id: string & tags.Format<"uuid">;
  quote: IBrokerDeskQuote.ISummary;
  product: IBrokerDeskProduct.ISummary;
  carrier_name_snapshot: string;
  carrier_code_snapshot: string;
  coverage_selections: Record<string, unknown>;
  rating_inputs: Record<string, unknown>;
  premium_cad: number | null;
  broker_fee_cad: number | null;
  tax_amount_cad: number | null;
  commission_estimate_cad: number | null;
  accepted: boolean;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
}

export namespace IBrokerDeskQuoteLine {
  /**
   * Essential display fields of a comparative quote line.
   */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    product: IBrokerDeskProduct.ISummary;
    carrier_name_snapshot: string;
    carrier_code_snapshot: string;
    premium_cad: number | null;
    broker_fee_cad: number | null;
    tax_amount_cad: number | null;
    commission_estimate_cad: number | null;
    accepted: boolean;
  }

  /**
   * Request body for attaching a comparative option line to a quotation.
   * Carrier name/code snapshots are resolved from the product's carrier.
   */
  export interface ICreate {
    broker_desk_product_id: string & tags.Format<"uuid">;
    coverage_selections: Record<string, unknown>;
    rating_inputs: Record<string, unknown>;
    premium_cad?: number | null;
    broker_fee_cad?: number | null;
  }

  /**
   * Mutable fields of a comparative quote line; all optional.
   */
  export interface IUpdate {
    coverage_selections?: Record<string, unknown>;
    rating_inputs?: Record<string, unknown>;
    premium_cad?: number | null;
    broker_fee_cad?: number | null;
    accepted?: boolean;
  }

  /**
   * Per-line premium calculation input; formula-computed unless
   * `manual_override` is supplied.
   */
  export interface IPrice {
    broker_desk_quote_line_id: string & tags.Format<"uuid">;
    manual_premium_cad?: number | null;
    manual_broker_fee_cad?: number | null;
  }
}

/**
 * Out-of-band submission tracking record pairing a quotation with one
 * courted carrier, following manual request-for-quotation exchanges.
 */
export interface IBrokerDeskSubmission {
  id: string & tags.Format<"uuid">;
  quote: IBrokerDeskQuote.ISummary;
  carrier: IBrokerDeskCarrier.ISummary;
  status: ESubmissionStatus;
  carrier_reference_number: string | null;
  notes: string | null;
  sent_at: (string & tags.Format<"date-time">) | null;
  responded_at: (string & tags.Format<"date-time">) | null;
  messages: IBrokerDeskSubmissionMessage.ISummary[];
  message_count: number;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
}

export namespace IBrokerDeskSubmission {
  /**
   * Essential display fields of a carrier submission.
   */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    carrier: IBrokerDeskCarrier.ISummary;
    status: ESubmissionStatus;
    carrier_reference_number: string | null;
    sent_at: (string & tags.Format<"date-time">) | null;
    responded_at: (string & tags.Format<"date-time">) | null;
    message_count: number;
    created_at: string & tags.Format<"date-time">;
  }

  /**
   * Request body for opening a courtship thread with a carrier on a quote.
   */
  export interface ICreate {
    carrier_id: string & tags.Format<"uuid">;
    notes?: string | null;
  }

  /**
   * Mutable fields of a submission, including workflow status
   * transitions and carrier reference capture; all optional.
   */
  export interface IUpdate {
    status?: ESubmissionStatus;
    carrier_reference_number?: string | null;
    notes?: string | null;
    sent_at?: (string & tags.Format<"date-time">) | null;
    responded_at?: (string & tags.Format<"date-time">) | null;
  }

  /**
   * Search and filter criteria for submission listings.
   */
  export interface IRequest {
    page?: number;
    limit?: number;
    broker_desk_quote_id?: string & tags.Format<"uuid">;
    carrier_id?: string & tags.Format<"uuid">;
    status?: ESubmissionStatus;
    sort?: "created_at" | "sent_at" | "responded_at";
    order?: "asc" | "desc";
  }
}

/**
 * Individual conversation-log entry exchanged between brokerage staff
 * and a carrier regarding a submission, with polymorphic logger
 * attribution resolved through its subtype composition.
 */
export interface IBrokerDeskSubmissionMessage {
  id: string & tags.Format<"uuid">;
  submission: IBrokerDeskSubmission.ISummary;
  direction: ESubmissionMessageDirection;
  channel: ESubmissionMessageChannel;
  body: string;
  occurred_at: string & tags.Format<"date-time">;
  admin_attribution: IBrokerDeskSubmissionMessageOfAdmin | null;
  producer_attribution: IBrokerDeskSubmissionMessageOfProducer | null;
  csr_attribution: IBrokerDeskSubmissionMessageOfCsr | null;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
  deleted_at: (string & tags.Format<"date-time">) | null;
}

export namespace IBrokerDeskSubmissionMessage {
  /**
   * Essential display fields of a carrier conversation entry.
   */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    direction: ESubmissionMessageDirection;
    channel: ESubmissionMessageChannel;
    body: string;
    occurred_at: string & tags.Format<"date-time">;
    created_at: string & tags.Format<"date-time">;
  }

  /**
   * Request body for logging a conversation turn against a submission.
   * The logger and session identities are taken from the JWT context.
   */
  export interface ICreate {
    direction: ESubmissionMessageDirection;
    channel: ESubmissionMessageChannel;
    body: string;
    occurred_at: string & tags.Format<"date-time">;
  }
}

/**
 * Read-only administrator attribution of a submission message.
 */
export interface IBrokerDeskSubmissionMessageOfAdmin {
  id: string & tags.Format<"uuid">;
  admin: IBrokerDeskQuotingAdminSummary;
  created_at: string & tags.Format<"date-time">;
}

/**
 * Read-only producer attribution of a submission message.
 */
export interface IBrokerDeskSubmissionMessageOfProducer {
  id: string & tags.Format<"uuid">;
  producer: IBrokerDeskProducer.ISummary;
  created_at: string & tags.Format<"date-time">;
}

/**
 * Read-only CSR attribution of a submission message.
 */
export interface IBrokerDeskSubmissionMessageOfCsr {
  id: string & tags.Format<"uuid">;
  csr: IBrokerDeskCsr.ISummary;
  created_at: string & tags.Format<"date-time">;
}

/**
 * Minimal organization reference embedded in quote read DTOs.
 */
export interface IBrokerDeskQuotingOrganizationSummary {
  id: string & tags.Format<"uuid">;
  legal_name: string;
  operating_name: string | null;
}

/**
 * Minimal administrator reference embedded in message attributions.
 */
export interface IBrokerDeskQuotingAdminSummary {
  id: string & tags.Format<"uuid">;
  display_name: string;
  email: string & tags.Format<"email">;
}
