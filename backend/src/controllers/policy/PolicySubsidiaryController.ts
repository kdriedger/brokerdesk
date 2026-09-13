import { TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import {
  IBrokerDeskPolicyCancellation,
  IBrokerDeskPolicyCoverage,
} from "../../api/structures/BrokerDeskPolicy";
import { IPage } from "../../api/structures/IPage";
import {
  atCancellation,
  atCoverage,
  indexCancellations,
  indexCoverages,
} from "../../providers/policy/subsidiary";

@Controller("policies/:policyId")
export class BrokerDeskPolicySubsidiaryController {
  @TypedRoute.Get("coverages")
  public async indexCoverages(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
  ): Promise<IPage<IBrokerDeskPolicyCoverage.ISummary>> {
    return indexCoverages(policyId);
  }

  @TypedRoute.Get("coverages/:coverageId")
  public async atCoverage(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedParam("coverageId") coverageId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskPolicyCoverage> {
    return atCoverage(policyId, coverageId);
  }

  @TypedRoute.Get("cancellations")
  public async indexCancellations(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
  ): Promise<IPage<IBrokerDeskPolicyCancellation.ISummary>> {
    return indexCancellations(policyId);
  }

  @TypedRoute.Get("cancellations/:cancellationId")
  public async atCancellation(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedParam("cancellationId") cancellationId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskPolicyCancellation> {
    return atCancellation(policyId, cancellationId);
  }
}
