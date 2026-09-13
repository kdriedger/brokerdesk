import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import { IPage } from "../../api/structures/IPage";
import { IBrokerDeskSubmission } from "../../api/structures/BrokerDeskQuoting";
import { MyGlobal } from "../../MyGlobal";
import { Prisma } from "../../prisma/client";
import { requireAdmin } from "../auth/admin";
import { pageArgs, pageOf } from "../../utils/pagination";
import {
  asQuoteStatus,
  asSubmissionStatus,
  isUniqueViolation,
  loadQuote,
  notifySubmissionChange,
  parseDate,
  submissionInclude,
  toSubmission,
  toSubmissionSummary,
} from "./common";

const loadSubmission = async (
  orgId: string,
  quoteId: string,
  submissionId: string,
) => {
  await loadQuote(orgId, quoteId);
  const row = await MyGlobal.prisma.broker_desk_submissions.findFirst({
    where: { id: submissionId, broker_desk_quote_id: quoteId },
    include: submissionInclude,
  });
  if (!row) throw new HttpException("Submission not found", 404);
  return row;
};

export const patchSubmissions = async (
  quoteId: string,
  body: IBrokerDeskSubmission.IRequest,
): Promise<IPage<IBrokerDeskSubmission.ISummary>> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  await loadQuote(orgId, quoteId);
  if (body.broker_desk_quote_id && body.broker_desk_quote_id !== quoteId)
    throw new HttpException("Quote filter does not match path", 400);
  const { page, limit, skip } = pageArgs(body);
  const where: Prisma.broker_desk_submissionsWhereInput = {
    broker_desk_quote_id: quoteId,
    carrier_id: body.carrier_id,
    status: body.status,
  };
  const sort = body.sort ?? "created_at";
  const order = body.order ?? "desc";
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_submissions.count({ where }),
    MyGlobal.prisma.broker_desk_submissions.findMany({
      where,
      include: submissionInclude,
      orderBy: { [sort]: order },
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toSubmissionSummary), total, page, limit);
};

export const postSubmission = async (
  quoteId: string,
  body: IBrokerDeskSubmission.ICreate,
): Promise<IBrokerDeskSubmission> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const quote = await loadQuote(orgId, quoteId);
  const status = asQuoteStatus(quote.status);
  if (status === "bound" || status === "declined" || status === "expired")
    throw new HttpException("Cannot open a submission on a closed quote", 400);
  const carrier = await MyGlobal.prisma.broker_desk_carriers.findFirst({
    where: { id: body.carrier_id },
  });
  if (!carrier) throw new HttpException("Carrier not found", 404);
  const now = new Date();
  try {
    const created = await MyGlobal.prisma.broker_desk_submissions.create({
      data: {
        id: randomUUID(),
        broker_desk_quote_id: quote.id,
        carrier_id: carrier.id,
        status: "pending",
        notes: body.notes ?? null,
        created_at: now,
        updated_at: now,
      },
    });
    await notifySubmissionChange(
      MyGlobal.prisma,
      orgId,
      admin.id,
      created.id,
      "pending",
    );
    if (status === "priced") {
      await MyGlobal.prisma.broker_desk_quotes.update({
        where: { id: quote.id },
        data: { status: "submitted", updated_at: now },
      });
    }
    return toSubmission(await loadSubmission(orgId, quoteId, created.id));
  } catch (error) {
    if (isUniqueViolation(error))
      throw new HttpException(
        "A submission already exists for this carrier on the quote",
        409,
      );
    throw error;
  }
};

export const getSubmission = async (
  quoteId: string,
  submissionId: string,
): Promise<IBrokerDeskSubmission> => {
  const { admin } = await requireAdmin();
  return toSubmission(
    await loadSubmission(
      admin.broker_desk_organization_id,
      quoteId,
      submissionId,
    ),
  );
};

export const putSubmission = async (
  quoteId: string,
  submissionId: string,
  body: IBrokerDeskSubmission.IUpdate,
): Promise<IBrokerDeskSubmission> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const row = await loadSubmission(orgId, quoteId, submissionId);
  const now = new Date();
  const nextStatus = body.status ?? asSubmissionStatus(row.status);
  let sentAt =
    body.sent_at === undefined
      ? undefined
      : body.sent_at === null
        ? null
        : parseDate(body.sent_at);
  let respondedAt =
    body.responded_at === undefined
      ? undefined
      : body.responded_at === null
        ? null
        : parseDate(body.responded_at);
  if (body.status === "sent" && sentAt === undefined && row.sent_at === null)
    sentAt = now;
  if (
    (body.status === "acknowledged" ||
      body.status === "quoted" ||
      body.status === "declined") &&
    respondedAt === undefined &&
    row.responded_at === null
  )
    respondedAt = now;
  await MyGlobal.prisma.broker_desk_submissions.update({
    where: { id: row.id },
    data: {
      status: body.status,
      carrier_reference_number:
        body.carrier_reference_number === undefined
          ? undefined
          : body.carrier_reference_number,
      notes: body.notes === undefined ? undefined : body.notes,
      sent_at: sentAt,
      responded_at: respondedAt,
      updated_at: now,
    },
  });
  if (body.status !== undefined && body.status !== row.status) {
    await notifySubmissionChange(
      MyGlobal.prisma,
      orgId,
      admin.id,
      row.id,
      nextStatus,
    );
    const quote = await loadQuote(orgId, quoteId);
    if (asQuoteStatus(quote.status) === "priced" && body.status !== "declined") {
      await MyGlobal.prisma.broker_desk_quotes.update({
        where: { id: quote.id },
        data: { status: "submitted", updated_at: now },
      });
    }
  }
  return toSubmission(await loadSubmission(orgId, quoteId, submissionId));
};
