import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import { IBrokerDeskPolicyEndorsement } from "../../api/structures/BrokerDeskPolicy";
import { IPage } from "../../api/structures/IPage";
import {
  atEndorsement,
  createEndorsement,
  indexEndorsements,
  issueEndorsement,
  updateEndorsement,
} from "../../providers/policy/endorsement";

@Controller("policies/:policyId/endorsements")
export class BrokerDeskPolicyEndorsementController {
  @TypedRoute.Patch()
  public async index(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskPolicyEndorsement.IRequest,
  ): Promise<IPage<IBrokerDeskPolicyEndorsement.ISummary>> {
    return indexEndorsements(policyId, body);
  }

  @TypedRoute.Get(":endorsementId")
  public async at(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedParam("endorsementId") endorsementId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskPolicyEndorsement> {
    return atEndorsement(policyId, endorsementId);
  }

  @TypedRoute.Post()
  public async create(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskPolicyEndorsement.ICreate,
  ): Promise<IBrokerDeskPolicyEndorsement> {
    return createEndorsement(policyId, body);
  }

  @TypedRoute.Put(":endorsementId")
  public async update(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedParam("endorsementId") endorsementId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskPolicyEndorsement.IUpdate,
  ): Promise<IBrokerDeskPolicyEndorsement> {
    return updateEndorsement(policyId, endorsementId, body);
  }

  @TypedRoute.Post(":endorsementId/issue")
  public async issue(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedParam("endorsementId") endorsementId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskPolicyEndorsement> {
    return issueEndorsement(policyId, endorsementId);
  }
}
