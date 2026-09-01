import { tags } from "typia";

/**
 * Minimal summary of the owning brokerage organization.
 *
 * Full definition lives in the Organization module; this shared projection is
 * used inside CRM DTOs to show tenant context without importing heavyweight
 * organization aggregates.
 */
export interface IBrokerDeskOrganizationSummary {
  /** Primary key of the organization. */
  id: string & tags.Format<"uuid">;
  /** Operating name of the brokerage. */
  name: string;
  /** Primary province of the brokerage (ON, QC, AB, BC, ...). */
  primary_province: string;
}

/**
 * Minimal summary of a producer staff account referenced from CRM records.
 */
export interface IBrokerDeskProducerSummary {
  /** Primary key of the producer. */
  id: string & tags.Format<"uuid">;
  /** Display name shown in assignment and attribution contexts. */
  display_name: string;
  /** Email address of the producer. */
  email: string & tags.Format<"email">;
}

/**
 * Minimal summary of a CSR staff account referenced from CRM records.
 */
export interface IBrokerDeskCsrSummary {
  /** Primary key of the CSR. */
  id: string & tags.Format<"uuid">;
  /** Display name shown in assignment and attribution contexts. */
  display_name: string;
  /** Email address of the CSR. */
  email: string & tags.Format<"email">;
}

/**
 * Minimal summary of an administrator account referenced from CRM records.
 */
export interface IBrokerDeskAdminSummary {
  /** Primary key of the administrator. */
  id: string & tags.Format<"uuid">;
  /** Display name shown in assignment contexts. */
  display_name: string;
  /** Email address of the administrator. */
  email: string & tags.Format<"email">;
}

/**
 * Minimal summary of a policy referenced from optional task anchors.
 */
export interface IBrokerDeskPolicySummary {
  /** Primary key of the policy. */
  id: string & tags.Format<"uuid">;
  /** Organization-generated policy number. */
  policy_number: string;
  /** Lifecycle status of the policy. */
  status: string;
}

/** Client type discriminator: natural person or business entity. */
export type EClientType = "individual" | "business";

/** Client lifecycle status within the brokerage. */
export type EClientStatus = "prospect" | "active" | "inactive" | "lost";

/** Preferred correspondence language of a client. */
export type EClientLanguage = "en" | "fr";

/** Purpose classification of a typed address. */
export type EAddressType = "mailing" | "billing" | "risk";

/** Classification of a client interaction history entry. */
export type EActivityType = "call" | "email" | "meeting" | "note" | "other";

/** Lifecycle standing of a follow-up task. */
export type ETaskStatus = "open" | "done" | "cancelled";
