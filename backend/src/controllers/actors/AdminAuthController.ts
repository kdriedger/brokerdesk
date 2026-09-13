import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";

import {
  IBrokerDeskAdmin,
  IBrokerDeskAdminSession,
} from "../../api/structures/BrokerDeskActorsAdmin";
import { IPage } from "../../api/structures/IPage";
import {
  getAuthAdminMe,
  patchAuthAdminSessions,
  postAuthAdminEmailVerifyConfirm,
  postAuthAdminEmailVerifyRequest,
  postAuthAdminJoin,
  postAuthAdminLogin,
  postAuthAdminPasswordResetConfirm,
  postAuthAdminPasswordResetRequest,
  postAuthAdminRefresh,
  putAuthAdminMe,
} from "../../providers/auth/admin";

/**
 * Authentication gateway and self-service surface for brokerage
 * administrators.
 *
 * Public flows (first-administrator registration creating the organization,
 * login, refresh, password reset, email verification) are reachable without
 * credentials; the administrator's own profile and session history require a
 * valid JWT resolved from the token subject. There is intentionally no
 * logout endpoint because JWT sessions are stateless and terminate by expiry
 * or administrative deactivation only.
 */
@Controller("auth/admin")
export class BrokerDeskActorsAdminAuthController {
  /**
   * Register the first administrator together with a new brokerage
   * organization.
   *
   * Public entry point of a brand-new tenant: the organization profile and
   * the founding administrator account are created atomically in one
   * transaction, and a fresh JWT pair is returned. Subsequent staff accounts
   * are provisioned by invitation instead of self-registration.
   *
   * @param body Organization profile plus founding administrator credentials.
   * @returns The created administrator with freshly issued access and refresh tokens.
   */
  @TypedRoute.Post("join")
  public async join(
    @TypedBody() body: IBrokerDeskAdmin.IJoin,
  ): Promise<IBrokerDeskAdmin.IAuthorized> {
    return postAuthAdminJoin(body);
  }

  /**
   * Sign in as a brokerage administrator.
   *
   * Verifies the credential, rejects deactivated accounts, and issues a
   * short-lived access token paired with a longer-lived refresh token bound
   * to a new session record carrying the request context.
   *
   * @param body Email and password credentials.
   * @returns The administrator with a freshly issued JWT pair.
   */
  @TypedRoute.Post("login")
  public async login(
    @TypedBody() body: IBrokerDeskAdmin.ILogin,
  ): Promise<IBrokerDeskAdmin.IAuthorized> {
    return postAuthAdminLogin(body);
  }

  /**
   * Refresh the access token of an existing administrator session.
   *
   * Re-reads the administrator's current activation status at refresh time so
   * renewed credentials always reflect present account state.
   *
   * @param body Refresh token previously issued by join or login.
   * @returns Renewed authorization payload bound to the same session.
   */
  @TypedRoute.Post("refresh")
  public async refresh(
    @TypedBody() body: IBrokerDeskAdmin.IRefresh,
  ): Promise<IBrokerDeskAdmin.IAuthorized> {
    return postAuthAdminRefresh(body);
  }

  /**
   * Request a single-use password reset token by email.
   *
   * Responds identically whether or not the address is registered, to avoid
   * revealing account existence. The plaintext token is only ever delivered
   * by email; delivery may be logged instead of sent in development.
   *
   * @param body Email address targeting the reset.
   */
  @TypedRoute.Post("password/reset/request")
  public async requestPasswordReset(
    @TypedBody() body: IBrokerDeskAdmin.IRequestPasswordReset,
  ): Promise<void> {
    return postAuthAdminPasswordResetRequest(body);
  }

  /**
   * Consume a password reset token and set a new password.
   *
   * Expired or already-consumed tokens are rejected and leave the account
   * unchanged, requiring a fresh request.
   *
   * @param body One-time token plus the replacement password.
   */
  @TypedRoute.Post("password/reset/confirm")
  public async confirmPasswordReset(
    @TypedBody() body: IBrokerDeskAdmin.IConfirmPasswordReset,
  ): Promise<void> {
    return postAuthAdminPasswordResetConfirm(body);
  }

  /**
   * Request a single-use email verification token.
   *
   * Issues a fresh verification row rather than reviving stale ones and
   * dispatches the one-time token to the address.
   *
   * @param body Email address to verify.
   */
  @TypedRoute.Post("email/verify/request")
  public async requestEmailVerification(
    @TypedBody() body: IBrokerDeskAdmin.IRequestEmailVerification,
  ): Promise<void> {
    return postAuthAdminEmailVerifyRequest(body);
  }

  /**
   * Confirm email ownership with a verification token.
   *
   * Consumes the token exactly once; double redemption is impossible.
   *
   * @param body Email address plus the one-time verification token.
   */
  @TypedRoute.Post("email/verify/confirm")
  public async confirmEmailVerification(
    @TypedBody() body: IBrokerDeskAdmin.IConfirmEmailVerification,
  ): Promise<void> {
    return postAuthAdminEmailVerifyConfirm(body);
  }

  /**
   * List the sign-in sessions of the authenticated administrator.
   *
   * The session history is the security audit surface of the account; rows
   * are ordered newest first and every entry carries its request context.
   *
   * @param body Pagination criteria.
   * @returns Paginated session history of the caller.
   */
  @TypedRoute.Patch("sessions")
  public async index(
    @TypedBody() body: IBrokerDeskAdminSession.IRequest,
  ): Promise<IPage<IBrokerDeskAdminSession.ISummary>> {
    return patchAuthAdminSessions(body);
  }

  /**
   * Retrieve the profile of the authenticated administrator.
   *
   * Resolved from the JWT subject; no path parameter is accepted for
   * self-access.
   *
   * @returns The administrator record of the caller.
   */
  @TypedRoute.Get("me")
  public async me(): Promise<IBrokerDeskAdmin> {
    return getAuthAdminMe();
  }

  /**
   * Update the profile of the authenticated administrator.
   *
   * @param body Mutable profile fields.
   * @returns The refreshed administrator record.
   */
  @TypedRoute.Put("me")
  public async update(
    @TypedBody() body: IBrokerDeskAdmin.IUpdate,
  ): Promise<IBrokerDeskAdmin> {
    return putAuthAdminMe(body);
  }
}
