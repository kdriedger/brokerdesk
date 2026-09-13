import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import { IPage } from "../../api/structures/IPage";
import { IBrokerDeskSubmission } from "../../api/structures/BrokerDeskQuoting";
import {
  getSubmission,
  patchSubmissions,
  postSubmission,
  putSubmission,
} from "../../providers/quoting/submissions";

/**
 * Controller for out-of-band carrier submissions tracked against
 * quotations, one courtship thread per carrier per quote.
 */
@Controller("quotes/:quoteId/submissions")
export class BrokerDeskQuotingSubmissionController {
  /**
   * List carrier submissions for a quotation.
   *
   * Returns a paginated page of submission summaries, optionally
   * filtered by carrier or workflow status.
   *
   * @param quoteId Identifier of the owning quotation.
   * @param body Search and pagination criteria.
   * @returns Paginated submission summaries.
   */
  @TypedRoute.Patch()
  public async index(
    @TypedParam("quoteId") quoteId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskSubmission.IRequest,
  ): Promise<IPage<IBrokerDeskSubmission.ISummary>> {
    return patchSubmissions(quoteId, body);
  }

  /**
   * Open a courtship thread with a carrier for a quotation.
   *
   * Enforces the at-most-one-submission-per-carrier-per-quote rule; each
   * status transition raises a notification for interested staff.
   *
   * @param quoteId Identifier of the owning quotation.
   * @param body Submission creation payload.
   * @returns The created submission.
   */
  @TypedRoute.Post()
  public async create(
    @TypedParam("quoteId") quoteId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskSubmission.ICreate,
  ): Promise<IBrokerDeskSubmission> {
    return postSubmission(quoteId, body);
  }

  /**
   * Fetch one carrier submission with its conversation history.
   *
   * @param quoteId Identifier of the owning quotation.
   * @param submissionId Identifier of the target submission.
   * @returns The full submission record.
   */
  @TypedRoute.Get(":submissionId")
  public async at(
    @TypedParam("quoteId") quoteId: string & tags.Format<"uuid">,
    @TypedParam("submissionId") submissionId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskSubmission> {
    return getSubmission(quoteId, submissionId);
  }

  /**
   * Advance a submission's workflow status or capture carrier reference
   * and response details.
   *
   * @param quoteId Identifier of the owning quotation.
   * @param submissionId Identifier of the target submission.
   * @param body Fields to update, all optional.
   * @returns The updated submission.
   */
  @TypedRoute.Put(":submissionId")
  public async update(
    @TypedParam("quoteId") quoteId: string & tags.Format<"uuid">,
    @TypedParam("submissionId") submissionId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskSubmission.IUpdate,
  ): Promise<IBrokerDeskSubmission> {
    return putSubmission(quoteId, submissionId, body);
  }
}
