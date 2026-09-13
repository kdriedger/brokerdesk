import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import {
  IBrokerDeskDocumentVersion,
  IPageIBrokerDeskDocumentVersionISummary,
} from "../../api/structures/BrokerDeskDocument";
import {
  getDocumentVersion,
  patchDocumentVersions,
} from "../../providers/documents/versions";

@Controller("documents/:documentId/versions")
export class BrokerDeskDocumentVersionController {
  @TypedRoute.Patch()
  public async index(
    @TypedParam("documentId") documentId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskDocumentVersion.IRequest,
  ): Promise<IPageIBrokerDeskDocumentVersionISummary> {
    return patchDocumentVersions(documentId, body);
  }

  @TypedRoute.Get(":versionId")
  public async at(
    @TypedParam("documentId") documentId: string & tags.Format<"uuid">,
    @TypedParam("versionId") versionId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskDocumentVersion.ISummary> {
    return getDocumentVersion(documentId, versionId);
  }
}
