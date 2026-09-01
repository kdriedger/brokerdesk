import { tags } from "typia";
import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";

import {
  IBrokerDeskPolicyRenewal,
  ERenewalStatus,
} from "../../api/structures/BrokerDeskPolicy";
import { IPage } from "../../api/structures/IPage";

/**
 * Renewal controller managing the scheduled/offered/accepted lifecycle of
 * {@link IBrokerDeskPolicyRenewal renewal offers}.
 *
 * Accept and rewrite decisions generate the next-term policy; the prior
 * policy carries at most one active renewal record at a time.
 */
@Controller("policies/renewals")
export class BrokerDeskPolicyRenewalController {
  /**
   * List renewal offers with filtering and pagination.
   *
   * @param body Search criteria including status and prior/next policy filters.
   * @returns Paginated renewal summaries.
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskPolicyRenewal.IRequest,
  ): Promise<IPage<IBrokerDeskPolicyRenewal.ISummary>> {
    throw new Error("Not implemented");
  }

  /**
   * Retrieve a single renewal offer.
   *
   * @param renewalId Target renewal id.
   * @returns The renewal record.
   */
  @TypedRoute.Get(":renewalId")
  public async at(
    @TypedParam("renewalId") renewalId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskPolicyRenewal> {
    throw new Error("Not implemented");
  }

  /**
   * Extend renewal terms to the client, moving the record from scheduled to
   * offered and stamping the offered premium and offer timestamp.
   *
   * @param renewalId Target renewal id.
   * @param body Offer parameters.
   * @returns The updated renewal record.
   */
  @TypedRoute.Post(":renewalId/offer")
  public async offer(
    @TypedParam("renewalId") renewalId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskPolicyRenewal.IOffer,
  ): Promise<IBrokerDeskPolicyRenewal> {
    throw new Error("Not implemented");
  }

  /**
   * Resolve a renewal into a terminal state; accepted or rewritten decisions
   * generate the next-term policy transactionally.
   *
   * @param renewalId Target renewal id.
   * @param body Decision payload.
   * @returns The updated renewal record including the successor policy when generated.
   */
  @TypedRoute.Post(":renewalId/decide")
  public async decide(
    @TypedParam("renewalId") renewalId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskPolicyRenewal.IDecide,
  ): Promise<IBrokerDeskPolicyRenewal> {
    throw new Error("Not implemented");
  }
}
