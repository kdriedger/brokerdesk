import { tags } from "typia";

import { IBrokerDeskPolicy } from "./BrokerDeskPolicy";

/** Document generated or attached against a policy (schedule, COI, full policy PDF placeholder). */
export interface IBrokerDeskPolicyDocument {
  id: string & tags.Format<"uuid">;
  policy: IBrokerDeskPolicy.ISummary;
  kind: "policy_schedule" | "coi" | "certificate" | "policy_pdf" | "other";
  filename: string;
  mime_type: string;
  storage_path: string;
  checksum: string | null;
  version: number;
  created_at: string & tags.Format<"date-time">;
}

export namespace IBrokerDeskPolicyDocument {
  export interface ISummary {
    id: string & tags.Format<"uuid">;
    kind: "policy_schedule" | "coi" | "certificate" | "policy_pdf" | "other";
    filename: string;
    mime_type: string;
    version: number;
    created_at: string & tags.Format<"date-time">;
  }

  export interface IRequest {
    page?: number;
    limit?: number;
    kind?: "policy_schedule" | "coi" | "certificate" | "policy_pdf" | "other";
    sort_by?: "created_at" | "filename";
    sort_order?: "asc" | "desc";
  }
}
