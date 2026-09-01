import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import { IBrokerDeskCommissionStatement } from "../../api/structures/BrokerDeskBilling";
import { IPage } from "../../api/structures/IPage";

@Controller("commission-statements")
export class BrokerDeskBillingCommissionStatementController {
  /**
   * List commission statements.
   *
   * Admin-facing listing filterable by producer, settlement state, and
   * period start range.
   *
   * @param body Search and pagination criteria.
   * @returns Paginated statement summaries.
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskCommissionStatement.IRequest,
  ): Promise<IPage<IBrokerDeskCommissionStatement.ISummary>> {
    throw new Error("Not implemented");
  }

  /**
   * Fetch a single commission statement with its member commissions.
   *
   * @param statementId Target statement identifier.
   * @returns The complete statement record.
   */
  @TypedRoute.Get(":statementId")
  public async at(
    @TypedParam("statementId") statementId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskCommissionStatement> {
    throw new Error("Not implemented");
  }

  /**
   * Issue (generate) a commission statement for a producer and period.
   *
   * Aggregates the unsettled commissions of the producer within the given
   * period span, freezes the agency and producer totals onto the statement,
   * and back-links the member commissions. Duplicate statements for the
   * same producer and period span are rejected.
   *
   * @param body Statement generation payload (producer + period span).
   * @returns The created statement.
   */
  @TypedRoute.Post()
  public async create(
    @TypedBody() body: IBrokerDeskCommissionStatement.ICreate,
  ): Promise<IBrokerDeskCommissionStatement> {
    throw new Error("Not implemented");
  }

  /**
   * Mark a statement paid.
   *
   * Stamps `paid_at`, transitions the statement to `paid`, and finalizes
   * the linked commissions as settled.
   *
   * @param statementId Target statement identifier.
   * @returns The settled statement.
   */
  @TypedRoute.Post(":statementId/mark-paid")
  public async markPaid(
    @TypedParam("statementId") statementId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskCommissionStatement> {
    throw new Error("Not implemented");
  }
}
