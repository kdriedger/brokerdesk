import { tags } from "typia";

import { IBrokerDeskOrganization } from "./BrokerDeskSystematicOrganization";

/**
 * Portal client authentication identity: an insured customer's sign-in
 * account, provisioned by an administrator of exactly one brokerage against
 * that customer's existing client profile.
 *
 * The identity performs no work inside the brokerage; its grants are limited
 * to reading its own policies and documents and submitting service requests
 * through the deferred self-service portal. Public registration never
 * creates these identities — provisioning is exclusively administrative, and
 * accounts are deactivated rather than deleted.
 */
export interface IBrokerDeskClient {
  /**
   * Primary key.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Owning brokerage organization (tenant boundary of the account).
   */
  organization: IBrokerDeskOrganization.ISummary;

  /**
   * Sign-in email address, unique across the whole platform.
   */
  email: string;

  /**
   * Whether the account may currently authenticate.
   */
  active: boolean;

  /**
   * Moment the customer completed the email verification flow; null while
   * the address is unverified and sign-in is refused.
   */
  email_verified_at: (string & tags.Format<"date-time">) | null;

  /**
   * Moment the administrator provisioned this portal identity.
   */
  created_at: string & tags.Format<"date-time">;

  /**
   * Last modification timestamp.
   */
  updated_at: string & tags.Format<"date-time">;

  /**
   * Sign-in session history of the account.
   */
  sessions: IBrokerDeskClientSession.ISummary[];
}
export namespace IBrokerDeskClient {
  /**
   * Lightweight projection for lists and nested references.
   */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    organization: IBrokerDeskOrganization.ISummary;
    email: string;
    active: boolean;
    email_verified_at: (string & tags.Format<"date-time">) | null;
    created_at: string & tags.Format<"date-time">;
  }

  /**
   * Authorization payload returned by the login and refresh flows.
   */
  export interface IAuthorized {
    /**
     * The portal client record.
     */
    client: IBrokerDeskClient;

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
   * Password reset request body; triggers a one-time emailed token without
   * revealing whether the address belongs to an existing portal client.
   */
  export interface IRequestPasswordReset {
    /**
     * Email address targeting the reset.
     */
    email: string;
  }

  /**
   * Password reset confirmation body; consumes the emailed token. Also used
   * when an administrator triggers a reset on the customer's behalf.
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
   * Portal identity provisioning body (admin-managed).
   *
   * The customer establishes the initial credential through the password
   * reset flow; no plaintext password is accepted here.
   */
  export interface ICreate {
    /**
     * Sign-in email address of the portal identity.
     */
    email: string;

    /**
     * Whether the account may authenticate immediately.
     */
    active: boolean;
  }

  /**
   * Mutable fields of a portal identity, all optional.
   */
  export interface IUpdate {
    /**
     * Replacement sign-in email address.
     */
    email?: string;

    /**
     * Activation flag; deactivation bars sign-in immediately.
     */
    active?: boolean;
  }

  /**
   * Search criteria of the admin-managed portal identity index.
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
     * Filter by activation standing.
     */
    active?: boolean;
  }
}

/**
 * JWT sign-in session issued to a portal client identity.
 *
 * Records the network context of the sign-in request (ip, href, referrer)
 * and the hard expiry deadline enforced by the authorization layer.
 * Append-only security artifact managed exclusively by the auth flows.
 */
export interface IBrokerDeskClientSession {
  /**
   * Primary key.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Owning portal client identity.
   */
  client: IBrokerDeskClient.ISummary;

  /**
   * IP address from which the sign-in request originated.
   */
  ip: string;

  /**
   * URL of the page from which the portal sign-in flow was initiated.
   */
  href: string;

  /**
   * Referrer URL supplied by the browser during sign-in.
   */
  referrer: string;

  /**
   * Moment the session was established by a successful sign-in or refresh.
   */
  created_at: string & tags.Format<"date-time">;

  /**
   * Hard expiry deadline after which the session cannot be renewed.
   */
  expired_at: string & tags.Format<"date-time">;
}
export namespace IBrokerDeskClientSession {
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
 * Single-use password reset token issuance for portal clients.
 *
 * Read projection of an internal authentication artifact: only the hashed
 * form of the emailed token is persisted and it is never exposed through the
 * API. Responses of the reset flows never reveal whether the addressed
 * email belongs to an existing portal client.
 */
export interface IBrokerDeskClientPasswordReset {
  /**
   * Primary key.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Portal client identity whose password this token authorizes resetting.
   */
  client: IBrokerDeskClient.ISummary;

  /**
   * Deadline after which the token is no longer redeemable.
   */
  expires_at: string & tags.Format<"date-time">;

  /**
   * Moment the token was redeemed to set a new password; null until then.
   */
  used_at: (string & tags.Format<"date-time">) | null;

  /**
   * Moment the reset was requested and the token issued.
   */
  created_at: string & tags.Format<"date-time">;

  /**
   * Last modification timestamp, advancing when the token is consumed.
   */
  updated_at: string & tags.Format<"date-time">;
}

/**
 * Single-use email verification token issuance for portal clients.
 *
 * Read projection of an internal authentication artifact: only the hashed
 * form of the emailed token is persisted and it is never exposed through the
 * API. Sign-in remains refused until a valid token is confirmed.
 */
export interface IBrokerDeskClientEmailVerification {
  /**
   * Primary key.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Portal client identity whose email address this verification confirms.
   */
  client: IBrokerDeskClient.ISummary;

  /**
   * Email address being confirmed by this verification attempt.
   */
  email: string;

  /**
   * Deadline after which the token is no longer acceptable.
   */
  expires_at: string & tags.Format<"date-time">;

  /**
   * Moment the email address was successfully confirmed; null while pending.
   */
  verified_at: (string & tags.Format<"date-time">) | null;

  /**
   * Moment the verification token was issued to the client.
   */
  created_at: string & tags.Format<"date-time">;
}
