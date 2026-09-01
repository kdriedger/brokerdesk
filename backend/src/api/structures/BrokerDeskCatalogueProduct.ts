import { tags } from "typia";

import { IBrokerDeskCarrier } from "./BrokerDeskCatalogueCarrier";
import { ELineOfBusiness } from "./BrokerDeskCatalogueCarrier";
import { IPage } from "./IPage";

/**
 * Insurance product catalogue entry offered by a carrier.
 */
export interface IBrokerDeskProduct {
  id: string & tags.Format<"uuid">;
  carrier: IBrokerDeskCarrier.ISummary;
  name: string;
  code: string;
  line_of_business: ELineOfBusiness;
  description: string | null;
  active: boolean;
  eligibility_rules: Record<string, unknown> | null;
  rating_schema: Record<string, unknown> | null;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
  coverage_items: IBrokerDeskProduct.ICoverageItemSummary[];
  coverage_item_count: number & tags.Type<"uint32">;
  commission_schedule: IBrokerDeskProduct.ICommissionScheduleSummary | null;
}
export namespace IBrokerDeskProduct {
  /**
   * Compact product reference embedded in downstream DTOs.
   */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    carrier: IBrokerDeskCarrier.ISummary;
    name: string;
    code: string;
    line_of_business: ELineOfBusiness;
    active: boolean;
  }

  /**
   * Compact coverage-item reference shown on a product detail.
   */
  export interface ICoverageItemSummary {
    id: string & tags.Format<"uuid">;
    name: string;
    code: string;
    default_limit: number;
    is_optional: boolean;
  }

  /**
   * Compact commission-schedule reference shown on a product detail.
   */
  export interface ICommissionScheduleSummary {
    id: string & tags.Format<"uuid">;
    agency_rate_percent: number;
    producer_split_percent: number;
  }

  /**
   * Product list item.
   */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    carrier: IBrokerDeskCarrier.ISummary;
    name: string;
    code: string;
    line_of_business: ELineOfBusiness;
    description: string | null;
    active: boolean;
    coverage_item_count: number & tags.Type<"uint32">;
  }

  /**
   * Request body for creating a product.
   */
  export interface ICreate {
    broker_desk_carrier_id: string & tags.Format<"uuid">;
    name: string;
    code: string;
    line_of_business: ELineOfBusiness;
    description?: string | null;
    active?: boolean;
    eligibility_rules?: Record<string, unknown> | null;
    rating_schema?: Record<string, unknown> | null;
  }

  /**
   * Request body for updating a product; all fields optional.
   */
  export interface IUpdate {
    name?: string;
    code?: string;
    description?: string | null;
    active?: boolean;
    eligibility_rules?: Record<string, unknown> | null;
    rating_schema?: Record<string, unknown> | null;
  }

  /**
   * Product search criteria with pagination and filters.
   */
  export interface IRequest {
    page?: number & tags.Type<"uint32"> & tags.Minimum<1>;
    limit?: number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>;
    search?: string;
    broker_desk_carrier_id?: string & tags.Format<"uuid">;
    line_of_business?: ELineOfBusiness;
    active?: boolean;
    sort?: "name" | "code" | "created_at";
    order?: "asc" | "desc";
  }
}

/**
 * Coverage catalogue item belonging to a product; downstream quote lines and
 * policy coverage schedules snapshot these values rather than live-reference
 * them.
 */
export interface IBrokerDeskCoverageItem {
  id: string & tags.Format<"uuid">;
  product: IBrokerDeskProduct.ISummary;
  name: string;
  code: string;
  default_limit: number;
  is_optional: boolean;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
}
export namespace IBrokerDeskCoverageItem {
  /**
   * Coverage-item list item.
   */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    name: string;
    code: string;
    default_limit: number;
    is_optional: boolean;
  }

  /**
   * Child coverage item with parent product context.
   */
  export interface IInvert {
    id: string & tags.Format<"uuid">;
    product: IBrokerDeskProduct.ISummary;
    name: string;
    code: string;
    default_limit: number;
    is_optional: boolean;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
  }

  /**
   * Request body for creating a coverage item under a product.
   */
  export interface ICreate {
    name: string;
    code: string;
    default_limit: number;
    is_optional: boolean;
  }

  /**
   * Request body for updating a coverage item; all fields optional.
   */
  export interface IUpdate {
    name?: string;
    code?: string;
    default_limit?: number;
    is_optional?: boolean;
  }

  /**
   * Coverage-item search criteria with pagination and filters.
   */
  export interface IRequest {
    page?: number & tags.Type<"uint32"> & tags.Minimum<1>;
    limit?: number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>;
    search?: string;
    is_optional?: boolean;
    order?: "asc" | "desc";
  }
}

/**
 * Default commission configuration attached 1:1 to a product, seeding
 * estimated commissions on quote lines and commission records.
 */
export interface IBrokerDeskCommissionSchedule {
  id: string & tags.Format<"uuid">;
  product: IBrokerDeskProduct.ISummary;
  agency_rate_percent: number;
  producer_split_percent: number;
  tier_table_json: Record<string, unknown> | null;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
}
export namespace IBrokerDeskCommissionSchedule {
  /**
   * Request body for creating a product's default commission schedule.
   */
  export interface ICreate {
    agency_rate_percent: number;
    producer_split_percent: number;
    tier_table_json?: Record<string, unknown> | null;
  }

  /**
   * Request body for updating a product's default commission schedule; all
   * fields optional.
   */
  export interface IUpdate {
    agency_rate_percent?: number;
    producer_split_percent?: number;
    tier_table_json?: Record<string, unknown> | null;
  }
}

/**
 * Paginated product summary list.
 */
export type IPageIBrokerDeskProductISummary = IPage<IBrokerDeskProduct.ISummary>;

/**
 * Paginated coverage-item summary list.
 */
export type IPageIBrokerDeskCoverageItemISummary =
  IPage<IBrokerDeskCoverageItem.ISummary>;
