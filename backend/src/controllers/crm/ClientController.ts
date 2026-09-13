import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import {
  IBrokerDeskClient,
  IBrokerDeskClientDocument,
  IBrokerDeskClientTag,
  IPageIBrokerDeskClientSummary,
} from "../../api/structures/BrokerDeskCrmClient";
import {
  deleteCrmClient,
  deleteCrmClientTag,
  getCrmClient,
  getCrmClientDocuments,
  getCrmClientTags,
  getCrmClientTimeline,
  patchCrmClients,
  postCrmClient,
  postCrmClientDocument,
  postCrmClientTag,
  putCrmClient,
} from "../../providers/crm/clients";

/**
 * CRM client controller covering the client book of business: listing and
 * searching clients, individual read, create, update, soft-delete, tag
 * management, document attachments, and the chronological client timeline.
 *
 * All queries are tenant-scoped to the acting user's organization; producers
 * see their own book plus shared servicing views per role rules.
 */
@Controller("clients")
export class BrokerDeskCrmClientController {
  /**
   * List and filter clients of the acting organization.
   *
   * Supports pagination, free-text name search, and filters by status,
   * producer, province, client type, and tags. Results are paginated client
   * summaries without heavyweight has-many aggregates.
   *
   * @param body Search and filter criteria.
   * @returns Paginated client summaries.
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskClient.IRequest,
  ): Promise<IPageIBrokerDeskClientSummary> {
    return patchCrmClients(body);
  }

  /**
   * Read one client in full detail.
   *
   * Returns every public column plus the assigned producer, owned addresses,
   * contact directory, and tag assignments.
   *
   * @param clientId Primary key of the target client.
   * @returns Full client detail.
   */
  @TypedRoute.Get(":clientId")
  public async at(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskClient> {
    return getCrmClient(clientId);
  }

  /**
   * Create a new client.
   *
   * Accepts individual or business clients, optional initial tags, and an
   * initial contact directory for business clients. The owning organization
   * and assigned producer are resolved from the acting JWT identity unless an
   * authorized producer override applies.
   *
   * @param body Client creation payload.
   * @returns The newly created client in full detail.
   */
  @TypedRoute.Post()
  public async create(
    @TypedBody() body: IBrokerDeskClient.ICreate,
  ): Promise<IBrokerDeskClient> {
    return postCrmClient(body);
  }

  /**
   * Update an existing client.
   *
   * Mutable business fields only; ownership and organization scoping never
   * change here.
   *
   * @param clientId Primary key of the target client.
   * @param body Fields to update, all optional.
   * @returns The updated client in full detail.
   */
  @TypedRoute.Put(":clientId")
  public async update(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskClient.IUpdate,
  ): Promise<IBrokerDeskClient> {
    return putCrmClient(clientId, body);
  }

  /**
   * Soft-delete a client.
   *
   * Retains the row for historical attribution while hiding the client from
   * active listings and blocking further business operations.
   *
   * @param clientId Primary key of the target client.
   * @returns Nothing.
   */
  @TypedRoute.Delete(":clientId")
  public async erase(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
  ): Promise<void> {
    return deleteCrmClient(clientId);
  }

  /**
   * Retrieve the chronological timeline of a client.
   *
   * Mixes activities, tasks, quotes, and policies into one chronology ordered
   * by their occurrence timestamps, serving as the relationship's shared
   * institutional memory.
   *
   * @param clientId Primary key of the target client.
   * @returns The client summary and its chronological entries.
   */
  @TypedRoute.Get(":clientId/timeline")
  public async timeline(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskClient.ITimeline> {
    return getCrmClientTimeline(clientId);
  }

  /**
   * List all active tags assigned to a client.
   *
   * @param clientId Primary key of the target client.
   * @returns The client's tag assignments.
   */
  @TypedRoute.Get(":clientId/tags")
  public async tags(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskClientTag[]> {
    return getCrmClientTags(clientId);
  }

  /**
   * Attach a tag to a client.
   *
   * Tag values are normalized (trimmed casing/whitespace); exact duplicates
   * per client are rejected.
   *
   * @param clientId Primary key of the target client.
   * @param body Tag creation payload.
   * @returns The created tag assignment.
   */
  @TypedRoute.Post(":clientId/tags")
  public async createTag(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
    @TypedBody() body: { value: string },
  ): Promise<IBrokerDeskClientTag> {
    return postCrmClientTag(clientId, body);
  }

  /**
   * Remove a tag from a client by soft-deleting the assignment row.
   *
   * @param clientId Primary key of the target client.
   * @param tagId Primary key of the tag assignment.
   * @returns Nothing.
   */
  @TypedRoute.Delete(":clientId/tags/:tagId")
  public async eraseTag(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
    @TypedParam("tagId") tagId: string & tags.Format<"uuid">,
  ): Promise<void> {
    return deleteCrmClientTag(clientId, tagId);
  }

  /**
   * List documents attached to a client.
   *
   * @param clientId Primary key of the target client.
   * @returns Document metadata records.
   */
  @TypedRoute.Get(":clientId/documents")
  public async documents(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskClientDocument[]> {
    return getCrmClientDocuments(clientId);
  }

  /**
   * Upload (register) a document against a client.
   *
   * Stores metadata plus the storage key of the uploaded content and records
   * the uploading staff member from the JWT.
   *
   * @param clientId Primary key of the target client.
   * @param body Document registration payload.
   * @returns The created document metadata.
   */
  @TypedRoute.Post(":clientId/documents")
  public async createDocument(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
    @TypedBody() body: {
      kind: string;
      filename: string;
      mime_type: string;
      size: number;
      storage_path: string;
      checksum?: string | null;
    },
  ): Promise<IBrokerDeskClientDocument> {
    return postCrmClientDocument(clientId, body);
  }
}
