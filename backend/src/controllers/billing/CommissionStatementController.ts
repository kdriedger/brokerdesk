import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import { IBrokerDeskCommissionStatement } from "../../api/structures/BrokerDeskBilling";
import { IPage } from "../../api/structures/IPage";
import {
  createCommissionStatement,
  getCommissionStatement,
  markCommissionStatementPaid,
  patchCommissionStatements,
} from "../../providers/billing/commissionStatements";

@Controller("commission-statements")
export class BrokerDeskBillingCommissionStatementController {
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskCommissionStatement.IRequest,
  ): Promise<IPage<IBrokerDeskCommissionStatement.ISummary>> {
    return patchCommissionStatements(body);
  }

  @TypedRoute.Get(":statementId")
  public async at(
    @TypedParam("statementId") statementId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskCommissionStatement> {
    return getCommissionStatement(statementId);
  }

  @TypedRoute.Post()
  public async create(
    @TypedBody() body: IBrokerDeskCommissionStatement.ICreate,
  ): Promise<IBrokerDeskCommissionStatement> {
    return createCommissionStatement(body);
  }

  @TypedRoute.Post(":statementId/mark-paid")
  public async markPaid(
    @TypedParam("statementId") statementId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskCommissionStatement> {
    return markCommissionStatementPaid(statementId);
  }
}
