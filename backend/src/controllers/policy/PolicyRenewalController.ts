import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import { IBrokerDeskPolicyRenewal } from "../../api/structures/BrokerDeskPolicy";
import { IPage } from "../../api/structures/IPage";
import {
  atRenewal,
  decideRenewal,
  indexRenewals,
  offerRenewal,
} from "../../providers/policy/renewal";

@Controller("policies/renewals")
export class BrokerDeskPolicyRenewalController {
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskPolicyRenewal.IRequest,
  ): Promise<IPage<IBrokerDeskPolicyRenewal.ISummary>> {
    return indexRenewals(body);
  }

  @TypedRoute.Get(":renewalId")
  public async at(
    @TypedParam("renewalId") renewalId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskPolicyRenewal> {
    return atRenewal(renewalId);
  }

  @TypedRoute.Post(":renewalId/offer")
  public async offer(
    @TypedParam("renewalId") renewalId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskPolicyRenewal.IOffer,
  ): Promise<IBrokerDeskPolicyRenewal> {
    return offerRenewal(renewalId, body);
  }

  @TypedRoute.Post(":renewalId/decide")
  public async decide(
    @TypedParam("renewalId") renewalId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskPolicyRenewal.IDecide,
  ): Promise<IBrokerDeskPolicyRenewal> {
    return decideRenewal(renewalId, body);
  }
}
