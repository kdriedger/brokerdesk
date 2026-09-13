import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import {
  IBrokerDeskDocument,
  IPageIBrokerDeskDocumentISummary,
} from "../../api/structures/BrokerDeskDocument";
import {
  createDocument,
  downloadDocument,
  eraseDocument,
  getDocument,
  patchDocuments,
  replaceDocument,
} from "../../providers/documents/documents";

@Controller("documents")
export class BrokerDeskDocumentController {
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskDocument.IRequest,
  ): Promise<IPageIBrokerDeskDocumentISummary> {
    return patchDocuments(body);
  }

  @TypedRoute.Get(":documentId")
  public async at(
    @TypedParam("documentId") documentId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskDocument.IDetail> {
    return getDocument(documentId);
  }

  @TypedRoute.Post()
  public async create(
    @TypedBody() body: IBrokerDeskDocument.ICreate,
  ): Promise<IBrokerDeskDocument.ISummary> {
    return createDocument(body);
  }

  @TypedRoute.Put(":documentId")
  public async update(
    @TypedParam("documentId") documentId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskDocument.IReplace,
  ): Promise<IBrokerDeskDocument.ISummary> {
    return replaceDocument(documentId, body);
  }

  @TypedRoute.Delete(":documentId")
  public async erase(
    @TypedParam("documentId") documentId: string & tags.Format<"uuid">,
  ): Promise<void> {
    return eraseDocument(documentId);
  }

  @TypedRoute.Get(":documentId/download")
  public async download(
    @TypedParam("documentId") documentId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskDocument.IDownload> {
    return downloadDocument(documentId);
  }
}
