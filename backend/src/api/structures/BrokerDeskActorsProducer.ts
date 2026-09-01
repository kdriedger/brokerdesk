import { tags } from "typia";

import { IBrokerDeskOrganization } from "./BrokerDeskSystematicOrganization";

/**
 * Producer actor: a sales broker employed or contracted by one brokerage,
 * owning a book of business that includes assigned clients, quotes,
 * carrier submissions, policies, renewals, and commissions.
 *
 * Producers are provisioned exclusively through administrator invitation —
 * there is no public self-registration path. Authentication artifacts
 * (sessions, password resets, email verifications) live in companion
 * structures managed exclusively by the auth flows.
 */
export interface IBrokerDeskProducer {
  /**
   * Primary key.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Owning brokerage organization (tenant boundary of the account).
   */
  organization: IBrokerDeskOrganization.ISummary;

  /**
   * Sign-in email address, unique across all actors of the platform.
   */
  email: string;

  /**
   * Human-readable display name shown across rosters, timelines, and
   * commission statements.
   */
  display_name: string;

  /**
   * Whether the account may currently authenticate.
   */
  active: boolean;

  /**
   * Creation timestamp.
   */
  created_at: string & tags.Format<"date-time">;

  /**
   * Last modification timestamp.
   */
  updated_at: string & tags.Format<"date-time">;

  /**
   * Soft-delete marker; null while the producer remains retrievable.
   */
  deleted_at: (string & tags.Format<"date-time">) | null;

  /**
   * Sign-in session history of the account.
   */
  sessions: IBrokerDeskProducerSession.ISummary[];

  /**
   * Provincial licences qualifying this producer's book of business.
   */
  licences: IBrokerDeskProducerLicence.ISummary[];
}
export namespace IBrokerDeskProducer {
  /**
   * Lightweight projection for lists and nested references.
   */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    organization: IBrokerDeskOrganization.ISummary;
    email: string;
    display_name: string;
    active: boolean;
    created_at: string & tags.Format<"date-time">;
  }

  /**
   * Authorization payload returned by the login and refresh flows.
   */
  export interface IAuthorized {
    /**
     * The producer record.
     */
    producer: IBrokerDeskProducer;

    /**
     * JWT pair bound to the sign-in session.
     */
    token: {
      /**
       * Token type discriminator.
       */
      type: "jwt";

      /**
       * Short-lived access token.
       */
      access: string;

      /**
       * Longer-lived refresh token.
       */
      refresh: string;

      /**
       * Expiration moment of the access token.
       */
      expires_at: string & tags.Format<"date-time">;
    };
  }

  /**
   * Sign-in body.
   */
  export interface ILogin {
    /**
     * Sign-in email address.
     */
    email: string;

    /**
     * Plaintext password.
     */
    password: string;
  }

  /**
   * Refresh body; exchanges a refresh token for a renewed JWT pair bound to
   * the same session.
   */
  export interface IRefresh {
    /**
     * Refresh token previously issued by login.
     */
    refresh_token: string;
  }

  /**
   * Password reset request body; triggers a one-time emailed token.
   */
  export interface IRequestPasswordReset {
    /**
     * Email address targeting the reset.
     */
    email: string;
  }

  /**
   * Password reset confirmation body; consumes the emailed token.
   */
  export interface IConfirmPasswordReset {
    /**
     * One-time reset token delivered by email.
     */
    token: string;

    /**
     * Replacement password meeting the quality standard.
     */
    new_password: string;
  }

  /**
   * Email verification request body.
   */
  export interface IRequestEmailVerification {
    /**
     * Email address to verify.
     */
    email: string;
  }

  /**
   * Email verification confirmation body.
   *
   * Doubles as the activation step of the administrator-invited setup path:
   * invited producers complete their initial credential here.
   */
  export interface IConfirmEmailVerification {
    /**
     * Email address being confirmed.
     */
    email: string;

    /**
     * One-time verification token delivered by email.
     */
    token: string;

    /**
     * Initial password to establish when completing an invitation setup;
     * omitted for ordinary re-verification of an existing credential.
     */
    new_password?: string;
  }

  /**
   * Producer invitation body (admin-managed provisioning).
   *
   * No plaintext password is accepted here: the invited producer completes
   * the credential through the email verification setup flow.
   */
  export interface ICreate {
    /**
     * Sign-in email address of the invited producer.
     */
    email: string;

    /**
     * Human-readable display name.
     */
    display_name: string;

    /**
     * Whether the account may authenticate immediately.
     */
    active: boolean;
  }

  /**
   * Mutable fields of a producer account, all optional.
   */
  export interface IUpdate {
    /**
     * Replacement sign-in email address.
     */
    email?: string;

    /**
     * Replacement display name.
     */
    display_name?: string;

    /**
     * Activation flag; deactivation terminates open sessions.
     */
    active?: boolean;
  }

  /**
   * Search criteria of the admin-managed producer index.
   */
  export interface IRequest {
    /**
     * Page number, starting from 1.
     */
    page?: number;

    /**
     * Items per page.
     */
    limit?: number;

    /**
     * Filter by email substring.
     */
    email?: string;

    /**
     * Filter by display name substring.
     */
    display_name?: string;

    /**
     * Filter by activation standing.
     */
    active?: boolean;
  }
}

/**
 * JWT sign-in session of a producer.
 *
 * Captures the device context observed at sign-in and the hard expiry
 * enforced by the authorization layer. Permanently bound to the producer's
 * brokerage through the owning producer; never migrates across tenants.
 */
export interface IBrokerDeskProducerSession {
  /**
   * Primary key; also the subject from which the access token is derived.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Owning producer.
   */
  producer: IBrokerDeskProducer.ISummary;

  /**
   * Client IP address observed when the producer authenticated.
   */
  ip: string;

  /**
   * Application URL at which the producer performed authentication.
   */
  href: string;

  /**
   * HTTP referrer header value captured at sign-in time.
   */
  referrer: string;

  /**
   * Moment the session was established by a successful sign-in.
   */
  created_at: string & tags.Format<"date-time">;

  /**
   * Moment after which the session must be re-authenticated.
   */
  expired_at: string & tags.Format<"date-time">;
}
export namespace IBrokerDeskProducerSession {
  /**
   * Lightweight projection for lists and nested references.
   */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    ip: string;
    href: string;
    referrer: string;
    created_at: string & tags.Format<"date-time">;
    expired_at: string & tags.Format<"date-time">;
  }

  /**
   * Search criteria of the session history index.
   */
  export interface IRequest {
    /**
     * Page number, starting from 1.
     */
    page?: number;

    /**
     * Items per page.
     */
    limit?: number;
  }
}

/**
 * Single-use password reset token issuance for producers.
 *
 * Read projection of an internal authentication artifact: only the hashed
 * form of the emailed token is persisted and it is never exposed through the
 * API. Rows are created and consumed exclusively by the password reset
 * flows.
 */
export interface IBrokerDeskProducerPasswordReset {
  /**
   * Primary key.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Producer account whose password this token may reset.
   */
  producer: IBrokerDeskProducer.ISummary;

  /**
   * IP address from which the reset was requested.
   */
  ip: string;

  /**
   * Deadline after which the token is no longer accepted.
   */
  expired_at: string & tags.Format<"date-time">;

  /**
   * Moment the token was redeemed to set a new password; null while pending.
   */
  consumed_at: (string & tags.Format<"date-time">) | null;

  /**
   * Moment the reset was requested and the token issued.
   */
  created_at: string & tags.Format<"date-time">;
}

/**
 * Single-use email verification token issuance for producers.
 *
 * Read projection of an internal authentication artifact: only the hashed
 * form of the emailed token is persisted and it is never exposed through the
 * API. Sign-in remains refused while the producer's email is unverified.
 */
export interface IBrokerDeskProducerEmailVerification {
  /**
   * Primary key.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Producer account whose email address this challenge confirms.
   */
  producer: IBrokerDeskProducer.ISummary;

  /**
   * Email address this challenge was issued to confirm.
   */
  email: string;

  /**
   * Moment the challenge was issued and the verification email dispatched.
   */
  created_at: string & tags.Format<"date-time">;

  /**
   * Deadline after which the token is no longer acceptable.
   */
  expired_at: string & tags.Format<"date-time">;

  /**
   * Moment the token was redeemed to mark the email verified; null while
   * pending.
   */
  consumed_at: (string & tags.Format<"date-time">) | null;
}

/**
 * Provincial insurance licence held by a producer.
 *
 * Records the issuing jurisdiction, credential type (e.g. RIBO), licence
 * number, and validity window used to verify the producer's legal authority
 * to sell insurance in that province. Primary compliance-alert source:
 * expired and soon-expiring conditions feed notifications and dashboards.
 * Managed by administrators (and CSRs) on behalf of producers.
 */
export interface IBrokerDeskProducerLicence {
  /**
   * Primary key.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Producer holding this licence.
   */
  producer: IBrokerDeskProducer.ISummary;

  /**
   * Canadian province or territory code where the licence was issued
   * (ON, QC, AB, BC, ...).
   */
  province_code: string;

  /**
   * Regulatory classification of the credential, such as RIBO.
   */
  licence_type: string;

  /**
   * Government-assigned identifier printed on the licence document.
   */
  licence_number: string;

  /**
   * Date the regulator issued the licence.
   */
  issue_date: string & tags.Format<"date-time">;

  /**
   * Date after which the licence is no longer valid unless renewed.
   */
  expiry_date: string & tags.Format<"date-time">;

  /**
   * Current regulatory standing: active, suspended, or revoked.
   */
  status: string;

  /**
   * Creation timestamp.
   */
  created_at: string & tags.Format<"date-time">;

  /**
   * Last modification timestamp, including renewals.
   */
  updated_at: string & tags.Format<"date-time">;

  /**
   * Soft-delete timestamp; null while the licence is in force.
   */
  deleted_at: (string & tags.Format<"date-time">) | null;
}
export namespace IBrokerDeskProducerLicence {
  /**
   * Lightweight projection for lists and nested references.
   */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    province_code: string;
    licence_type: string;
    licence_number: string;
    issue_date: string & tags.Format<"date-time">;
    expiry_date: string & tags.Format<"date-time">;
    status: string;
  }

  /**
   * Licence registration body under a producer (path-scoped parent).
   */
  export interface ICreate {
    /**
     * Issuing province or territory code.
     */
    province_code: string;

    /**
     * Regulatory licence type, such as RIBO.
     */
    licence_type: string;

    /**
     * Government-assigned licence number.
     */
    licence_number: string;

    /**
     * Date the regulator issued the licence.
     */
    issue_date: string & tags.Format<"date-time">;

    /**
     * Date after which the licence is no longer valid.
     */
    expiry_date: string & tags.Format<"date-time">;

    /**
     * Regulatory standing: active, suspended, or revoked.
     */
    status: string;
  }

  /**
   * Mutable fields of a licence, all optional.
   */
  export interface IUpdate {
    /**
     * Replacement province or territory code.
     */
    province_code?: string;

    /**
     * Replacement licence type.
     */
    licence_type?: string;

    /**
     * Replacement licence number.
     */
    licence_number?: string;

    /**
     * Replacement issue date.
     */
    issue_date?: string & tags.Format<"date-time">;

    /**
     * Replacement expiry date (renewals extend the window).
     */
    expiry_date?: string & tags.Format<"date-time">;

    /**
     * Replacement regulatory standing.
     */
    status?: string;
  }

  /**
   * Search criteria of the licence index, including compliance views for
   * expired and soon-expiring credentials.
   */
  export interface IRequest {
    /**
     * Page number, starting from 1.
     */
    page?: number;

    /**
     * Items per page.
     */
    limit?: number;

    /**
     * Filter by province or territory code.
     */
    province_code?: string;

    /**
     * Filter by licence type.
     */
    licence_type?: string;

    /**
     * Filter by regulatory standing.
     */
    status?: string;

    /**
     * When true, only licences already past their expiry date.
     */
    expired?: boolean;

    /**
     * Only licences expiring within the given number of days.
     */
    expiring_within_days?: number;
  }
}
