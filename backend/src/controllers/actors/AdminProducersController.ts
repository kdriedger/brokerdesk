import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import { IBrokerDeskProducer } from "../../api/structures/BrokerDeskActorsProducer";
import { IPage } from "../../api/structures/IPage";
import {
  deleteAdminProducers,
  getAdminProducersAt,
  patchAdminProducers,
  postAdminProducers,
  putAdminProducers,
} from "../../providers/admin/producers";

/**
 * Admin-managed producer account roster.
 *
 * Administrators provision producers by invitation, edit profiles, and flip
 * activation standings inside their own organization. Deactivation forces
 * termination of every live session of the producer while historical
 * attributions remain intact.
 */
@Controller("admin/producers")
export class BrokerDeskActorsAdminProducersController {
  /**
   * List producer accounts of the caller's organization.
   *
   * @param body Search, filter, and pagination criteria.
   * @returns Paginated producer summaries.
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskProducer.IRequest,
  ): Promise<IPage<IBrokerDeskProducer.ISummary>> {
    return patchAdminProducers(body);
  }

  /**
   * Invite a new producer into the caller's organization.
   *
   * The invited account reaches first sign-in through the email verification
   * setup path.
   *
   * @param body Invitation body (email, display name, activation standing).
   * @returns The newly provisioned producer.
   */
  @TypedRoute.Post()
  public async create(
    @TypedBody() body: IBrokerDeskProducer.ICreate,
  ): Promise<IBrokerDeskProducer> {
    return postAdminProducers(body);
  }

  /**
   * Retrieve one producer account in detail.
   *
   * @param producerId Target producer identifier.
   * @returns The producer record with licences and sessions.
   */
  @TypedRoute.Get(":producerId")
  public async at(
    @TypedParam("producerId") producerId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskProducer> {
    return getAdminProducersAt(producerId);
  }

  /**
   * Update a producer account.
   *
   * Deactivation terminates the producer's open sessions immediately.
   *
   * @param producerId Target producer identifier.
   * @param body Mutable account fields.
   * @returns The updated producer record.
   */
  @TypedRoute.Put(":producerId")
  public async update(
    @TypedParam("producerId") producerId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskProducer.IUpdate,
  ): Promise<IBrokerDeskProducer> {
    return putAdminProducers(producerId, body);
  }

  /**
   * Soft-delete a producer account.
   *
   * The row is retained so every owned record stays attributable while the
   * account disappears from listings and assignment choices.
   *
   * @param producerId Target producer identifier.
   */
  @TypedRoute.Delete(":producerId")
  public async erase(
    @TypedParam("producerId") producerId: string & tags.Format<"uuid">,
  ): Promise<void> {
    return deleteAdminProducers(producerId);
  }
}
