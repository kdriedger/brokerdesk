import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import { IBrokerDeskProducerLicence } from "../../api/structures/BrokerDeskActorsProducer";
import { IPage } from "../../api/structures/IPage";
import {
  deleteAdminProducerLicences,
  getAdminProducerLicencesAt,
  patchAdminProducerLicences,
  postAdminProducerLicences,
  putAdminProducerLicences,
} from "../../providers/admin/producerLicences";

/**
 * Admin-managed provincial licence roster of a producer.
 *
 * Administrators (and CSRs) maintain the qualifications verifying a
 * producer's legal authority to sell insurance per province. This surface is
 * also the compliance-alert source: indexes expose expired credentials and
 * licences expiring within a window, feeding notifications and dashboards.
 */
@Controller("admin/producers/:producerId/licences")
export class BrokerDeskActorsAdminProducerLicencesController {
  /**
   * List the licences held by a producer.
   *
   * @param producerId Parent producer identifier.
   * @param body Search, filter, and pagination criteria including compliance views.
   * @returns Paginated licence summaries.
   */
  @TypedRoute.Patch()
  public async index(
    @TypedParam("producerId") producerId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskProducerLicence.IRequest,
  ): Promise<IPage<IBrokerDeskProducerLicence.ISummary>> {
    return patchAdminProducerLicences(producerId, body);
  }

  /**
   * Register a provincial licence for a producer.
   *
   * @param producerId Parent producer identifier.
   * @param body Licence fields (province, type, number, validity, status).
   * @returns The newly registered licence.
   */
  @TypedRoute.Post()
  public async create(
    @TypedParam("producerId") producerId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskProducerLicence.ICreate,
  ): Promise<IBrokerDeskProducerLicence> {
    return postAdminProducerLicences(producerId, body);
  }

  /**
   * Retrieve one licence in detail.
   *
   * @param producerId Parent producer identifier.
   * @param licenceId Target licence identifier.
   * @returns The licence record.
   */
  @TypedRoute.Get(":licenceId")
  public async at(
    @TypedParam("producerId") producerId: string & tags.Format<"uuid">,
    @TypedParam("licenceId") licenceId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskProducerLicence> {
    return getAdminProducerLicencesAt(producerId, licenceId);
  }

  /**
   * Update a licence record.
   *
   * Renewals extend the validity window; suspensions and revocations are
   * recorded through the status field.
   *
   * @param producerId Parent producer identifier.
   * @param licenceId Target licence identifier.
   * @param body Mutable licence fields.
   * @returns The updated licence record.
   */
  @TypedRoute.Put(":licenceId")
  public async update(
    @TypedParam("producerId") producerId: string & tags.Format<"uuid">,
    @TypedParam("licenceId") licenceId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskProducerLicence.IUpdate,
  ): Promise<IBrokerDeskProducerLicence> {
    return putAdminProducerLicences(producerId, licenceId, body);
  }

  /**
   * Soft-delete a licence record.
   *
   * Withdrawn licences remain available for historical compliance auditing.
   *
   * @param producerId Parent producer identifier.
   * @param licenceId Target licence identifier.
   */
  @TypedRoute.Delete(":licenceId")
  public async erase(
    @TypedParam("producerId") producerId: string & tags.Format<"uuid">,
    @TypedParam("licenceId") licenceId: string & tags.Format<"uuid">,
  ): Promise<void> {
    return deleteAdminProducerLicences(producerId, licenceId);
  }
}
