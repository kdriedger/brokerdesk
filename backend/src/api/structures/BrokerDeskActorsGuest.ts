import { tags } from "typia";

/**
 * Anchor identity record for an unauthenticated visitor traversing one of
 * BrokerDesk's public entry points (first-administrator registration,
 * sign-in, token refresh, password reset, email verification).
 *
 * A guest stores no email, password hash, token, or any other
 * credential-bearing attribute, and holds no foreign keys: tenant isolation
 * cannot apply until identity is proven. It exists solely so anonymous
 * public flows can be attributed to a stable identifier while the identity
 * gate reveals nothing about which brokerages exist.
 */
export interface IBrokerDeskGuest {
  /**
   * Primary key.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Moment the anonymous visitor first initiated a public flow.
   */
  created_at: string & tags.Format<"date-time">;

  /**
   * Moment the guest was last touched by any public-flow activity.
   */
  updated_at: string & tags.Format<"date-time">;

  /**
   * Anonymous sessions issued to this guest.
   */
  sessions: IBrokerDeskGuestSession[];
}
export namespace IBrokerDeskGuest {
  /**
   * Lightweight projection for nested references.
   */
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
  }

  /**
   * Body of the anonymous session issuance for a public-flow visitor.
   *
   * The guest anchor itself carries no business fields; only the device
   * context of the unauthenticated request is supplied by the caller.
   */
  export interface IJoin {
    /**
     * IP address the anonymous visitor presented.
     */
    ip: string;

    /**
     * Page URL at which the anonymous session was initiated.
     */
    href: string;

    /**
     * Referrer header value supplied by the visitor's client application.
     */
    referrer: string;
  }

  /**
   * Authorization payload returned by the guest join flow.
   */
  export interface IAuthorized {
    /**
     * The guest anchor record.
     */
    guest: IBrokerDeskGuest;

    /**
     * JWT pair bound to the anonymous session.
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
}

/**
 * Anonymous visitor session issued before any credentialed identity exists.
 *
 * Captures the network origin (ip), entry URL (href), and referrer of the
 * initiating request, and carries a mandatory hard expiry. Rows are
 * append-only runtime machinery written once at issuance and never mutated
 * by business operations.
 */
export interface IBrokerDeskGuestSession {
  /**
   * Primary key.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Owning anonymous guest.
   */
  guest: IBrokerDeskGuest.ISummary;

  /**
   * IP address presented when the session was created.
   */
  ip: string;

  /**
   * Page URL at which the anonymous session was initiated.
   */
  href: string;

  /**
   * Referrer header value supplied at session creation.
   */
  referrer: string;

  /**
   * Issuance timestamp of the anonymous session.
   */
  created_at: string & tags.Format<"date-time">;

  /**
   * Mandatory expiry after which the anonymous token becomes unusable.
   */
  expired_at: string & tags.Format<"date-time">;
}
export namespace IBrokerDeskGuestSession {
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
   * Search criteria of the guest session history index.
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
