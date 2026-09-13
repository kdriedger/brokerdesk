import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import { IBrokerDeskQuoteLine } from "../../api/structures/BrokerDeskQuoting";
import { MyGlobal } from "../../MyGlobal";
import { requireAdmin } from "../auth/admin";
import {
  asQuoteStatus,
  assertEligible,
  assertQuoteMutable,
  commissionEstimate,
  jsonString,
  loadProduct,
  loadQuote,
  quoteLineInclude,
  refreshQuoteTotals,
  roundCad,
  taxFor,
  toQuoteLine,
} from "./common";

const loadLine = async (orgId: string, quoteId: string, lineId: string) => {
  await loadQuote(orgId, quoteId);
  const row = await MyGlobal.prisma.broker_desk_quote_lines.findFirst({
    where: { id: lineId, broker_desk_quote_id: quoteId },
    include: quoteLineInclude,
  });
  if (!row) throw new HttpException("Quote line not found", 404);
  return row;
};

export const postQuoteLine = async (
  quoteId: string,
  body: IBrokerDeskQuoteLine.ICreate,
): Promise<IBrokerDeskQuoteLine> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const quote = await loadQuote(orgId, quoteId);
  assertQuoteMutable(asQuoteStatus(quote.status), "add a line to");
  const product = await loadProduct(body.broker_desk_product_id);
  assertEligible(product, quote, body.rating_inputs);
  const now = new Date();
  let premium = body.premium_cad ?? null;
  let fee = body.broker_fee_cad ?? null;
  let tax: number | null = null;
  let commission: number | null = null;
  if (premium !== null) {
    premium = roundCad(premium);
    fee = roundCad(fee ?? 0);
    tax = taxFor(quote.organization, premium, fee);
    commission = commissionEstimate(product, premium);
  }
  const created = await MyGlobal.prisma.broker_desk_quote_lines.create({
    data: {
      id: randomUUID(),
      broker_desk_quote_id: quote.id,
      broker_desk_product_id: product.id,
      carrier_name_snapshot: product.carrier.name,
      carrier_code_snapshot: product.carrier.code,
      coverage_selections: jsonString(body.coverage_selections),
      rating_inputs: jsonString(body.rating_inputs),
      premium_cad: premium,
      broker_fee_cad: fee,
      tax_amount_cad: tax,
      commission_estimate_cad: commission,
      accepted: false,
      created_at: now,
      updated_at: now,
    },
  });
  await refreshQuoteTotals(MyGlobal.prisma, quote.id);
  return toQuoteLine(await loadLine(orgId, quoteId, created.id));
};

export const getQuoteLine = async (
  quoteId: string,
  lineId: string,
): Promise<IBrokerDeskQuoteLine> => {
  const { admin } = await requireAdmin();
  return toQuoteLine(
    await loadLine(admin.broker_desk_organization_id, quoteId, lineId),
  );
};

export const putQuoteLine = async (
  quoteId: string,
  lineId: string,
  body: IBrokerDeskQuoteLine.IUpdate,
): Promise<IBrokerDeskQuoteLine> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const quote = await loadQuote(orgId, quoteId);
  const status = asQuoteStatus(quote.status);
  assertQuoteMutable(status, "update a line on");
  const line = await loadLine(orgId, quoteId, lineId);
  const now = new Date();
  let premium = body.premium_cad === undefined ? line.premium_cad : body.premium_cad;
  let fee =
    body.broker_fee_cad === undefined ? line.broker_fee_cad : body.broker_fee_cad;
  let tax = line.tax_amount_cad;
  let commission = line.commission_estimate_cad;
  if (body.premium_cad !== undefined || body.broker_fee_cad !== undefined) {
    if (premium !== null) {
      premium = roundCad(premium);
      fee = roundCad(fee ?? 0);
      tax = taxFor(quote.organization, premium, fee);
      commission = commissionEstimate(line.product, premium);
    } else {
      tax = null;
      commission = null;
    }
  }
  if (body.accepted === true) {
    await MyGlobal.prisma.broker_desk_quote_lines.updateMany({
      where: { broker_desk_quote_id: quote.id },
      data: { accepted: false, updated_at: now },
    });
  }
  await MyGlobal.prisma.broker_desk_quote_lines.update({
    where: { id: line.id },
    data: {
      coverage_selections:
        body.coverage_selections === undefined
          ? undefined
          : jsonString(body.coverage_selections),
      rating_inputs:
        body.rating_inputs === undefined
          ? undefined
          : jsonString(body.rating_inputs),
      premium_cad: body.premium_cad === undefined ? undefined : premium,
      broker_fee_cad: body.broker_fee_cad === undefined ? undefined : fee,
      tax_amount_cad:
        body.premium_cad === undefined && body.broker_fee_cad === undefined
          ? undefined
          : tax,
      commission_estimate_cad:
        body.premium_cad === undefined && body.broker_fee_cad === undefined
          ? undefined
          : commission,
      accepted: body.accepted,
      updated_at: now,
    },
  });
  await refreshQuoteTotals(MyGlobal.prisma, quote.id);
  return toQuoteLine(await loadLine(orgId, quoteId, lineId));
};

export const deleteQuoteLine = async (
  quoteId: string,
  lineId: string,
): Promise<void> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const quote = await loadQuote(orgId, quoteId);
  assertQuoteMutable(asQuoteStatus(quote.status), "remove a line from");
  const line = await loadLine(orgId, quoteId, lineId);
  await MyGlobal.prisma.broker_desk_quote_lines.delete({
    where: { id: line.id },
  });
  await refreshQuoteTotals(MyGlobal.prisma, quote.id);
};
