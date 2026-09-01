import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";

import {
  IBrokerDeskProducer,
  IBrokerDeskProducerLicence,
  IBrokerDeskProducerSession,
} from "../../api/structures/BrokerDeskActorsProducer";
import { IPage } from "../../api/structures/IPage";

/**
 * Producer self-service surface.
 *
 * Every route resolves the subject from the JWT — no path parameter is
 * accepted for self-access. Producers review their own profile, sign-in
 * history, and the provincial licences qualifying their own book of
 * business; licence maintenance itself is performed by administrators and
 * CSRs under the admin management surface.
 */
@Controller("producers/me")
export class BrokerDeskActorsProducerMeController {
  /**
   * Retrieve the profile of the authenticated producer.
   *
   * @returns The producer record of the caller, with licences and sessions.
   */
  @TypedRoute.Get()
  public async me(): Promise<IBrokerDeskProducer> {
    throw new Error("Not implemented");
  }

  /**
   * Update the profile of the authenticated producer.
   *
   * @param body Mutable profile fields.
   * @returns The refreshed producer record.
   */
  @TypedRoute.Put()
  public async update(
    @TypedBody() body: IBrokerDeskProducer.IUpdate,
  ): Promise<IBrokerDeskProducer> {
    throw new Error("Not implemented");
  }

  /**
   * List the sign-in sessions of the authenticated producer.
   *
   * @param body Pagination criteria.
   * @returns Paginated session history of the caller.
   */
  @TypedRoute.Patch("sessions")
  public async indexSessions(
    @TypedBody() body: IBrokerDeskProducerSession.IRequest,
  ): Promise<IPage<IBrokerDeskProducerSession.ISummary>> {
    throw new Error("Not implemented");
  }

  /**
   * List the provincial licences qualifying the authenticated producer.
   *
   * Supports compliance-style views: filtering by expired credentials or
   * licences expiring within a number of days surfaces what needs renewal
   * before quoting or binding business in a jurisdiction.
   *
   * @param body Pagination and compliance filter criteria.
   * @returns Paginated licence history of the caller.
   */
  @TypedRoute.Patch("licences")
  public async indexLicences(
    @TypedBody() body: IBrokerDeskProducerLicence.IRequest,
  ): Promise<IPage<IBrokerDeskProducerLicence.ISummary>> {
    throw new Error("Not implemented");
  }
}
