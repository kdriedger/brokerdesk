import { tags } from "typia";
import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";

import {
  IBrokerDeskPolicy,
  IBrokerDeskPolicyCoverage,
  IBrokerDeskPolicyCancellation,
} from "../../api/structures/BrokerDeskPolicy";
import { IPage } from "../../api/structures/IPage";

/**
 * Subsidiary controller exposing the coverage schedule lines and
 * cancellation records nested under their owning
 * {@link IBrokerDeskPolicy policy}.
 */
@Controller("policies/:policyId")
export class BrokerDeskPolicySubsidiaryController {
  /**
   * List active coverage schedule lines of a policy.
   *
   * @param policyId Owning policy id.
   * @returns Paginated coverage summaries.
   */
  @TypedRoute.Get("coverages")
  public async indexCoverages(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
  ): Promise<IPage<IBrokerDeskPolicyCoverage.ISummary>> {
    throw new Error("Not implemented");
  }

  /**
   * Retrieve a single coverage schedule line.
   *
   * @param policyId Owning policy id.
   * @param coverageId Target coverage id.
   * @returns The coverage line.
   */
  @TypedRoute.Get("coverages/:coverageId")
  public async atCoverage(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedParam("coverageId") coverageId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskPolicyCoverage> {
    throw new Error("Not implemented");
  }

  /**
   * List historical cancellation records of a policy.
   *
   * A policy may accumulate several cancellations over its lifetime when
   * reinstatements occur between them.
   *
   * @param policyId Owning policy id.
   * @returns Paginated cancellation summaries.
   */
  @TypedRoute.Get("cancellations")
  public async indexCancellations(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
  ): Promise<IPage<IBrokerDeskPolicyCancellation.ISummary>> {
    throw new Error("Not implemented");
  }

  /**
   * Retrieve a single cancellation record including its reinstatement when present.
   *
   * @param policyId Owning policy id.
   * @param cancellationId Target cancellation id.
   * @returns The cancellation record.
   */
  @TypedRoute.Get("cancellations/:cancellationId")
  public async atCancellation(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedParam("cancellationId") cancellationId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskPolicyCancellation> {
    throw new Error("Not implemented");
  }
}
