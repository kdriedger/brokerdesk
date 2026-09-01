import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import { IBrokerDeskQuoteLine } from "../../api/structures/BrokerDeskQuoting";

/**
 * Controller for comparative quote lines, managed strictly within their
 * owning quotation's lifecycle.
 */
@Controller("quotes/:quoteId/lines")
export class BrokerDeskQuotingQuoteLineController {
  /**
   * Attach a comparative product-option line to a quotation.
   *
   * Validates product eligibility against the parent quote's client
   * province, type, and language before attaching; carrier name and
   * code snapshots are frozen from the product's carrier.
   *
   * @param quoteId Identifier of the owning quotation.
   * @param body Line creation payload.
   * @returns The created quote line.
   */
  @TypedRoute.Post()
  public async create(
    @TypedParam("quoteId") quoteId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskQuoteLine.ICreate,
  ): Promise<IBrokerDeskQuoteLine> {
    throw new Error("Not implemented");
  }

  /**
   * Fetch one comparative line of a quotation in full detail.
   *
   * @param quoteId Identifier of the owning quotation.
   * @param lineId Identifier of the target quote line.
   * @returns The quote line record.
   */
  @TypedRoute.Get(":lineId")
  public async at(
    @TypedParam("quoteId") quoteId: string & tags.Format<"uuid">,
    @TypedParam("lineId") lineId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskQuoteLine> {
    throw new Error("Not implemented");
  }

  /**
   * Update a comparative line's coverage selections, rating inputs, or
   * priced amounts, or toggle its accepted flag.
   *
   * @param quoteId Identifier of the owning quotation.
   * @param lineId Identifier of the target quote line.
   * @param body Fields to update, all optional.
   * @returns The updated quote line.
   */
  @TypedRoute.Put(":lineId")
  public async update(
    @TypedParam("quoteId") quoteId: string & tags.Format<"uuid">,
    @TypedParam("lineId") lineId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskQuoteLine.IUpdate,
  ): Promise<IBrokerDeskQuoteLine> {
    throw new Error("Not implemented");
  }

  /**
   * Remove a comparative line from its quotation.
   *
   * @param quoteId Identifier of the owning quotation.
   * @param lineId Identifier of the target quote line.
   */
  @TypedRoute.Delete(":lineId")
  public async erase(
    @TypedParam("quoteId") quoteId: string & tags.Format<"uuid">,
    @TypedParam("lineId") lineId: string & tags.Format<"uuid">,
  ): Promise<void> {
    throw new Error("Not implemented");
  }
}
