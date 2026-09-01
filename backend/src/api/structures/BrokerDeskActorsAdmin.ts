import { tags } from "typia";

import { IBrokerDeskOrganization } from "./BrokerDeskSystematicOrganization";

/**
 * Brokerage administrator account of a BrokerDesk tenant.
 *
 * Highest-authority staff actor of exactly one brokerage organization:
 * governs the organization profile, staff accounts and roles, the carrier
 * roster and product catalogue, document templates, commission schedules,
 * reports, and reviews the append-only audit trail. The founding
 * administrator is created through the public join flow in the same
 * transaction as its organization; every further administrator is
 * provisioned by invitation from an existing administrator.
 */
export interface IBrokerDeskAdmin {
  /**
   * Primary key.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Owning brokerage organization (tenant boundary of the account).
   */
  organization: IBrokerDeskOrganization.ISummary;

  /**
   * Sign-in email address, unique across the platform.
   */
  email: string;

  /**
   * Human-readable display name shown across the workspace.
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
   * Soft-delete timestamp; null while the account is in force.
   */
  deleted_at: (string & tags.Format<"date-time">) | null;

  /**
   * Sign-in session history of the account.
   */
  sessions: IBrokerDeskAdminSession.ISummary[];
}
export namespace IBrokerDeskAdmin {
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
   * Authorization payload returned by the join, login, and refresh flows.
   */
  export interface IAuthorized {
    /**
     * The administrator record.
     */
    admin: IBrokerDeskAdmin;

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
   * First-administrator registration body.
   *
   * Public entry point of a brand-new tenant: the organization profile and
   * the founding administrator account are created atomically. Subsequent
   * staff accounts are provisioned by invitation instead.
   */
  export interface IJoin {
    /**
     * Profile of the organization to register.
     */
    organization: IBrokerDeskOrganization.ICreate;

    /**
     * Sign-in email address of the founding administrator.
     */
    email: string;

    /**
     * Plaintext password; persisted only as a salted hash.
     */
    password: string;

    /**
     * Display name of the founding administrator.
     */
    display_name: string;
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
     * Refresh token previously issued by join or login.
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
  }

  /**
   * Administrator invitation body (admin-managed provisioning).
   *
   * No plaintext password is accepted here: the invited colleague completes
   * the credential through the one-time setup / password reset flow.
   */
  export interface ICreate {
    /**
     * Sign-in email address of the invited administrator.
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
   * Mutable fields of an administrator account, all optional.
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
   * Search criteria of the admin-managed administrator index.
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
 * JWT sign-in session of a brokerage administrator.
 *
 * Captures the request origin (ip, href, referrer) of each sign-in and the
 * hard expiry enforced by the authorization layer. Append-only: rows are
 * written once, advanced by refresh, and shortened by logout or forced
 * termination on deactivation, never edited.
 */
export interface IBrokerDeskAdminSession {
  /**
   * Primary key; also the subject from which the access token is derived.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Owning administrator.
   */
  admin: IBrokerDeskAdmin.ISummary;

  /**
   * Client IP address from which the session was established.
   */
  ip: string;

  /**
   * Absolute URL of the endpoint or page at which sign-in was performed.
   */
  href: string;

  /**
   * HTTP referrer value supplied when the session was established.
   */
  referrer: string;

  /**
   * Moment the session was created by a successful sign-in.
   */
  created_at: string & tags.Format<"date-time">;

  /**
   * Moment at which the session stops being accepted.
   */
  expired_at: string & tags.Format<"date-time">;
}
export namespace IBrokerDeskAdminSession {
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
 * Single-use password reset token issuance for administrators.
 *
 * Read projection of an internal authentication artifact: only the hashed
 * form of the emailed token is persisted and it is never exposed through the
 * API. Rows are created and consumed exclusively by the password reset
 * flows; there are no management endpoints.
 */
export interface IBrokerDeskAdminPasswordReset {
  /**
   * Primary key.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Administrator whose password this token may replace.
   */
  admin: IBrokerDeskAdmin.ISummary;

  /**
   * Acting administrator who triggered the reset on behalf of another user,
   * null for ordinary self-service recovery.
   */
  requested_by: IBrokerDeskAdmin.ISummary | null;

  /**
   * Absolute deadline after which the token is rejected as expired.
   */
  expired_at: string & tags.Format<"date-time">;

  /**
   * Moment the token was successfully redeemed; null while unused.
   */
  consumed_at: (string & tags.Format<"date-time">) | null;

  /**
   * Moment the reset request arrived and the token was issued.
   */
  created_at: string & tags.Format<"date-time">;
}

/**
 * Single-use email verification token issuance for administrators.
 *
 * Read projection of an internal authentication artifact: only the hashed
 * form of the emailed token is persisted and it is never exposed through the
 * API. Rows accumulate as an append-only verification history across
 * registration, invitation acceptance, and later email changes.
 */
export interface IBrokerDeskAdminEmailVerification {
  /**
   * Primary key.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Administrator whose email address this attempt confirms.
   */
  admin: IBrokerDeskAdmin.ISummary;

  /**
   * Email address targeted by this verification attempt.
   */
  email: string;

  /**
   * Moment the verification request was generated and dispatched.
   */
  created_at: string & tags.Format<"date-time">;

  /**
   * Hard deadline after which the token is rejected.
   */
  expires_at: string & tags.Format<"date-time">;

  /**
   * Moment the token was successfully redeemed; null while pending.
   */
  consumed_at: (string & tags.Format<"date-time">) | null;
}

/**
 * Append-only security audit trail entry for administrator account events.
 *
 * Records one immutable event such as sign-in, role change, activation,
 * deactivation, password change, administrator-initiated reset, or email
 * verification completion. Written once and never modified or removed.
 */
export interface IBrokerDeskAdminAuditLog {
  /**
   * Primary key.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Acting administrator attributed with the event.
   */
  admin: IBrokerDeskAdmin.ISummary;

  /**
   * Administrator account affected when the event targets someone other
   * than the actor; null for self-service events.
   */
  target_admin: IBrokerDeskAdmin.ISummary | null;

  /**
   * Machine-readable event classifier (login, role_change, activation, ...).
   */
  action: string;

  /**
   * Human-readable summary of the recorded event.
   */
  detail: string;

  /**
   * Source IP address from which the event originated.
   */
  ip: string;

  /**
   * User-agent string reported by the client application.
   */
  user_agent: string;

  /**
   * Timestamp when the audit event was written.
   */
  created_at: string & tags.Format<"date-time">;
}
export namespace IBrokerDeskAdminAuditLog {
  /**
   * Lightweight projection for lists and nested references.
   */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    action: string;
    detail: string;
    created_at: string & tags.Format<"date-time">;
  }

  /**
   * Search criteria of the audit trail index.
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
     * Filter by event classifier.
     */
    action?: string;

    /**
     * Filter by the affected administrator (events acting on a colleague).
     */
    target_broker_desk_admin_id?: string & tags.Format<"uuid">;
  }
}
