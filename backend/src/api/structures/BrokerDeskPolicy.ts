import { tags } from "typia";

import { IBrokerDeskClient } from "./BrokerDeskCrmClient";
import { IBrokerDeskCarrier } from "./BrokerDeskCatalogueCarrier";
import { IBrokerDeskProduct } from "./BrokerDeskCatalogueProduct";
import { IBrokerDeskCsr } from "./BrokerDeskActorsCsr";
import { IBrokerDeskProducer } from "./BrokerDeskActorsProducer";
import { IBrokerDeskQuote, IBrokerDeskQuoteLine } from "./BrokerDeskQuoting";
import { IBrokerDeskOrganization } from "./BrokerDeskSystematicOrganization";

export type EPolicyStatus =
  | "active"
  | "pending_cancel"
  | "cancelled"
  | "expired"
  | "lapsed";

export type EPolicyPaymentPlan = "annual" | "semi_annual" | "quarterly" | "monthly";

export type EEndorsementStatus = "draft" | "issued";

export type ECancellationStatus = "requested" | "completed";

export type ERenewalStatus =
  | "scheduled"
  | "offered"
  | "accepted"
  | "rewritten"
  | "non_renewed"
  | "lost";

/* -----------------------------------------------------------
  POLICY
----------------------------------------------------------- */
export interface IBrokerDeskPolicy {
  id: string & tags.Format<"uuid">;
  organization: IBrokerDeskOrganization.ISummary;
  client: IBrokerDeskClient.ISummary;
  carrier: IBrokerDeskCarrier.ISummary;
  product: IBrokerDeskProduct.ISummary;
  producer: IBrokerDeskProducer.ISummary;
  quote: IBrokerDeskQuote.ISummary | null;
  quote_line: IBrokerDeskQuoteLine.ISummary | null;
  org_policy_number: string;
  carrier_policy_number: string | null;
  status: EPolicyStatus;
  term_start: string & tags.Format<"date-time">;
  term_end: string & tags.Format<"date-time">;
  billed_premium_cad: number;
  broker_fee_cad: number;
  tax_amount_cad: number;
  payment_plan: EPolicyPaymentPlan;
  province_of_risk: string;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
  deleted_at: (string & tags.Format<"date-time">) | null;
  coverages: IBrokerDeskPolicyCoverage[];
  endorsements: IBrokerDeskPolicyEndorsement.ISummary[];
  cancellations: IBrokerDeskPolicyCancellation[];
  prior_renewal: IBrokerDeskPolicyRenewal.ISummary | null;
  next_renewal: IBrokerDeskPolicyRenewal.ISummary | null;
}

export namespace IBrokerDeskPolicy {
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    client: IBrokerDeskClient.ISummary;
    carrier: IBrokerDeskCarrier.ISummary;
    product: IBrokerDeskProduct.ISummary;
    producer: IBrokerDeskProducer.ISummary;
    org_policy_number: string;
    carrier_policy_number: string | null;
    status: EPolicyStatus;
    term_start: string & tags.Format<"date-time">;
    term_end: string & tags.Format<"date-time">;
    billed_premium_cad: number;
    broker_fee_cad: number;
    tax_amount_cad: number;
    payment_plan: EPolicyPaymentPlan;
    province_of_risk: string;
  }

  export interface ICreate {
    client_id: string & tags.Format<"uuid">;
    carrier_id: string & tags.Format<"uuid">;
    product_id: string & tags.Format<"uuid">;
    producer_id: string & tags.Format<"uuid">;
    quote_id?: (string & tags.Format<"uuid">) | null;
    quote_line_id?: (string & tags.Format<"uuid">) | null;
    org_policy_number: string;
    carrier_policy_number?: (string & tags.Format<"uuid">) | null;
    term_start: string & tags.Format<"date-time">;
    term_end: string & tags.Format<"date-time">;
    billed_premium_cad: number;
    broker_fee_cad: number;
    tax_amount_cad: number;
    payment_plan: EPolicyPaymentPlan;
    province_of_risk: string;
    coverages?: ICreate[];
  }

  export interface IUpdate {
    carrier_id?: string & tags.Format<"uuid">;
    product_id?: string & tags.Format<"uuid">;
    producer_id?: string & tags.Format<"uuid">;
    carrier_policy_number?: string | null;
    status?: EPolicyStatus;
    term_start?: string & tags.Format<"date-time">;
    term_end?: string & tags.Format<"date-time">;
    billed_premium_cad?: number;
    broker_fee_cad?: number;
    tax_amount_cad?: number;
    payment_plan?: EPolicyPaymentPlan;
    province_of_risk?: string;
  }

  export interface IRequest {
    page?: number;
    limit?: number;
    search?: string;
    client_id?: string & tags.Format<"uuid">;
    carrier_id?: string & tags.Format<"uuid">;
    product_id?: string & tags.Format<"uuid">;
    producer_id?: string & tags.Format<"uuid">;
    status?: EPolicyStatus;
    province_of_risk?: string;
    term_end_from?: string & tags.Format<"date-time">;
    term_end_to?: string & tags.Format<"date-time">;
    sort_by?: "term_end" | "created_at" | "billed_premium_cad" | "org_policy_number";
    sort_order?: "asc" | "desc";
  }

  /** Request body for the issue action, recording the carrier-assigned policy number. */
  export interface IIssue {
    carrier_policy_number: string;
  }

  /** Response of the cancel action wrapping the newly created cancellation record. */
  export interface ICancellationResult {
    policy: IBrokerDeskPolicy;
    cancellation: IBrokerDeskPolicyCancellation;
  }

  /** Response of the reinstate action wrapping the newly created reinstatement record. */
  export interface IReinstatementResult {
    policy: IBrokerDeskPolicy;
    reinstatement: IBrokerDeskPolicyReinstatement;
  }
}

/* -----------------------------------------------------------
  POLICY COVERAGE
----------------------------------------------------------- */
export interface IBrokerDeskPolicyCoverage {
  id: string & tags.Format<"uuid">;
  policy: IBrokerDeskPolicy.ISummary;
  code: string;
  name: string;
  limit_amount: number | null;
  deductible: number | null;
  premium: number;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
  deleted_at: (string & tags.Format<"date-time">) | null;
}

export namespace IBrokerDeskPolicyCoverage {
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    code: string;
    name: string;
    limit_amount: number | null;
    deductible: number | null;
    premium: number;
  }

  export interface ICreate {
    code: string;
    name: string;
    limit_amount?: number | null;
    deductible?: number | null;
    premium: number;
  }

  export interface IUpdate {
    name?: string;
    limit_amount?: number | null;
    deductible?: number | null;
    premium?: number;
  }
}

/* -----------------------------------------------------------
  POLICY ENDORSEMENT
----------------------------------------------------------- */
export interface IBrokerDeskPolicyEndorsement {
  id: string & tags.Format<"uuid">;
  policy: IBrokerDeskPolicy.ISummary;
  creator: IBrokerDeskCsr.ISummary;
  type: string;
  effective_at: string & tags.Format<"date-time">;
  description: string | null;
  premium_delta: number;
  fee_delta: number;
  status: EEndorsementStatus;
  issued_at: (string & tags.Format<"date-time">) | null;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
  deleted_at: (string & tags.Format<"date-time">) | null;
}

export namespace IBrokerDeskPolicyEndorsement {
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    type: string;
    effective_at: string & tags.Format<"date-time">;
    premium_delta: number;
    fee_delta: number;
    status: EEndorsementStatus;
    issued_at: (string & tags.Format<"date-time">) | null;
  }

  export interface ICreate {
    type: string;
    effective_at: string & tags.Format<"date-time">;
    description?: string | null;
    premium_delta: number;
    fee_delta: number;
  }

  export interface IUpdate {
    type?: string;
    effective_at?: string & tags.Format<"date-time">;
    description?: string | null;
    premium_delta?: number;
    fee_delta?: number;
  }

  export interface IRequest {
    page?: number;
    limit?: number;
    kind?: "draft" | "issued";
  }
}

/* -----------------------------------------------------------
  POLICY CANCELLATION
----------------------------------------------------------- */
export interface IBrokerDeskPolicyCancellation {
  id: string & tags.Format<"uuid">;
  policy: IBrokerDeskPolicy.ISummary;
  effective_date: string & tags.Format<"date-time">;
  reason: string;
  return_premium: number | null;
  status: ECancellationStatus;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
  reinstatement: IBrokerDeskPolicyReinstatement | null;
}

export namespace IBrokerDeskPolicyCancellation {
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    effective_date: string & tags.Format<"date-time">;
    reason: string;
    return_premium: number | null;
    status: ECancellationStatus;
  }

  export interface ICreate {
    effective_date: string & tags.Format<"date-time">;
    reason: string;
    return_premium?: number | null;
  }
}

/* -----------------------------------------------------------
  POLICY REINSTATEMENT
----------------------------------------------------------- */
export interface IBrokerDeskPolicyReinstatement {
  id: string & tags.Format<"uuid">;
  cancellation: IBrokerDeskPolicyCancellation.ISummary;
  csr: IBrokerDeskCsr.ISummary;
  effective_at: string & tags.Format<"date-time">;
  notes: string | null;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
  deleted_at: (string & tags.Format<"date-time">) | null;
}

export namespace IBrokerDeskPolicyReinstatement {
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    effective_at: string & tags.Format<"date-time">;
    notes: string | null;
  }

  export interface ICreate {
    cancellation_id: string & tags.Format<"uuid">;
    effective_at: string & tags.Format<"date-time">;
    notes?: string | null;
  }
}

/* -----------------------------------------------------------
  POLICY RENEWAL
----------------------------------------------------------- */
export interface IBrokerDeskPolicyRenewal {
  id: string & tags.Format<"uuid">;
  organization: IBrokerDeskOrganization.ISummary;
  prior_policy: IBrokerDeskPolicy.ISummary;
  next_policy: IBrokerDeskPolicy.ISummary | null;
  status: ERenewalStatus;
  offered_premium_cad: number | null;
  offered_at: (string & tags.Format<"date-time">) | null;
  decided_at: (string & tags.Format<"date-time">) | null;
  notes: string | null;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
  deleted_at: (string & tags.Format<"date-time">) | null;
}

export namespace IBrokerDeskPolicyRenewal {
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    prior_policy: IBrokerDeskPolicy.ISummary;
    next_policy: IBrokerDeskPolicy.ISummary | null;
    status: ERenewalStatus;
    offered_premium_cad: number | null;
    offered_at: (string & tags.Format<"date-time">) | null;
    decided_at: (string & tags.Format<"date-time">) | null;
  }

  export interface IOffer {
    offered_premium_cad: number;
    notes?: string | null;
  }

  export interface IDecide {
    decision: "accepted" | "rewritten" | "non_renewed" | "lost";
    notes?: string | null;
  }

  export interface IRequest {
    page?: number;
    limit?: number;
    status?: "scheduled" | "offered" | "accepted" | "rewritten" | "non_renewed" | "lost";
  }
}
