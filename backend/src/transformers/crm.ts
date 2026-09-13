import { IBrokerDeskCsr } from "../api/structures/BrokerDeskActorsCsr";
import { IBrokerDeskProducer } from "../api/structures/BrokerDeskActorsProducer";
import {
  IBrokerDeskActivity,
  IPageIBrokerDeskActivitySummary,
} from "../api/structures/BrokerDeskCrmActivity";
import {
  IBrokerDeskAddress,
  IBrokerDeskClientOwner,
} from "../api/structures/BrokerDeskCrmAddress";
import {
  IBrokerDeskClient,
  IBrokerDeskClientContact,
  IBrokerDeskClientDocument,
  IBrokerDeskClientTag,
} from "../api/structures/BrokerDeskCrmClient";
import {
  EActivityType,
  EAddressType,
  EClientLanguage,
  EClientStatus,
  EClientType,
  ETaskStatus,
  IBrokerDeskAdminSummary,
  IBrokerDeskCsrSummary,
  IBrokerDeskOrganizationSummary,
  IBrokerDeskPolicySummary,
  IBrokerDeskProducerSummary,
} from "../api/structures/BrokerDeskCrmShared";
import { IBrokerDeskTask } from "../api/structures/BrokerDeskCrmTask";
import { iso, isoRequired } from "../utils/iso";
import { toOrganizationSummary } from "./organization";

export const isClientType = (value: string): value is EClientType =>
  value === "individual" || value === "business";

export const isClientStatus = (value: string): value is EClientStatus =>
  value === "prospect" ||
  value === "active" ||
  value === "inactive" ||
  value === "lost";

export const isClientLanguage = (value: string): value is EClientLanguage =>
  value === "en" || value === "fr";

export const isAddressType = (value: string): value is EAddressType =>
  value === "mailing" || value === "billing" || value === "risk";

export const isActivityType = (value: string): value is EActivityType =>
  value === "call" ||
  value === "email" ||
  value === "meeting" ||
  value === "note" ||
  value === "other";

export const isTaskStatus = (value: string): value is ETaskStatus =>
  value === "open" || value === "done" || value === "cancelled";

export const parseClientType = (value: string | null): EClientType =>
  value !== null && isClientType(value) ? value : "individual";

export const parseClientStatus = (
  value: string | null,
  active: boolean,
): EClientStatus => {
  if (value !== null && isClientStatus(value)) return value;
  return active ? "active" : "inactive";
};

export const parseClientLanguage = (value: string | null): EClientLanguage =>
  value !== null && isClientLanguage(value) ? value : "en";

export const parseAddressType = (value: string): EAddressType =>
  isAddressType(value) ? value : "mailing";

export const parseActivityType = (value: string): EActivityType =>
  isActivityType(value) ? value : "other";

export const parseTaskStatus = (value: string): ETaskStatus =>
  isTaskStatus(value) ? value : "open";

export type OrgSummaryRow = {
  id: string;
  legal_name: string;
  operating_name: string | null;
  primary_province: string;
  default_currency: string;
};

export type StaffRow = {
  id: string;
  email: string;
  display_name: string;
};

export type StaffActorRow = StaffRow & {
  active: boolean;
  created_at: Date;
  organization: OrgSummaryRow;
};

export type ContactRow = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type TagRow = {
  id: string;
  value: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type AddressRow = {
  id: string;
  type: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postal_code: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  clientOwner?: {
    client: { id: string; email: string };
  } | null;
  organizationOwner?: {
    organization: {
      id: string;
      legal_name: string;
      operating_name: string | null;
      primary_province: string;
    };
  } | null;
};

export const toProducerCrmSummary = (
  row: StaffRow,
): IBrokerDeskProducerSummary => ({
  id: row.id,
  display_name: row.display_name,
  email: row.email,
});

export const toCsrCrmSummary = (row: StaffRow): IBrokerDeskCsrSummary => ({
  id: row.id,
  display_name: row.display_name,
  email: row.email,
});

export const toAdminCrmSummary = (row: StaffRow): IBrokerDeskAdminSummary => ({
  id: row.id,
  display_name: row.display_name,
  email: row.email,
});

export const toStaffActorSummary = (
  row: StaffActorRow,
): IBrokerDeskCsr.ISummary | IBrokerDeskProducer.ISummary => ({
  id: row.id,
  organization: toOrganizationSummary(row.organization),
  email: row.email,
  display_name: row.display_name,
  active: row.active,
  created_at: isoRequired(row.created_at),
});

export const toOrgCrmSummary = (row: {
  id: string;
  legal_name: string;
  operating_name: string | null;
  primary_province: string;
}): IBrokerDeskOrganizationSummary => ({
  id: row.id,
  name: row.operating_name ?? row.legal_name,
  primary_province: row.primary_province,
});

export const toContact = (row: ContactRow): IBrokerDeskClientContact => ({
  id: row.id,
  name: row.name,
  title: row.title,
  email: row.email,
  phone: row.phone,
  is_primary: row.is_primary,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
  deleted_at: iso(row.deleted_at),
});

export const toPublicTag = (row: TagRow): IBrokerDeskClientTag => ({
  id: row.id,
  value: row.value,
  created_at: isoRequired(row.created_at),
  updated_at: isoRequired(row.updated_at),
  deleted_at: iso(row.deleted_at),
});

export const toAddress = (
  row: AddressRow,
  clientLegalName: string | null,
): IBrokerDeskAddress => {
  const clientOwner = row.clientOwner
    ? {
        id: row.clientOwner.client.id,
        legal_name: clientLegalName ?? row.clientOwner.client.email,
      }
    : null;
  const organization = row.organizationOwner
    ? toOrgCrmSummary(row.organizationOwner.organization)
    : null;
  return {
    id: row.id,
    type: parseAddressType(row.type),
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    province: row.province,
    postal_code: row.postal_code,
    created_at: isoRequired(row.created_at),
    updated_at: isoRequired(row.updated_at),
    deleted_at: iso(row.deleted_at),
    client: clientOwner,
    organization,
  };
};

export const toClientOwner = (row: {
  id: string;
  legal_name: string;
}): IBrokerDeskClientOwner => ({
  id: row.id,
  legal_name: row.legal_name,
});

export const toClientSummary = (input: {
  id: string;
  client_type: EClientType;
  legal_name: string;
  preferred_name: string | null;
  primary_province: string;
  email: string | null;
  phone: string | null;
  status: EClientStatus;
  created_at: Date;
  assigned_producer: IBrokerDeskProducerSummary;
  tag_values: string[];
}): IBrokerDeskClient.ISummary => ({
  id: input.id,
  client_type: input.client_type,
  legal_name: input.legal_name,
  preferred_name: input.preferred_name,
  primary_province: input.primary_province,
  email: input.email,
  phone: input.phone,
  status: input.status,
  created_at: isoRequired(input.created_at),
  assigned_producer: input.assigned_producer,
  tag_values: input.tag_values,
});

export const toClient = (input: {
  id: string;
  client_type: EClientType;
  legal_name: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  primary_province: string;
  language: EClientLanguage;
  email: string | null;
  phone: string | null;
  status: EClientStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  assigned_producer: IBrokerDeskProducerSummary;
  addresses: IBrokerDeskAddress[];
  contacts: IBrokerDeskClientContact[];
  tags: IBrokerDeskClientTag[];
}): IBrokerDeskClient => ({
  id: input.id,
  client_type: input.client_type,
  legal_name: input.legal_name,
  first_name: input.first_name,
  last_name: input.last_name,
  preferred_name: input.preferred_name,
  primary_province: input.primary_province,
  language: input.language,
  email: input.email,
  phone: input.phone,
  status: input.status,
  notes: input.notes,
  created_at: isoRequired(input.created_at),
  updated_at: isoRequired(input.updated_at),
  deleted_at: iso(input.deleted_at),
  assigned_producer: input.assigned_producer,
  addresses: input.addresses,
  contacts: input.contacts,
  tags: input.tags,
});

export const toActivitySummary = (input: {
  id: string;
  type: string;
  subject: string;
  occurred_at: Date;
  producer_author: IBrokerDeskProducerSummary | null;
  csr_author: IBrokerDeskCsrSummary | null;
}): IBrokerDeskActivity.ISummary => ({
  id: input.id,
  type: parseActivityType(input.type),
  subject: input.subject,
  occurred_at: isoRequired(input.occurred_at),
  producer_author: input.producer_author,
  csr_author: input.csr_author,
});

export const toActivity = (input: {
  id: string;
  type: string;
  subject: string;
  body: string;
  occurred_at: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  producer_author: IBrokerDeskProducerSummary | null;
  csr_author: IBrokerDeskCsrSummary | null;
  client: IBrokerDeskActivity.IClientRef;
}): IBrokerDeskActivity => ({
  id: input.id,
  type: parseActivityType(input.type),
  subject: input.subject,
  body: input.body,
  occurred_at: isoRequired(input.occurred_at),
  created_at: isoRequired(input.created_at),
  updated_at: isoRequired(input.updated_at),
  deleted_at: iso(input.deleted_at),
  producer_author: input.producer_author,
  csr_author: input.csr_author,
  client: input.client,
});

export const toPolicySummary = (row: {
  id: string;
  org_policy_number: string;
  status: string;
}): IBrokerDeskPolicySummary => ({
  id: row.id,
  policy_number: row.org_policy_number,
  status: row.status,
});

export const toTaskSummary = (input: {
  id: string;
  title: string;
  due_at: Date;
  status: string;
  client: IBrokerDeskTask.IClientRef | null;
  assignee: IBrokerDeskTask.ISummary["assignee"];
}): IBrokerDeskTask.ISummary => ({
  id: input.id,
  title: input.title,
  due_at: isoRequired(input.due_at),
  status: parseTaskStatus(input.status),
  client: input.client,
  assignee: input.assignee,
});

export const toTask = (input: {
  id: string;
  title: string;
  description: string | null;
  due_at: Date;
  status: string;
  created_at: Date;
  updated_at: Date;
  client: IBrokerDeskTask.IClientRef | null;
  policy: IBrokerDeskPolicySummary | null;
  admin_assignee: IBrokerDeskAdminSummary | null;
  producer_assignee: IBrokerDeskProducerSummary | null;
  csr_assignee: IBrokerDeskCsrSummary | null;
}): IBrokerDeskTask => ({
  id: input.id,
  title: input.title,
  description: input.description,
  due_at: isoRequired(input.due_at),
  status: parseTaskStatus(input.status),
  created_at: isoRequired(input.created_at),
  updated_at: isoRequired(input.updated_at),
  client: input.client,
  policy: input.policy,
  admin_assignee: input.admin_assignee,
  producer_assignee: input.producer_assignee,
  csr_assignee: input.csr_assignee,
});

export const toClientDocument = (input: {
  id: string;
  kind: string;
  filename: string;
  mime_type: string;
  size: number;
  storage_path: string;
  checksum: string | null;
  version: number;
  created_at: Date;
  deleted_at: Date | null;
  uploaded_by: IBrokerDeskProducer.ISummary | IBrokerDeskCsr.ISummary;
}): IBrokerDeskClientDocument => ({
  id: input.id,
  kind: input.kind,
  filename: input.filename,
  mime_type: input.mime_type,
  size: input.size,
  storage_path: input.storage_path,
  checksum: input.checksum,
  version: input.version,
  created_at: isoRequired(input.created_at),
  deleted_at: iso(input.deleted_at),
  uploaded_by: input.uploaded_by,
});

export type { IPageIBrokerDeskActivitySummary };
