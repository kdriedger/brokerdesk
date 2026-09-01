import { tags } from "typia";

import { IPage } from "./IPage";

/**
 * Line-of-business classification for catalogue products.
 */
export type ELineOfBusiness =
  | "auto"
  | "home"
  | "commercial_property"
  | "commercial_liability"
  | "life"
  | "health"
  | "disability"
  | "travel"
  | "other";

/**
 * Lifecycle state of a carrier appointment held by a brokerage organization.
 */
export type ECarrierAppointmentStatus =
  | "awaiting"
  | "active"
  | "expired"
  | "terminated";

/**
 * Insurance carrier catalogue entry shared across the brokerage.
 */
export interface IBrokerDeskCarrier {
  id: string & tags.Format<"uuid">;
  name: string;
  code: string;
  financial_strength_note: string | null;
  website: string | null;
  service_email: string | null;
  service_phone: string | null;
  notes: string | null;
  active: boolean;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
  products: IBrokerDeskCarrier.IProductSummary[];
  product_count: number & tags.Type<"uint32">;
}
export namespace IBrokerDeskCarrier {
  /**
   * Compact carrier reference embedded in downstream DTOs.
   */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    name: string;
    code: string;
    active: boolean;
  }

  /**
   * Compact product reference shown on a carrier detail.
   */
  export interface IProductSummary {
    id: string & tags.Format<"uuid">;
    name: string;
    code: string;
    line_of_business: ELineOfBusiness;
    active: boolean;
  }

  /**
   * Carrier list item.
   */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    name: string;
    code: string;
    financial_strength_note: string | null;
    service_email: string | null;
    service_phone: string | null;
    active: boolean;
    product_count: number & tags.Type<"uint32">;
  }

  /**
   * Request body for creating a carrier.
   */
  export interface ICreate {
    name: string;
    code: string;
    financial_strength_note?: string | null;
    website?: string | null;
    service_email?: string | null;
    service_phone?: string | null;
    notes?: string | null;
    active?: boolean;
  }

  /**
   * Request body for updating a carrier; all fields optional.
   */
  export interface IUpdate {
    name?: string;
    code?: string;
    financial_strength_note?: string | null;
    website?: string | null;
    service_email?: string | null;
    service_phone?: string | null;
    notes?: string | null;
    active?: boolean;
  }

  /**
   * Carrier search criteria with pagination and filters.
   */
  export interface IRequest {
    page?: number & tags.Type<"uint32"> & tags.Minimum<1>;
    limit?: number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>;
    search?: string;
    active?: boolean;
    sort?: "name" | "code" | "created_at";
    order?: "asc" | "desc";
  }
}

/**
 * Appointment of a carrier to a brokerage organization; the compliance-alert
 * source for upcoming or lapsed placing authority.
 */
export interface IBrokerDeskCarrierAppointment {
  id: string & tags.Format<"uuid">;
  carrier: IBrokerDeskCarrier.ISummary;
  status: ECarrierAppointmentStatus;
  appointed_at: string & tags.Format<"date-time">;
  expires_at: string & tags.Format<"date-time">;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
}
export namespace IBrokerDeskCarrierAppointment {
  /**
   * Appointment list item.
   */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    carrier: IBrokerDeskCarrier.ISummary;
    status: ECarrierAppointmentStatus;
    appointed_at: string & tags.Format<"date-time">;
    expires_at: string & tags.Format<"date-time">;
  }

  /**
   * Request body for creating a carrier appointment.
   */
  export interface ICreate {
    broker_desk_carrier_id: string & tags.Format<"uuid">;
    status: ECarrierAppointmentStatus;
    appointed_at: string & tags.Format<"date-time">;
    expires_at: string & tags.Format<"date-time">;
  }

  /**
   * Request body for updating a carrier appointment; all fields optional.
   */
  export interface IUpdate {
    status?: ECarrierAppointmentStatus;
    appointed_at?: string & tags.Format<"date-time">;
    expires_at?: string & tags.Format<"date-time">;
  }

  /**
   * Appointment search criteria with pagination and filters.
   */
  export interface IRequest {
    page?: number & tags.Type<"uint32"> & tags.Minimum<1>;
    limit?: number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>;
    broker_desk_carrier_id?: string & tags.Format<"uuid">;
    status?: ECarrierAppointmentStatus;
    expiring_within_days?: number & tags.Type<"uint32">;
    order?: "asc" | "desc";
  }
}

/**
 * Paginated carrier summary list.
 */
export type IPageIBrokerDeskCarrierISummary = IPage<IBrokerDeskCarrier.ISummary>;

/**
 * Paginated carrier appointment summary list.
 */
export type IPageIBrokerDeskCarrierAppointmentISummary =
  IPage<IBrokerDeskCarrierAppointment.ISummary>;
