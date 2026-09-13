import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import { IBrokerDeskCommission } from "../../api/structures/BrokerDeskBilling";
import { IPage } from "../../api/structures/IPage";
import {
  createCommission,
  eraseCommission,
  getCommission,
  invertCommission,
  patchCommissions,
  patchMyCommissions,
  updateCommission,
} from "../../providers/billing/commissions";

@Controller("commissions")
export class BrokerDeskBillingCommissionController {
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskCommission.IRequest,
  ): Promise<IPage<IBrokerDeskCommission.ISummary>> {
    return patchCommissions(body);
  }

  @TypedRoute.Get(":commissionId")
  public async at(
    @TypedParam("commissionId") commissionId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskCommission> {
    return getCommission(commissionId);
  }

  @TypedRoute.Post()
  public async create(
    @TypedBody() body: IBrokerDeskCommission.ICreate,
  ): Promise<IBrokerDeskCommission> {
    return createCommission(body);
  }

  @TypedRoute.Put(":commissionId")
  public async update(
    @TypedParam("commissionId") commissionId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskCommission.IUpdate,
  ): Promise<IBrokerDeskCommission> {
    return updateCommission(commissionId, body);
  }

  @TypedRoute.Delete(":commissionId")
  public async erase(
    @TypedParam("commissionId") commissionId: string & tags.Format<"uuid">,
  ): Promise<void> {
    return eraseCommission(commissionId);
  }

  @TypedRoute.Get(":commissionId/invert")
  public async invert(
    @TypedParam("commissionId") commissionId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskCommission.IInvert> {
    return invertCommission(commissionId);
  }

  @TypedRoute.Patch("me")
  public async myIndex(
    @TypedBody() body: IBrokerDeskCommission.IRequest,
  ): Promise<IPage<IBrokerDeskCommission.ISummary>> {
    return patchMyCommissions(body);
  }
}
