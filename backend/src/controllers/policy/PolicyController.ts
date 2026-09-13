import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import {
  IBrokerDeskPolicy,
  IBrokerDeskPolicyCancellation,
  IBrokerDeskPolicyReinstatement,
} from "../../api/structures/BrokerDeskPolicy";
import { IBrokerDeskPolicyRenewalCandidate } from "../../api/structures/BrokerDeskPolicyRenewalCandidate";
import { IPage } from "../../api/structures/IPage";
import {
  atPolicy,
  cancelPolicy,
  createPolicy,
  erasePolicy,
  indexPolicies,
  issuePolicy,
  reinstatePolicy,
  renewalCandidates as listRenewalCandidates,
  updatePolicy,
} from "../../providers/policy/policy";

@Controller("policies")
export class BrokerDeskPolicyPolicyController {
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskPolicy.IRequest,
  ): Promise<IPage<IBrokerDeskPolicy.ISummary>> {
    return indexPolicies(body);
  }

  @TypedRoute.Get(":policyId")
  public async at(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskPolicy> {
    return atPolicy(policyId);
  }

  @TypedRoute.Post()
  public async create(
    @TypedBody() body: IBrokerDeskPolicy.ICreate,
  ): Promise<IBrokerDeskPolicy> {
    return createPolicy(body);
  }

  @TypedRoute.Put(":policyId")
  public async update(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskPolicy.IUpdate,
  ): Promise<IBrokerDeskPolicy> {
    return updatePolicy(policyId, body);
  }

  @TypedRoute.Delete(":policyId")
  public async erase(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
  ): Promise<void> {
    return erasePolicy(policyId);
  }

  @TypedRoute.Post(":policyId/issue")
  public async issue(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskPolicy.IIssue,
  ): Promise<IBrokerDeskPolicy> {
    return issuePolicy(policyId, body);
  }

  @TypedRoute.Post(":policyId/cancel")
  public async cancel(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskPolicyCancellation.ICreate,
  ): Promise<IBrokerDeskPolicy.ICancellationResult> {
    return cancelPolicy(policyId, body);
  }

  @TypedRoute.Post(":policyId/reinstate")
  public async reinstate(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskPolicyReinstatement.ICreate,
  ): Promise<IBrokerDeskPolicy.IReinstatementResult> {
    return reinstatePolicy(policyId, body);
  }

  @TypedRoute.Patch("renewal-candidates")
  public async renewalCandidates(
    @TypedBody() body: IBrokerDeskPolicyRenewalCandidate.IRequest,
  ): Promise<IPage<IBrokerDeskPolicyRenewalCandidate>> {
    return listRenewalCandidates(body);
  }
}
