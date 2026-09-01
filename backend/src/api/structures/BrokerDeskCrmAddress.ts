import { tags } from "typia";

import {
  EAddressType,
  IBrokerDeskCsrSummary,
  IBrokerDeskOrganizationSummary,
  IBrokerDeskProducerSummary,
} from "./BrokerDeskCrmShared";

/**
 * Typed civic address normalized in the shared address space, classified as
 * mailing, billing, or risk and claimed by exactly one owner (a client or the
 * brokerage organization) through dedicated ownership junctions.
 */
export interface IBrokerDeskAddress {
  /** Primary key. */
  id: string & tags.Format<"uuid">;
  /** Purpose classification of the address. */
  type: EAddressType;
  /** Primary street line (civic number and street). */
  line1: string;
  /** Optional supplementary line (unit, suite, floor). */
  line2: string | null;
  /** Municipality or city. */
  city: string;
  /** Two-letter Canadian province or territory code. */
  province: string;
  /** Canadian postal code in the A1A 1A1 pattern. */
  postal_code: string;
  /** Creation timestamp. */
  created_at: string & tags.Format<"date-time">;
  /** Last modification timestamp. */
  updated_at: string & tags.Format<"date-time">;
  /** Soft-deletion timestamp, null while active. */
  deleted_at: (string & tags.Format<"date-time">) | null;
  /** Resolved owner: a client, when client-owned. */
  client: IBrokerDeskClientOwner | null;
  /** Resolved owner: an organization, when brokerage-owned. */
  organization: IBrokerDeskOrganizationSummary | null;
}

/** Client-owner projection resolved through the ownership junction. */
export interface IBrokerDeskClientOwner {
  /** Primary key of the owning client. */
  id: string & tags.Format<"uuid">;
  /** Legal name of the owning client. */
  legal_name: string;
}

export namespace IBrokerDeskAddress {
  /** Request body for attaching an address to a client or organization. */
  export interface ICreate {
    /** Purpose classification. */
    type: EAddressType;
    /** Primary street line. */
    line1: string;
    /** Supplementary line. */
    line2?: string | null;
    /** City. */
    city: string;
    /** Province code. */
    province: string;
    /** Postal code. */
    postal_code: string;
  }

  /** Request body for updating an address; all fields optional. */
  export interface IUpdate {
    /** Purpose classification. */
    type?: EAddressType;
    /** Primary street line. */
    line1?: string;
    /** Supplementary line. */
    line2?: string | null;
    /** City. */
    city?: string;
    /** Province code. */
    province?: string;
    /** Postal code. */
    postal_code?: string;
  }

  /** Filter criteria for the address index. */
  export interface IRequest {
    /** Page number. */
    page?: number & tags.Type<"uint32">;
    /** Page size. */
    limit?: number & tags.Type<"uint32">;
    /** Filter by purpose classification. */
    type?: EAddressType;
    /** Filter by owning client. */
    client_id?: string & tags.Format<"uuid">;
    /** Filter by owning organization. */
    organization_id?: string & tags.Format<"uuid">;
    /** Filter by province. */
    province?: string;
    /** Filter by city. */
    city?: string;
  }
}
