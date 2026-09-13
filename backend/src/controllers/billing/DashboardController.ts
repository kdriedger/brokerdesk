import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";

import { IBrokerDeskRevenueDashboard } from "../../api/structures/BrokerDeskBilling";
import { postRevenueDashboardSummary } from "../../providers/billing/dashboard";

@Controller("dashboard/revenue")
export class BrokerDeskBillingDashboardController {
  @TypedRoute.Post("summary")
  public async summary(
    @TypedBody() body: IBrokerDeskRevenueDashboard.IRequest,
  ): Promise<IBrokerDeskRevenueDashboard> {
    return postRevenueDashboardSummary(body);
  }
}
