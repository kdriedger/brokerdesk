import { tags } from "typia";
import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";

import { IBrokerDeskPolicyDocument } from "../../api/structures/BrokerDeskPolicyDocument";
import { IPage } from "../../api/structures/IPage";

/**
 * Policy document controller exposing generated and attached documents
 * (schedules, certificates/COI, full policy PDF placeholders) nested under
 * their owning {@link IBrokerDeskPolicy policy}.
 */
@Controller("policies/:policyId/documents")
export class BrokerDeskPolicyDocumentController {
  /**
   * List documents belonging to a policy.
   *
   * @param policyId Owning policy id.
   * @param body Search and pagination criteria.
   * @returns Paginated document summaries.
   */
  @TypedRoute.Patch()
  public async index(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskPolicyDocument.IRequest,
  ): Promise<IPage<IBrokerDeskPolicyDocument.ISummary>> {
    throw new Error("Not implemented");
  }

  /**
   * Retrieve a single policy document record.
   *
   * @param policyId Owning policy id.
   * @param documentId Target document id.
   * @returns The document record.
   */
  @TypedRoute.Get(":documentId")
  public async at(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedParam("documentId") documentId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskPolicyDocument> {
    throw new Error("Not implemented");
  }
}
