import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";

import { IBrokerDeskClient } from "../../api/structures/BrokerDeskActorsClient";
import {
  postAuthClientEmailVerifyConfirm,
  postAuthClientEmailVerifyRequest,
  postAuthClientLogin,
  postAuthClientPasswordResetConfirm,
  postAuthClientPasswordResetRequest,
  postAuthClientRefresh,
} from "../../providers/auth/client";

/**
 * Authentication gateway for portal client identities.
 *
 * Portal identities are provisioned exclusively by administrators — public
 * registration never creates them. Sign-in stays refused until the one-time
 * email verification is redeemed, and password recovery proceeds through
 * single-use reset tokens (also used when an administrator triggers a reset
 * on the customer's behalf) without revealing whether an address exists.
 * There is intentionally no logout endpoint because JWT sessions are
 * stateless and terminate by expiry or forced invalidation.
 */
@Controller("auth/client")
export class BrokerDeskActorsClientAuthController {
  /**
   * Sign in as a portal client.
   *
   * Verifies the credential, gates on email verification and activation, and
   * issues a JWT pair confined to the owning brokerage.
   *
   * @param body Email and password credentials.
   * @returns The portal client with a freshly issued JWT pair.
   */
  @TypedRoute.Post("login")
  public async login(
    @TypedBody() body: IBrokerDeskClient.ILogin,
  ): Promise<IBrokerDeskClient.IAuthorized> {
    return postAuthClientLogin(body);
  }

  /**
   * Refresh the access token of an existing portal client session.
   *
   * @param body Refresh token previously issued by login.
   * @returns Renewed authorization payload bound to the same session.
   */
  @TypedRoute.Post("refresh")
  public async refresh(
    @TypedBody() body: IBrokerDeskClient.IRefresh,
  ): Promise<IBrokerDeskClient.IAuthorized> {
    return postAuthClientRefresh(body);
  }

  /**
   * Request a single-use password reset token by email.
   *
   * Responds identically whether or not the address belongs to an existing
   * portal client; delivery may be logged instead of emailed in development.
   *
   * @param body Email address targeting the reset.
   */
  @TypedRoute.Post("password/reset/request")
  public async requestPasswordReset(
    @TypedBody() body: IBrokerDeskClient.IRequestPasswordReset,
  ): Promise<void> {
    return postAuthClientPasswordResetRequest(body);
  }

  /**
   * Consume a password reset token and set a new password.
   *
   * @param body One-time token plus the replacement password.
   */
  @TypedRoute.Post("password/reset/confirm")
  public async confirmPasswordReset(
    @TypedBody() body: IBrokerDeskClient.IConfirmPasswordReset,
  ): Promise<void> {
    return postAuthClientPasswordResetConfirm(body);
  }

  /**
   * Request a single-use email verification token.
   *
   * Issues a fresh verification row whenever a previous token expired or went
   * unused, keeping the verification history append-only.
   *
   * @param body Email address to verify.
   */
  @TypedRoute.Post("email/verify/request")
  public async requestEmailVerification(
    @TypedBody() body: IBrokerDeskClient.IRequestEmailVerification,
  ): Promise<void> {
    return postAuthClientEmailVerifyRequest(body);
  }

  /**
   * Confirm email ownership with a verification token.
   *
   * Successful confirmation unlocks ordinary sign-in for the identity.
   *
   * @param body Email address plus the one-time verification token.
   */
  @TypedRoute.Post("email/verify/confirm")
  public async confirmEmailVerification(
    @TypedBody() body: IBrokerDeskClient.IConfirmEmailVerification,
  ): Promise<void> {
    return postAuthClientEmailVerifyConfirm(body);
  }
}
