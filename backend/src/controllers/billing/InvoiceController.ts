import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import {
  IBrokerDeskInvoice,
  IBrokerDeskInvoiceLine,
} from "../../api/structures/BrokerDeskBilling";
import { IPage } from "../../api/structures/IPage";
import {
  addInvoiceLine,
  createInvoice,
  eraseInvoice,
  eraseInvoiceLine,
  getInvoice,
  listInvoiceLines,
  patchInvoices,
  sendInvoice,
  updateInvoice,
  updateInvoiceLine,
  voidInvoice,
} from "../../providers/billing/invoices";

@Controller("invoices")
export class BrokerDeskBillingInvoiceController {
  /**
   * List invoices for the organization.
   *
   * Returns a paginated, filterable listing of client invoices. Supports
   * filtering by client, policy, status, issue-date range, and overdue-only,
   * plus sorting for aging and collection workflows. Soft-deleted invoices
   * are excluded.
   *
   * @param body Search and pagination criteria.
   * @returns Paginated invoice summaries.
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskInvoice.IRequest,
  ): Promise<IPage<IBrokerDeskInvoice.ISummary>> {
    return patchInvoices(body);
  }

  /**
   * Fetch a single invoice with lines and payments.
   *
   * Loads the full invoice header together with its charge lines and
   * recorded payments so balances can be reconciled in one call.
   *
   * @param invoiceId Target invoice identifier.
   * @returns The complete invoice record.
   */
  @TypedRoute.Get(":invoiceId")
  public async at(
    @TypedParam("invoiceId") invoiceId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskInvoice> {
    return getInvoice(invoiceId);
  }

  /**
   * Create a new invoice with its charge lines.
   *
   * Accepts the invoice header together with the initial charge lines.
   * Tax rates are frozen per line from the organization's tax-rate table at
   * issuance, and header totals (subtotal, tax, grand total) are derived
   * from the lines. The invoice is created in `draft` status.
   *
   * @param body Invoice creation payload including nested charge lines.
   * @returns The created invoice.
   */
  @TypedRoute.Post()
  public async create(
    @TypedBody() body: IBrokerDeskInvoice.ICreate,
  ): Promise<IBrokerDeskInvoice> {
    return createInvoice(body);
  }

  /**
   * Update an editable invoice.
   *
   * Only invoices still in `draft` status may be revised; issued invoices
   * are immutable financial documents. Replacing the line set recomputes
   * the header totals and freezes fresh tax rates.
   *
   * @param invoiceId Target invoice identifier.
   * @param body Mutable invoice fields and replacement lines.
   * @returns The updated invoice.
   */
  @TypedRoute.Put(":invoiceId")
  public async update(
    @TypedParam("invoiceId") invoiceId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskInvoice.IUpdate,
  ): Promise<IBrokerDeskInvoice> {
    return updateInvoice(invoiceId, body);
  }

  /**
   * Soft-delete an invoice.
   *
   * Hides the invoice from routine listings while preserving the financial
   * record for audit continuity.
   *
   * @param invoiceId Target invoice identifier.
   */
  @TypedRoute.Delete(":invoiceId")
  public async erase(
    @TypedParam("invoiceId") invoiceId: string & tags.Format<"uuid">,
  ): Promise<void> {
    return eraseInvoice(invoiceId);
  }

  /**
   * Issue (send) a draft invoice to the client.
   *
   * Transitions the invoice from `draft` to `sent`, starting the payable
   * period shown on the printed document.
   *
   * @param invoiceId Target invoice identifier.
   * @returns The updated invoice.
   */
  @TypedRoute.Post(":invoiceId/send")
  public async send(
    @TypedParam("invoiceId") invoiceId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskInvoice> {
    return sendInvoice(invoiceId);
  }

  /**
   * Void an erroneous invoice.
   *
   * Retires the invoice without erasing audit history; voided invoices no
   longer accept payments. Requires a recorded reason.
   *
   * @param invoiceId Target invoice identifier.
   * @param body Void reason.
   * @returns The voided invoice.
   */
  @TypedRoute.Post(":invoiceId/void")
  public async void(
    @TypedParam("invoiceId") invoiceId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskInvoice.IVoid,
  ): Promise<IBrokerDeskInvoice> {
    return voidInvoice(invoiceId, body);
  }

  /**
   * List the charge lines of an invoice.
   *
   * @param invoiceId Parent invoice identifier.
   * @returns The invoice's charge lines.
   */
  @TypedRoute.Get(":invoiceId/lines")
  public async lines(
    @TypedParam("invoiceId") invoiceId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskInvoiceLine[]> {
    return listInvoiceLines(invoiceId);
  }

  /**
   * Add a charge line to an editable invoice.
   *
   * Allowed only while the parent invoice remains in `draft` status. The
   * applicable tax rate is frozen from the organization tax table and the
   * invoice totals are recomputed.
   *
   * @param invoiceId Parent invoice identifier.
   * @param body Charge line creation payload.
   * @returns The updated invoice.
   */
  @TypedRoute.Post(":invoiceId/lines")
  public async addLine(
    @TypedParam("invoiceId") invoiceId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskInvoiceLine.ICreate,
  ): Promise<IBrokerDeskInvoice> {
    return addInvoiceLine(invoiceId, body);
  }

  /**
   * Update a charge line on an editable invoice.
   *
   * @param invoiceId Parent invoice identifier.
   * @param lineId Target line identifier.
   * @param body Mutable line fields.
   * @returns The updated invoice.
   */
  @TypedRoute.Put(":invoiceId/lines/:lineId")
  public async updateLine(
    @TypedParam("invoiceId") invoiceId: string & tags.Format<"uuid">,
    @TypedParam("lineId") lineId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskInvoiceLine.IUpdate,
  ): Promise<IBrokerDeskInvoice> {
    return updateInvoiceLine(invoiceId, lineId, body);
  }

  /**
   * Remove a charge line from an editable invoice.
   *
   * @param invoiceId Parent invoice identifier.
   * @param lineId Target line identifier.
   * @returns The updated invoice.
   */
  @TypedRoute.Delete(":invoiceId/lines/:lineId")
  public async eraseLine(
    @TypedParam("invoiceId") invoiceId: string & tags.Format<"uuid">,
    @TypedParam("lineId") lineId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskInvoice> {
    return eraseInvoiceLine(invoiceId, lineId);
  }
}
