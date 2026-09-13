import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";

import {
  IBrokerDeskClient,
  IBrokerDeskClientSession,
} from "../../api/structures/BrokerDeskActorsClient";
import { IPage } from "../../api/structures/IPage";
import {
  getClientMe,
  patchClientMeSessions,
  putClientMe,
} from "../../providers/auth/client";

/**
 * Portal client self-service surface.
 *
 * Every route resolves the subject from the JWT — no path parameter is
 * accepted for self-access. Portal identities review their own profile and
 * sign-in history; policy, document, and service-request surfaces of the
 * portal live in their owning modules.
 */
@Controller("clients/me")
export class BrokerDeskActorsClientMeController {
  /**
   * Retrieve the profile of the authenticated portal client.
   *
   * @returns The portal client record of the caller.
   */
  @TypedRoute.Get()
  public async me(): Promise<IBrokerDeskClient> {
    return getClientMe();
  }

  /**
   * Update the profile of the authenticated portal client.
   *
   * @param body Mutable profile fields.
   * @returns The refreshed portal client record.
   */
  @TypedRoute.Put()
  public async update(
    @TypedBody() body: IBrokerDeskClient.IUpdate,
  ): Promise<IBrokerDeskClient> {
    return putClientMe(body);
  }

  /**
   * List the sign-in sessions of the authenticated portal client.
   *
   * @param body Pagination criteria.
   * @returns Paginated session history of the caller.
   */
  @TypedRoute.Patch("sessions")
  public async indexSessions(
    @TypedBody() body: IBrokerDeskClientSession.IRequest,
  ): Promise<IPage<IBrokerDeskClientSession.ISummary>> {
    return patchClientMeSessions(body);
  }
}
