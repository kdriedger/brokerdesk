import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import { IBrokerDeskPolicyDocument } from "../../api/structures/BrokerDeskPolicyDocument";
import { IPage } from "../../api/structures/IPage";
import {
  atPolicyDocument,
  indexPolicyDocuments,
} from "../../providers/policy/document";

@Controller("policies/:policyId/documents")
export class BrokerDeskPolicyDocumentController {
  @TypedRoute.Patch()
  public async index(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskPolicyDocument.IRequest,
  ): Promise<IPage<IBrokerDeskPolicyDocument.ISummary>> {
    return indexPolicyDocuments(policyId, body);
  }

  @TypedRoute.Get(":documentId")
  public async at(
    @TypedParam("policyId") policyId: string & tags.Format<"uuid">,
    @TypedParam("documentId") documentId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskPolicyDocument> {
    return atPolicyDocument(policyId, documentId);
  }
}
