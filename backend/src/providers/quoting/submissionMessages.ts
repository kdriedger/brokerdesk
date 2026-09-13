import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import { IBrokerDeskSubmissionMessage } from "../../api/structures/BrokerDeskQuoting";
import { MyGlobal } from "../../MyGlobal";
import { requireAdmin } from "../auth/admin";
import { loadQuote, messageInclude, parseDate, toSubmissionMessage } from "./common";

const loadOwnedSubmission = async (
  orgId: string,
  quoteId: string,
  submissionId: string,
) => {
  await loadQuote(orgId, quoteId);
  const submission = await MyGlobal.prisma.broker_desk_submissions.findFirst({
    where: { id: submissionId, broker_desk_quote_id: quoteId },
  });
  if (!submission) throw new HttpException("Submission not found", 404);
  return submission;
};

const loadMessage = async (
  orgId: string,
  quoteId: string,
  submissionId: string,
  messageId: string,
) => {
  await loadOwnedSubmission(orgId, quoteId, submissionId);
  const row = await MyGlobal.prisma.broker_desk_submission_messages.findFirst({
    where: {
      id: messageId,
      broker_desk_submission_id: submissionId,
      deleted_at: null,
    },
    include: messageInclude,
  });
  if (!row) throw new HttpException("Submission message not found", 404);
  return row;
};

export const postSubmissionMessage = async (
  quoteId: string,
  submissionId: string,
  body: IBrokerDeskSubmissionMessage.ICreate,
): Promise<IBrokerDeskSubmissionMessage> => {
  const { admin, session } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  await loadOwnedSubmission(orgId, quoteId, submissionId);
  const now = new Date();
  const messageId = randomUUID();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.broker_desk_submission_messages.create({
      data: {
        id: messageId,
        broker_desk_submission_id: submissionId,
        direction: body.direction,
        channel: body.channel,
        body: body.body,
        occurred_at: parseDate(body.occurred_at),
        created_at: now,
        updated_at: now,
      },
    });
    await tx.broker_desk_submission_message_of_admins.create({
      data: {
        id: randomUUID(),
        broker_desk_submission_message_id: messageId,
        broker_desk_admin_id: admin.id,
        broker_desk_admin_session_id: session.id,
        created_at: now,
      },
    });
    await tx.broker_desk_submissions.update({
      where: { id: submissionId },
      data: { updated_at: now },
    });
  });
  return toSubmissionMessage(
    await loadMessage(orgId, quoteId, submissionId, messageId),
  );
};

export const getSubmissionMessage = async (
  quoteId: string,
  submissionId: string,
  messageId: string,
): Promise<IBrokerDeskSubmissionMessage> => {
  const { admin } = await requireAdmin();
  return toSubmissionMessage(
    await loadMessage(
      admin.broker_desk_organization_id,
      quoteId,
      submissionId,
      messageId,
    ),
  );
};

export const deleteSubmissionMessage = async (
  quoteId: string,
  submissionId: string,
  messageId: string,
): Promise<void> => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const row = await loadMessage(orgId, quoteId, submissionId, messageId);
  const now = new Date();
  await MyGlobal.prisma.broker_desk_submission_messages.update({
    where: { id: row.id },
    data: { deleted_at: now, updated_at: now },
  });
};
