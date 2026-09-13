import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";

import {
  IBrokerDeskCsr,
  IBrokerDeskCsrSession,
} from "../../api/structures/BrokerDeskActorsCsr";
import { IPage } from "../../api/structures/IPage";
import {
  getCsrMe,
  patchCsrMeSessions,
  putCsrMe,
} from "../../providers/auth/csr";

/**
 * CSR self-service surface.
 *
 * Every route resolves the subject from the JWT — no path parameter is
 * accepted for self-access. CSRs review their own profile and sign-in
 * history; account activation and role management remain exclusively
 * administrative.
 */
@Controller("csrs/me")
export class BrokerDeskActorsCsrMeController {
  /**
   * Retrieve the profile of the authenticated CSR.
   *
   * @returns The CSR record of the caller.
   */
  @TypedRoute.Get()
  public async me(): Promise<IBrokerDeskCsr> {
    return getCsrMe();
  }

  /**
   * Update the profile of the authenticated CSR.
   *
   * @param body Mutable profile fields.
   * @returns The refreshed CSR record.
   */
  @TypedRoute.Put()
  public async update(
    @TypedBody() body: IBrokerDeskCsr.IUpdate,
  ): Promise<IBrokerDeskCsr> {
    return putCsrMe(body);
  }

  /**
   * List the sign-in sessions of the authenticated CSR.
   *
   * @param body Pagination criteria.
   * @returns Paginated session history of the caller.
   */
  @TypedRoute.Patch("sessions")
  public async indexSessions(
    @TypedBody() body: IBrokerDeskCsrSession.IRequest,
  ): Promise<IPage<IBrokerDeskCsrSession.ISummary>> {
    return patchCsrMeSessions(body);
  }
}
