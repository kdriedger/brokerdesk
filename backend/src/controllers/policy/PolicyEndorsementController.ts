import { tags } from "typia";
import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";

import { IBrokerDeskPolicyEndorsement } from "../../api/structures/BrokerDeskPolicy";
import { IPage } from "../../api/structures/IPage";

/**
 * Endorsement controller managing mid-term amendments nested under their
 * owning {@link IBrokerDeskPolicy policy}.
 *
 * Endorsements follow a draft-to-issued workflow: only issued endorsements
 * affect the in-force policy state and generate billing or commission
 * adjustments.
 */
@Controller("policies/:policyId/endorsements")
export class BrokerDeskPolicyEndorsementController {
  /**
   * List endorsements of a policy, optionally filtered by status.
   *
   * @param policyId Owning policy id.
   * @param body Search criteria.
   * @returns Paginated endorsement summaries.
   */
  @TypedRoute.Patch()
  public async index(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskPolicyEndorsement.IRequest,
  ): Promise<IPage<IBrokerDeskPolicyEndorsement.ISummary>> {
    throw new Error("Not implemented");
  }

  /**
   * Retrieve a single endorsement record.
   *
   * @param policyId Owning policy id.
   * @param endorsementId Target endorsement id.
   * @returns The endorsement record.
   */
  @TypedRoute.Get(":endorsementId")
  public async at(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedParam("endorsementId") endorsementId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskPolicyEndorsement> {
    throw new Error("Not implemented");
  }

  /**
   * Create a draft endorsement amending the policy mid-term.
   *
   * The effective date must fall within the parent policy term. The acting
   * CSR is attributed from the JWT identity, never from the request body.
   *
   * @param policyId Owning policy id.
   * @param body Endorsement creation payload.
   * @returns The newly created draft endorsement.
   */
  @TypedRoute.Post()
  public async create(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskPolicyEndorsement.ICreate,
  ): Promise<IBrokerDeskPolicyEndorsement> {
    throw new Error("Not implemented");
  }

  /**
   * Update a draft endorsement. Issued endorsements are immutable apart
   * from soft deletion.
   *
   * @param policyId Owning policy id.
   * @param endorsementId Target endorsement id.
   * @param body Fields to update; all optional.
   * @returns The updated endorsement.
   */
  @TypedRoute.Put(":endorsementId")
  public async update(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedParam("endorsementId") endorsementId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskPolicyEndorsement.IUpdate,
  ): Promise<IBrokerDeskPolicyEndorsement> {
    throw new Error("Not implemented");
  }

  /**
   * Issue (finalize) a draft endorsement, applying its premium and fee
   * deltas to the in-force policy.
   *
   * @param policyId Owning policy id.
   * @param endorsementId Target endorsement id.
   * @returns The issued endorsement.
   */
  @TypedRoute.Post(":endorsementId/issue")
  public async issue(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedParam("endorsementId") endorsementId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskPolicyEndorsement> {
    throw new Error("Not implemented");
  }
}
