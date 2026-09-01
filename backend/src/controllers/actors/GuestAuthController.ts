import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";

import {
  IBrokerDeskGuest,
  IBrokerDeskGuestSession,
} from "../../api/structures/BrokerDeskActorsGuest";
import { IPage } from "../../api/structures/IPage";

/**
 * Authentication gateway for anonymous guests.
 *
 * A guest is the default condition of unauthenticated traffic on the
 * permitted public doors. Joining issues (or reuses) an anonymous anchor
 * together with a short-lived session so successive steps of one public flow
 * can be correlated, while the identity gate continues revealing nothing
 * about which brokerages exist.
 */
@Controller("auth/guest")
export class BrokerDeskActorsGuestAuthController {
  /**
   * Issue an anonymous guest session for a public-flow visitor.
   *
   * Creates the guest anchor if the visitor does not already hold one and
   * appends a fresh short-lived session capturing the device context. Guest
   * sessions carry no credentials and expire mandatorily.
   *
   * @param body Device context (ip, href, referrer) of the anonymous visit.
   * @returns The guest anchor with a freshly issued anonymous JWT pair.
   */
  @TypedRoute.Post("join")
  public async join(
    @TypedBody() body: IBrokerDeskGuest.IJoin,
  ): Promise<IBrokerDeskGuest.IAuthorized> {
    throw new Error("Not implemented");
  }

  /**
   * List the anonymous sessions of the authenticated guest.
   *
   * @param body Pagination criteria.
   * @returns Paginated anonymous session history of the caller.
   */
  @TypedRoute.Patch("sessions")
  public async index(
    @TypedBody() body: IBrokerDeskGuestSession.IRequest,
  ): Promise<IPage<IBrokerDeskGuestSession.ISummary>> {
    throw new Error("Not implemented");
  }
}
