import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import {
  IBrokerDeskCoverageItem,
  IPageIBrokerDeskCoverageItemISummary,
} from "../../api/structures/BrokerDeskCatalogueProduct";
import {
  deleteCoverageItem,
  invertCoverageItem,
  patchCoverageItems,
  postCoverageItems,
  putCoverageItem,
} from "../../providers/catalogue/coverageItem";

/**
 * Product coverage-item administration controller.
 *
 * Coverage items are subsidiary to products and are managed exclusively
 * through the parent product's surface. Downstream quote lines and policy
 * coverage schedules snapshot these catalogue values at pricing and issuance
 * time.
 */
@Controller("products/:productId/coverage-items")
export class BrokerDeskCatalogueCoverageItemController {
  /**
   * List coverage items of a product with pagination and filters.
   *
   * @param productId Parent product id.
   * @param body Pagination and filter criteria.
   * @returns Paginated coverage-item summary list.
   */
  @TypedRoute.Patch()
  public async index(
    @TypedParam("productId") productId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskCoverageItem.IRequest,
  ): Promise<IPageIBrokerDeskCoverageItemISummary> {
    return patchCoverageItems(productId, body);
  }

  /**
   * Create a coverage item under a product.
   *
   * ADMIN-only operation; the code must be unique within the parent product.
   *
   * @param productId Parent product id.
   * @param body Coverage-item creation attributes.
   * @returns The newly created coverage item.
   */
  @TypedRoute.Post()
  public async create(
    @TypedParam("productId") productId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskCoverageItem.ICreate,
  ): Promise<IBrokerDeskCoverageItem> {
    return postCoverageItems(productId, body);
  }

  /**
   * Fetch a coverage item with its parent product context.
   *
   * @param productId Parent product id.
   * @param coverageItemId Target coverage-item id.
   * @returns The coverage item with parent context.
   */
  @TypedRoute.Get(":coverageItemId/invert")
  public async invert(
    @TypedParam("productId") productId: string & tags.Format<"uuid">,
    @TypedParam("coverageItemId") coverageItemId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskCoverageItem.IInvert> {
    return invertCoverageItem(productId, coverageItemId);
  }

  /**
   * Update a coverage item.
   *
   * Edits affect only future selections; issued quote lines and policy
   * coverage schedules retain their frozen copies.
   *
   * @param productId Parent product id.
   * @param coverageItemId Target coverage-item id.
   * @param body Fields to update.
   * @returns The updated coverage item.
   */
  @TypedRoute.Put(":coverageItemId")
  public async update(
    @TypedParam("productId") productId: string & tags.Format<"uuid">,
    @TypedParam("coverageItemId") coverageItemId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskCoverageItem.IUpdate,
  ): Promise<IBrokerDeskCoverageItem> {
    return putCoverageItem(productId, coverageItemId, body);
  }

  /**
   * Delete a coverage item catalogue entry.
   *
   * @param productId Parent product id.
   * @param coverageItemId Target coverage-item id.
   */
  @TypedRoute.Delete(":coverageItemId")
  public async erase(
    @TypedParam("productId") productId: string & tags.Format<"uuid">,
    @TypedParam("coverageItemId") coverageItemId: string & tags.Format<"uuid">,
  ): Promise<void> {
    return deleteCoverageItem(productId, coverageItemId);
  }
}
