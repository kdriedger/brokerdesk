import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import { IBrokerDeskSubmissionMessage } from "../../api/structures/BrokerDeskQuoting";
import {
  deleteSubmissionMessage,
  getSubmissionMessage,
  postSubmissionMessage,
} from "../../providers/quoting/submissionMessages";

/**
 * Controller for the carrier conversation log attached to a submission,
 * preserving the complete negotiation trail per courted carrier.
 */
@Controller("quotes/:quoteId/submissions/:submissionId/messages")
export class BrokerDeskQuotingSubmissionMessageController {
  /**
   * Log a conversation turn against a submission.
   *
   * The logging staff member (admin, producer, or CSR) and their session
   * are attributed from the JWT identity through the matching subtype
   * attribution table.
   *
   * @param quoteId Identifier of the owning quotation.
   * @param submissionId Identifier of the owning submission.
   * @param body Message creation payload.
   * @returns The created conversation entry.
   */
  @TypedRoute.Post()
  public async create(
    @TypedParam("quoteId") quoteId: string & tags.Format<"uuid">,
    @TypedParam("submissionId") submissionId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskSubmissionMessage.ICreate,
  ): Promise<IBrokerDeskSubmissionMessage> {
    return postSubmissionMessage(quoteId, submissionId, body);
  }

  /**
   * Fetch one conversation entry with its logger attribution.
   *
   * @param quoteId Identifier of the owning quotation.
   * @param submissionId Identifier of the owning submission.
   * @param messageId Identifier of the target message.
   * @returns The full conversation entry.
   */
  @TypedRoute.Get(":messageId")
  public async at(
    @TypedParam("quoteId") quoteId: string & tags.Format<"uuid">,
    @TypedParam("submissionId") submissionId: string & tags.Format<"uuid">,
    @TypedParam("messageId") messageId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskSubmissionMessage> {
    return getSubmissionMessage(quoteId, submissionId, messageId);
  }

  /**
   * Soft-delete an erroneous or retracted conversation entry while
   * retaining the audit trail.
   *
   * @param quoteId Identifier of the owning quotation.
   * @param submissionId Identifier of the owning submission.
   * @param messageId Identifier of the target message.
   */
  @TypedRoute.Delete(":messageId")
  public async erase(
    @TypedParam("quoteId") quoteId: string & tags.Format<"uuid">,
    @TypedParam("submissionId") submissionId: string & tags.Format<"uuid">,
    @TypedParam("messageId") messageId: string & tags.Format<"uuid">,
  ): Promise<void> {
    return deleteSubmissionMessage(quoteId, submissionId, messageId);
  }
}
