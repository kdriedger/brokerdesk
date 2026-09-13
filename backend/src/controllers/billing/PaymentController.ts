import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import { IBrokerDeskPayment } from "../../api/structures/BrokerDeskBilling";
import { IPage } from "../../api/structures/IPage";
import {
  createPayment,
  getPayment,
  patchPayments,
} from "../../providers/billing/payments";

@Controller("payments")
export class BrokerDeskBillingPaymentController {
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskPayment.IRequest,
  ): Promise<IPage<IBrokerDeskPayment.ISummary>> {
    return patchPayments(body);
  }

  @TypedRoute.Get(":paymentId")
  public async at(
    @TypedParam("paymentId") paymentId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskPayment> {
    return getPayment(paymentId);
  }

  @TypedRoute.Post("invoices/:invoiceId")
  public async create(
    @TypedParam("invoiceId") invoiceId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskPayment.ICreate,
  ): Promise<IBrokerDeskPayment> {
    return createPayment(invoiceId, body);
  }
}
