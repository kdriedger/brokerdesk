import { tags } from "typia";

import { IBrokerDeskOrganization } from "./BrokerDeskSystematicOrganization";

/**
 * Customer service representative staff account of a brokerage.
 *
 * Holds email and password credentials, a display name, an activation
 * standing, and membership in exactly one organization. CSRs service any
 * client, record activities, process endorsements, handle documents, and
 * coordinate tasks, while role-based authorization blocks administrative
 * capabilities. Provisioned exclusively through administrator invitation;
 * invited accounts start without a password and reach first sign-in through
 * a single-use setup path that also verifies the email address.
 */
export interface IBrokerDeskCsr {
  /**
   * Primary key.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Owning brokerage organization (tenant boundary of the account).
   */
  organization: IBrokerDeskOrganization.ISummary;

  /**
   * Sign-in email address, unique within the organization.
   */
  email: string;

  /**
   * Human-readable name shown on attributed records.
   */
  display_name: string;

  /**
   * Whether the account may currently authenticate.
   */
  active: boolean;

  /**
   * Creation timestamp of the invited account row.
   */
  created_at: string & tags.Format<"date-time">;

  /**
   * Last modification timestamp.
   */
  updated_at: string & tags.Format<"date-time">;

  /**
   * Soft-delete timestamp; null while the account remains in force.
   */
  deleted_at: (string & tags.Format<"date-time">) | null;

  /**
   * Sign-in session history of the account.
   */
  sessions: IBrokerDeskCsrSession.ISummary[];
}
export namespace IBrokerDeskCsr {
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
     * The CSR record.
     */
    csr: IBrokerDeskCsr;

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
   * invited CSRs establish their initial password here.
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
   * CSR invitation body (admin-managed provisioning).
   *
   * No plaintext password is accepted here: the invitee completes the
   * credential through the email verification setup flow.
   */
  export interface ICreate {
    /**
     * Sign-in email address of the invited CSR.
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
   * Mutable fields of a CSR account, all optional.
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
   * Search criteria of the admin-managed CSR index.
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
 * JWT sign-in session of a customer service representative.
 *
 * Captures the request context (ip, href, referrer) of each sign-in and the
 * hard expiry enforced by the authorization layer. Permanently bound to the
 * CSR's brokerage; terminated on logout, refresh-rotation failure, or forced
 * invalidation after account deactivation.
 */
export interface IBrokerDeskCsrSession {
  /**
   * Primary key; also the stable reference embedded in token claims.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Owning customer service representative.
   */
  csr: IBrokerDeskCsr.ISummary;

  /**
   * IP address from which the sign-in request was received.
   */
  ip: string;

  /**
   * Absolute URL of the page that initiated the sign-in request.
   */
  href: string;

  /**
   * Referrer URL supplied by the client application at sign-in.
   */
  referrer: string;

  /**
   * Moment the session was established through successful authentication.
   */
  created_at: string & tags.Format<"date-time">;

  /**
   * Moment after which the session no longer validates access.
   */
  expired_at: string & tags.Format<"date-time">;
}
export namespace IBrokerDeskCsrSession {
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
 * Single-use password reset token issuance for CSRs.
 *
 * Read projection of an internal authentication artifact: only the hashed
 * form of the emailed token is persisted and it is never exposed through the
 * API. Rows are created and consumed exclusively by the password reset
 * flows.
 */
export interface IBrokerDeskCsrPasswordReset {
  /**
   * Primary key.
   */
  id: string & tags.Format<"uuid">;

  /**
   * CSR account whose password this token may reset.
   */
  csr: IBrokerDeskCsr.ISummary;

  /**
   * Deadline after which the token is no longer acceptable.
   */
  expires_at: string & tags.Format<"date-time">;

  /**
   * Moment the token was consumed to complete a password change; null while
   * unused.
   */
  used_at: (string & tags.Format<"date-time">) | null;

  /**
   * Issuance timestamp of the reset request.
   */
  created_at: string & tags.Format<"date-time">;

  /**
   * Last modification timestamp, advancing when the token is consumed.
   */
  updated_at: string & tags.Format<"date-time">;
}

/**
 * Single-use email verification token issuance for CSRs.
 *
 * Read projection of an internal authentication artifact: only the hashed
 * form of the emailed token is persisted and it is never exposed through the
 * API. Sign-in is refused while the CSR's email is unverified.
 */
export interface IBrokerDeskCsrEmailVerification {
  /**
   * Primary key.
   */
  id: string & tags.Format<"uuid">;

  /**
   * CSR account whose email address this token confirms.
   */
  csr: IBrokerDeskCsr.ISummary;

  /**
   * Email address this token verifies.
   */
  email: string;

  /**
   * Moment the token was generated and dispatched.
   */
  created_at: string & tags.Format<"date-time">;

  /**
   * Moment after which the token is no longer acceptable.
   */
  expired_at: string & tags.Format<"date-time">;

  /**
   * Moment the token was presented and the email confirmed; null while
   * unused.
   */
  consumed_at: (string & tags.Format<"date-time">) | null;
}
