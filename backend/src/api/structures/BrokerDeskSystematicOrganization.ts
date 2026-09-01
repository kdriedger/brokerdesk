import { tags } from "typia";

/**
 * Canadian sales tax treatment code stamped onto invoice lines and
 * organization tax rate configuration rows.
 *
 * Values follow the tax codes required by the platform: federal GST,
 * harmonized HST, Quebec QST, and explicit exemption. Invoice lines
 * additionally record the exact rate applied at issuance alongside the
 * code.
 */
export type EBrokerDeskTaxCode = "GST" | "HST" | "QST" | "exempt";

/**
 * Brokerage organization acting as the root tenant of the multi-tenant
 * architecture.
 *
 * Every business record in BrokerDesk belongs to exactly one organization,
 * created transactionally alongside the founding ADMIN account during
 * registration. The profile covers the brokerage's legal identity, contact
 * channel, CRA tax registration, embedded principal-office address block,
 * the fixed CAD currency, and the organization-scoped settings holding the
 * configurable provincial tax rate table seeded with Ontario HST 13% as
 * the default example.
 *
 * Tenants are never soft-deleted; deactivation happens through user
 * administration, so no deletion endpoint exists for this resource.
 */
export interface IBrokerDeskOrganization {
  /**
   * Primary key identifying the brokerage organization that owns every
   * business record in the system.
   */
  id: string & tags.Format<"uuid">;

  /** Registered legal name of the brokerage. */
  legal_name: string;

  /**
   * Trade or operating name used publicly when it differs from the
   * registered legal name; consumers fall back to legal_name when null.
   */
  operating_name: string | null;

  /**
   * Canadian province or territory code (ON, QC, AB, BC, ...) where the
   * brokerage primarily operates; drives default provincial taxation and
   * licence jurisdiction checks.
   */
  primary_province: string;

  /** Primary business telephone number rendered onto client-facing paperwork. */
  phone: string | null;

  /** CRA HST/GST registration number (format 123456789RT0001). */
  hst_gst_number: string | null;

  /** Fixed ISO currency code governing every monetary value; always `CAD`. */
  default_currency: string;

  /** Organization-scoped configuration: provincial tax rate table and related preferences. */
  settings: IBrokerDeskOrganization.ISettings;

  /** Street address line 1 of the brokerage's principal office. */
  address_line1: string | null;

  /** Street address line 2 (unit, suite, or floor) of the principal office. */
  address_line2: string | null;

  /** City of the brokerage's principal office. */
  city: string | null;

  /** Province code of the principal office address. */
  province: string | null;

  /** Postal code of the principal office (A1A 1A1 format). */
  postal_code: string | null;

  /** Timestamp when the organization record was created. */
  created_at: string & tags.Format<"date-time">;

  /** Timestamp of the most recent modification to the organization record. */
  updated_at: string & tags.Format<"date-time">;
}

export namespace IBrokerDeskOrganization {
  /**
   * Compact projection used when other records reference the tenant.
   */
  export interface ISummary {
    /** Primary key identifying the brokerage organization. */
    id: string & tags.Format<"uuid">;

    /** Registered legal name of the brokerage. */
    legal_name: string;

    /** Trade or operating name; null when operating under the legal name. */
    operating_name: string | null;

    /** Canadian province or territory code of primary operation. */
    primary_province: string;

    /** Fixed ISO currency code; always `CAD`. */
    default_currency: string;
  }

  /**
   * Organization-scoped configuration payload stored in the settings JSON
   * column; the service layer validates this structure on read and write.
   */
  export interface ISettings {
    /**
     * Per-province sales tax rate table consulted when issuing invoice
     * lines; seeded with Ontario HST 13% as the default example.
     */
    tax_rates: ISettings.ITaxRate[];
  }

  export namespace ISettings {
    /**
     * Tax treatment configured for one province.
     */
    export interface ITaxRate {
      /** Canadian province or territory code the row applies to. */
      province: string;

      /** Tax treatment code stamped on invoice lines in the province. */
      code: EBrokerDeskTaxCode;

      /** Tax rate percent applied within the province (e.g. 13 for Ontario HST). */
      rate: number;

      /** Whether broker fees are taxable at this rate in the province. */
      broker_fee_taxable: boolean;
    }
  }

  /**
   * Creation payload consumed by the first-administrator registration flow
   * (auth join), which provisions the tenant transactionally together with
   * the founding ADMIN account.
   *
   * Identity, currency, and timestamps are system-assigned: the currency is
   * fixed to CAD and the settings tax rate table is seeded when omitted.
   */
  export interface ICreate {
    /** Registered legal name of the brokerage. */
    legal_name: string;

    /** Trade or operating name, when it differs from the legal name. */
    operating_name?: string | null;

    /** Canadian province or territory code of primary operation. */
    primary_province: string;

    /** Primary business telephone number. */
    phone?: string | null;

    /** CRA HST/GST registration number. */
    hst_gst_number?: string | null;

    /** Tax rate settings; seeded with Ontario HST 13% when omitted. */
    settings?: ISettings;

    /** Street address line 1 of the principal office. */
    address_line1?: string | null;

    /** Street address line 2 of the principal office. */
    address_line2?: string | null;

    /** City of the principal office. */
    city?: string | null;

    /** Province code of the principal office address. */
    province?: string | null;

    /** Postal code of the principal office. */
    postal_code?: string | null;
  }

  /**
   * Update payload for the organization profile; every field is optional.
   *
   * Currency is fixed to CAD and never editable, and the tax rate settings
   * are maintained through the dedicated settings endpoint, so both are
   * excluded here.
   */
  export interface IUpdate {
    /** Registered legal name of the brokerage. */
    legal_name?: string;

    /** Trade or operating name. */
    operating_name?: string | null;

    /** Canadian province or territory code of primary operation. */
    primary_province?: string;

    /** Primary business telephone number. */
    phone?: string | null;

    /** CRA HST/GST registration number. */
    hst_gst_number?: string | null;

    /** Street address line 1 of the principal office. */
    address_line1?: string | null;

    /** Street address line 2 of the principal office. */
    address_line2?: string | null;

    /** City of the principal office. */
    city?: string | null;

    /** Province code of the principal office address. */
    province?: string | null;

    /** Postal code of the principal office. */
    postal_code?: string | null;
  }
}
