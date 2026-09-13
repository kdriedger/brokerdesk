import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import {
  IBrokerDeskDocumentTemplate,
  IPageIBrokerDeskDocumentTemplateISummary,
} from "../../api/structures/BrokerDeskDocument";
import {
  createDocumentTemplate,
  getDocumentTemplate,
  patchDocumentTemplates,
  renderDocumentTemplate,
  retireDocumentTemplate,
  updateDocumentTemplate,
} from "../../providers/documents/templates";

@Controller("document-templates")
export class BrokerDeskDocumentTemplateController {
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskDocumentTemplate.IRequest,
  ): Promise<IPageIBrokerDeskDocumentTemplateISummary> {
    return patchDocumentTemplates(body);
  }

  @TypedRoute.Get(":templateId")
  public async at(
    @TypedParam("templateId") templateId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskDocumentTemplate.IBody> {
    return getDocumentTemplate(templateId);
  }

  @TypedRoute.Post()
  public async create(
    @TypedBody() body: IBrokerDeskDocumentTemplate.ICreate,
  ): Promise<IBrokerDeskDocumentTemplate.IBody> {
    return createDocumentTemplate(body);
  }

  @TypedRoute.Put(":templateId")
  public async update(
    @TypedParam("templateId") templateId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskDocumentTemplate.IUpdate,
  ): Promise<IBrokerDeskDocumentTemplate.IBody> {
    return updateDocumentTemplate(templateId, body);
  }

  @TypedRoute.Delete(":templateId")
  public async erase(
    @TypedParam("templateId") templateId: string & tags.Format<"uuid">,
  ): Promise<void> {
    return retireDocumentTemplate(templateId);
  }

  @TypedRoute.Post(":templateId/render")
  public async render(
    @TypedParam("templateId") templateId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskDocumentTemplate.IRenderRequest,
  ): Promise<IBrokerDeskDocumentTemplate.IRendered> {
    return renderDocumentTemplate(templateId, body);
  }
}
