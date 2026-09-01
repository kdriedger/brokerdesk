import { tags } from "typia";

import { IBrokerDeskPolicy, IBrokerDeskPolicyRenewal } from "./BrokerDeskPolicy";

/**
 * A renewal candidate: an in-force policy whose term end falls within the
 * configured lookahead window and which has no active renewal record yet.
 */
export interface IBrokerDeskPolicyRenewalCandidate {
  policy: IBrokerDeskPolicy.ISummary;
  days_to_term_end: number;
  existing_renewal: IBrokerDeskPolicyRenewal.ISummary | null;
}

export namespace IBrokerDeskPolicyRenewalCandidate {
  export interface IRequest {
    page?: number;
    limit?: number;
    days_ahead: number;
  }
}
