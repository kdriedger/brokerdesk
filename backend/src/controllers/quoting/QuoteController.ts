import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import { IPage } from "../../api/structures/IPage";
import {
  IBrokerDeskQuote,
  IBrokerDeskQuoteLine,
} from "../../api/structures/BrokerDeskQuoting";
import {
  deleteQuote,
  getQuote,
  patchQuotes,
  postQuoteBind,
  postQuotePrice,
  postQuotes,
  putQuote,
} from "../../providers/quoting/quotes";

/**
 * Controller for the comparative quotation pipeline: create, browse,
 * price, and bind producer-owned quotes for organization clients.
 */
@Controller("quotes")
export class BrokerDeskQuotingQuoteController {
  /**
   * List quotations matching search and filter criteria.
   *
   * Returns a paginated page of quote summaries scoped to the caller's
   * organization, optionally filtered by client, producer, status,
   * expiry window, or free-text search.
   *
   * @param body Search and pagination criteria.
   * @returns Paginated quote summaries.
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskQuote.IRequest,
  ): Promise<IPage<IBrokerDeskQuote.ISummary>> {
    return patchQuotes(body);
  }

  /**
   * Create a new draft quotation for a client.
   *
   * The creating producer is resolved from the JWT identity; optional
   * initial comparative lines may be attached in the same request.
   *
   * @param body Quote creation payload.
   * @returns The newly created quotation.
   */
  @TypedRoute.Post()
  public async create(
    @TypedBody() body: IBrokerDeskQuote.ICreate,
  ): Promise<IBrokerDeskQuote> {
    return postQuotes(body);
  }

  /**
   * Fetch one quotation in full detail.
   *
   * Loads the quote with its comparative lines and carrier submissions,
   * enforcing tenant isolation on the lookup.
   *
   * @param quoteId Identifier of the target quotation.
   * @returns The full quotation record.
   */
  @TypedRoute.Get(":quoteId")
  public async at(
    @TypedParam("quoteId") quoteId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskQuote> {
    return getQuote(quoteId);
  }

  /**
   * Update a quotation's mutable fields or workflow status.
   *
   * Status transitions follow the mandated flow draft -> priced ->
   * submitted -> bound | declined | expired.
   *
   * @param quoteId Identifier of the target quotation.
   * @param body Fields to update, all optional.
   * @returns The updated quotation.
   */
  @TypedRoute.Put(":quoteId")
  public async update(
    @TypedParam("quoteId") quoteId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskQuote.IUpdate,
  ): Promise<IBrokerDeskQuote> {
    return putQuote(quoteId, body);
  }

  /**
   * Soft-delete a quotation, preserving its rows for audit history.
   *
   * @param quoteId Identifier of the target quotation.
   */
  @TypedRoute.Delete(":quoteId")
  public async erase(
    @TypedParam("quoteId") quoteId: string & tags.Format<"uuid">,
  ): Promise<void> {
    return deleteQuote(quoteId);
  }

  /**
   * Calculate premiums, broker fees, taxes, and totals for the quote.
   *
   * Uses each attached product's formula configuration where available
   * and always permits manual overrides per line; refreshes the quote's
   * CAD totals and moves a draft quote to priced status.
   *
   * @param quoteId Identifier of the target quotation.
   * @param body Per-line pricing inputs with optional manual overrides.
   * @returns Recalculated totals and refreshed line summaries.
   */
  @TypedRoute.Post(":quoteId/price")
  public async price(
    @TypedParam("quoteId") quoteId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskQuote.IPrice,
  ): Promise<IBrokerDeskQuote.IPriceResult> {
    return postQuotePrice(quoteId, body);
  }

  /**
   * Bind the accepted quote line into a new policy, transactionally.
   *
   * Marks the chosen line accepted (clearing siblings), transitions the
   * quote to bound status, and creates the originating policy with
   * coverage schedule lines mirrored from the quote line's coverage
   * selections. Idempotency is guaranteed by rejecting re-binding an
   * already-bound quote.
   *
   * @param quoteId Identifier of the target quotation.
   * @param body The accepted quote line identifier.
   * @returns The created policy and the updated quote.
   */
  @TypedRoute.Post(":quoteId/bind")
  public async bind(
    @TypedParam("quoteId") quoteId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskQuote.IBind,
  ): Promise<IBrokerDeskQuote.IBindResult> {
    return postQuoteBind(quoteId, body);
  }
}
