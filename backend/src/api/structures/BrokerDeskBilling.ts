import { tags } from "typia";

import { IBrokerDeskClient } from "./BrokerDeskCrmClient";
import { IBrokerDeskPolicy } from "./BrokerDeskPolicy";
import { IBrokerDeskCarrier } from "./BrokerDeskCatalogueCarrier";
import { IBrokerDeskProducer } from "./BrokerDeskActorsProducer";
import { IBrokerDeskOrganization } from "./BrokerDeskSystematicOrganization";
import { IPage } from "./IPage";

export type EBrokerDeskInvoiceStatus =
  | "draft"
  | "sent"
  | "partial"
  | "paid"
  | "void";

export type EBrokerDeskInvoiceTaxCode = "GST" | "HST" | "QST" | "exempt";

export type EBrokerDeskPaymentMethod =
  | "etransfer"
  | "cheque"
  | "card"
  | "carrier_bill"
  | "other";

export type EBrokerDeskCommissionStatus =
  | "estimated"
  | "due"
  | "paid"
  | "clawback";

export type EBrokerDeskCommissionStatementStatus = "open" | "paid";

export interface IBrokerDeskInvoice {
  id: string & tags.Format<"uuid">;
  organization: IBrokerDeskOrganization.ISummary;
  client: IBrokerDeskClient.ISummary;
  policy: IBrokerDeskPolicy.ISummary | null;
  billing_address: IBrokerDeskInvoice.IBillingAddress | null;
  invoice_number: string;
  issue_date: string & tags.Format<"date-time">;
  due_date: string & tags.Format<"date-time">;
  status: EBrokerDeskInvoiceStatus;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  invoice_lines: IBrokerDeskInvoiceLine.ISummary[];
  payments: IBrokerDeskPayment.ISummary[];
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
  deleted_at: (string & tags.Format<"date-time">) | null;
}
export namespace IBrokerDeskInvoice {
  /** Minimal snapshot of the billing address used on the invoice. */
  export interface IBillingAddress {
    id: string & tags.Format<"uuid">;
    type: string;
    line1: string;
    line2: string | null;
    city: string;
    province: string;
    postal_code: string;
  }

  export interface ISummary {
    id: string & tags.Format<"uuid">;
    client: IBrokerDeskClient.ISummary;
    policy: IBrokerDeskPolicy.ISummary | null;
    invoice_number: string;
    issue_date: string & tags.Format<"date-time">;
    due_date: string & tags.Format<"date-time">;
    status: EBrokerDeskInvoiceStatus;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    created_at: string & tags.Format<"date-time">;
  }

  export interface ICreate {
    broker_desk_client_id: string & tags.Format<"uuid">;
    broker_desk_policy_id: (string & tags.Format<"uuid">) | null;
    broker_desk_billing_address_id: (string & tags.Format<"uuid">) | null;
    invoice_number: string;
    issue_date: string & tags.Format<"date-time">;
    due_date: string & tags.Format<"date-time">;
    invoice_lines: IBrokerDeskInvoiceLine.ICreate[];
  }

  export interface IUpdate {
    broker_desk_billing_address_id?: (string & tags.Format<"uuid">) | null;
    issue_date?: string & tags.Format<"date-time">;
    due_date?: string & tags.Format<"date-time">;
    invoice_lines?: IBrokerDeskInvoiceLine.ICreate[];
  }

  export interface IRequest extends IPage.IRequest {
    broker_desk_client_id?: string & tags.Format<"uuid">;
    broker_desk_policy_id?: string & tags.Format<"uuid">;
    status?: EBrokerDeskInvoiceStatus;
    issue_date_from?: string & tags.Format<"date-time">;
    issue_date_to?: string & tags.Format<"date-time">;
    overdue_only?: boolean;
    search?: string;
    sort?: "issue_date" | "due_date" | "total" | "created_at";
    order?: "asc" | "desc";
  }

  /** Void an erroneous invoice without erasing audit history. */
  export interface IVoid {
    reason: string;
  }
}

export interface IBrokerDeskInvoiceLine {
  id: string & tags.Format<"uuid">;
  invoice: IBrokerDeskInvoice.ISummary;
  description: string;
  amount: number;
  tax_code: EBrokerDeskInvoiceTaxCode;
  tax_rate: number;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
  deleted_at: (string & tags.Format<"date-time">) | null;
}
export namespace IBrokerDeskInvoiceLine {
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    description: string;
    amount: number;
    tax_code: EBrokerDeskInvoiceTaxCode;
    tax_rate: number;
  }

  export interface ICreate {
    description: string;
    amount: number;
    tax_code: EBrokerDeskInvoiceTaxCode;
  }

  export interface IUpdate {
    description?: string;
    amount?: number;
    tax_code?: EBrokerDeskInvoiceTaxCode;
  }
}

export interface IBrokerDeskPayment {
  id: string & tags.Format<"uuid">;
  invoice: IBrokerDeskInvoice.ISummary;
  amount: number;
  method: EBrokerDeskPaymentMethod;
  paid_at: string & tags.Format<"date-time">;
  reference: string | null;
  idempotency_key: string;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
}
export namespace IBrokerDeskPayment {
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    amount: number;
    method: EBrokerDeskPaymentMethod;
    paid_at: string & tags.Format<"date-time">;
    reference: string | null;
  }

  export interface ICreate {
    amount: number;
    method: EBrokerDeskPaymentMethod;
    paid_at: string & tags.Format<"date-time">;
    reference: string | null;
    idempotency_key: string & tags.Format<"uuid">;
  }

  export interface IRequest extends IPage.IRequest {
    method?: EBrokerDeskPaymentMethod;
    paid_at_from?: string & tags.Format<"date-time">;
    paid_at_to?: string & tags.Format<"date-time">;
  }
}

export interface IBrokerDeskCommission {
  id: string & tags.Format<"uuid">;
  organization: IBrokerDeskOrganization.ISummary;
  policy: IBrokerDeskPolicy.ISummary;
  endorsement: IBrokerDeskCommission.IEndorsementRef | null;
  carrier: IBrokerDeskCarrier.ISummary;
  producer: IBrokerDeskProducer.ISummary;
  statement: IBrokerDeskCommissionStatement.ISummary | null;
  premium_basis_cad: number;
  agency_rate_percent: number;
  agency_amount_cad: number;
  producer_split_rate_percent: number;
  producer_amount_cad: number;
  status: EBrokerDeskCommissionStatus;
  statement_period: string;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
  deleted_at: (string & tags.Format<"date-time">) | null;
}
export namespace IBrokerDeskCommission {
  /** Light reference to the originating endorsement amendment. */
  export interface IEndorsementRef {
    id: string & tags.Format<"uuid">;
    endorsement_type: string;
    effective_date: string & tags.Format<"date-time">;
    status: string;
  }

  export interface ISummary {
    id: string & tags.Format<"uuid">;
    policy: IBrokerDeskPolicy.ISummary;
    carrier: IBrokerDeskCarrier.ISummary;
    producer: IBrokerDeskProducer.ISummary;
    premium_basis_cad: number;
    agency_amount_cad: number;
    producer_amount_cad: number;
    status: EBrokerDeskCommissionStatus;
    statement_period: string;
    created_at: string & tags.Format<"date-time">;
  }

  export interface ICreate {
    broker_desk_policy_id: string & tags.Format<"uuid">;
    broker_desk_policy_endorsement_id: (string & tags.Format<"uuid">) | null;
    broker_desk_carrier_id: string & tags.Format<"uuid">;
    broker_desk_producer_id: string & tags.Format<"uuid">;
    premium_basis_cad: number;
    agency_rate_percent: number;
    agency_amount_cad: number;
    producer_split_rate_percent: number;
    producer_amount_cad: number;
    status: EBrokerDeskCommissionStatus;
    statement_period: string;
  }

  export interface IUpdate {
    agency_rate_percent?: number;
    agency_amount_cad?: number;
    producer_split_rate_percent?: number;
    producer_amount_cad?: number;
    status?: EBrokerDeskCommissionStatus;
    statement_period?: string;
  }

  export interface IRequest extends IPage.IRequest {
    broker_desk_producer_id?: string & tags.Format<"uuid">;
    broker_desk_carrier_id?: string & tags.Format<"uuid">;
    broker_desk_policy_id?: string & tags.Format<"uuid">;
    status?: EBrokerDeskCommissionStatus;
    statement_period?: string;
    statement_period_from?: string;
    statement_period_to?: string;
  }

  export interface IInvert {
    commission: IBrokerDeskCommission;
    policy: IBrokerDeskPolicy.ISummary;
    producer: IBrokerDeskProducer.ISummary;
  }
}

export interface IBrokerDeskCommissionStatement {
  id: string & tags.Format<"uuid">;
  organization: IBrokerDeskOrganization.ISummary;
  producer: IBrokerDeskProducer.ISummary;
  period_start: string & tags.Format<"date-time">;
  period_end: string & tags.Format<"date-time">;
  agency_amount_total: number;
  producer_amount_total: number;
  status: EBrokerDeskCommissionStatementStatus;
  paid_at: (string & tags.Format<"date-time">) | null;
  commissions: IBrokerDeskCommission.ISummary[];
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
  deleted_at: (string & tags.Format<"date-time">) | null;
}
export namespace IBrokerDeskCommissionStatement {
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    producer: IBrokerDeskProducer.ISummary;
    period_start: string & tags.Format<"date-time">;
    period_end: string & tags.Format<"date-time">;
    agency_amount_total: number;
    producer_amount_total: number;
    status: EBrokerDeskCommissionStatementStatus;
    paid_at: (string & tags.Format<"date-time">) | null;
  }

  export interface ICreate {
    broker_desk_producer_id: string & tags.Format<"uuid">;
    period_start: string & tags.Format<"date-time">;
    period_end: string & tags.Format<"date-time">;
  }

  export interface IRequest extends IPage.IRequest {
    broker_desk_producer_id?: string & tags.Format<"uuid">;
    status?: EBrokerDeskCommissionStatementStatus;
    period_start_from?: string & tags.Format<"date-time">;
    period_start_to?: string & tags.Format<"date-time">;
  }
}

export interface IBrokerDeskRevenueDashboard {
  /** Commissions due (earned but unsettled) across the org scope. */
  commission_due: number;
  /** Bound premium month-to-date in CAD. */
  bound_premium_mtd: number;
  /** Bound premium year-to-date in CAD. */
  bound_premium_ytd: number;
  /** Revenue pipeline: quote counts grouped by quote status. */
  quotes_by_status: IBrokerDeskRevenueDashboard.IQuoteStatusCount[];
  /** Accounts-receivable aging: outstanding invoice totals by status. */
  receivables_by_status: IBrokerDeskRevenueDashboard.IReceivableStatusTotal[];
}
export namespace IBrokerDeskRevenueDashboard {
  export interface IQuoteStatusCount {
    status: string;
    count: number & tags.Type<"int32">;
  }

  export interface IReceivableStatusTotal {
    status: EBrokerDeskInvoiceStatus;
    total: number;
    invoice_count: number & tags.Type<"int32">;
  }

  /** Request scope for the dashboard summary. */
  export interface IRequest {
    broker_desk_producer_id?: string & tags.Format<"uuid">;
  }
}
