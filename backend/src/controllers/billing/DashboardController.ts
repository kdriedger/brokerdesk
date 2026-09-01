import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";

import { IBrokerDeskRevenueDashboard } from "../../api/structures/BrokerDeskBilling";

@Controller("dashboard/revenue")
export class BrokerDeskBillingDashboardController {
  /**
   * Revenue dashboard summary for the organization or a single producer.
   *
   * Aggregates commission due, bound premium MTD/YTD, the quote pipeline
   * by status, and accounts-receivable totals by invoice status. When a
   * producer filter is supplied the figures scope to that producer's book
   * of business; otherwise the summary covers the whole organization.
   *
   * @param body Optional producer scope filter.
   * @returns Revenue and receivable dashboard aggregates.
   */
  @TypedRoute.Post("summary")
  public async summary(
    @TypedBody() body: IBrokerDeskRevenueDashboard.IRequest,
  ): Promise<IBrokerDeskRevenueDashboard> {
    throw new Error("Not implemented");
  }
}
