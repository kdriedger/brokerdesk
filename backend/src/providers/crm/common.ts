import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import { requireAdmin } from "../auth/admin";
import {
  EClientLanguage,
  EClientStatus,
  EClientType,
  IBrokerDeskProducerSummary,
} from "../../api/structures/BrokerDeskCrmShared";
import { MyGlobal } from "../../MyGlobal";
import {
  parseClientLanguage,
  parseClientStatus,
  parseClientType,
  StaffActorRow,
  StaffRow,
  TagRow,
  toProducerCrmSummary,
  toStaffActorSummary,
} from "../../transformers/crm";
import { toOrganizationSummary } from "../../transformers/organization";

export const PROFILE_PREFIX = {
  legal: "__crm.legal:",
  first: "__crm.first:",
  last: "__crm.last:",
  preferred: "__crm.preferred:",
  province: "__crm.province:",
  lang: "__crm.lang:",
  status: "__crm.status:",
  type: "__crm.type:",
  phone: "__crm.phone:",
  notes: "__crm.notes:",
  producer: "__crm.producer:",
} as const;

export const isPublicTagValue = (value: string): boolean =>
  !value.startsWith("__crm.");

export type CrmProfile = {
  client_type: EClientType;
  legal_name: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  primary_province: string;
  language: EClientLanguage;
  phone: string | null;
  status: EClientStatus;
  notes: string | null;
  assigned_producer_id: string | null;
};

export type AdminCtx = Awaited<ReturnType<typeof requireAdmin>>;

export const requireCrmAdmin = async (): Promise<AdminCtx> => requireAdmin();

export const overlayOf = (
  tags: TagRow[],
  prefix: string,
): string | null => {
  const row = tags.find(
    (tag) => tag.deleted_at === null && tag.value.startsWith(prefix),
  );
  if (!row) return null;
  const rest = row.value.slice(prefix.length);
  return rest.length === 0 ? null : rest;
};

export const readProfile = (
  tags: TagRow[],
  client: { email: string; active: boolean },
  orgProvince: string,
): CrmProfile => ({
  client_type: parseClientType(overlayOf(tags, PROFILE_PREFIX.type)),
  legal_name: overlayOf(tags, PROFILE_PREFIX.legal) ?? client.email,
  first_name: overlayOf(tags, PROFILE_PREFIX.first),
  last_name: overlayOf(tags, PROFILE_PREFIX.last),
  preferred_name: overlayOf(tags, PROFILE_PREFIX.preferred),
  primary_province:
    overlayOf(tags, PROFILE_PREFIX.province) ?? orgProvince,
  language: parseClientLanguage(overlayOf(tags, PROFILE_PREFIX.lang)),
  phone: overlayOf(tags, PROFILE_PREFIX.phone),
  status: parseClientStatus(
    overlayOf(tags, PROFILE_PREFIX.status),
    client.active,
  ),
  notes: overlayOf(tags, PROFILE_PREFIX.notes),
  assigned_producer_id: overlayOf(tags, PROFILE_PREFIX.producer),
});

const upsertOverlay = async (
  clientId: string,
  prefix: string,
  raw: string | null,
  now: Date,
): Promise<void> => {
  const existing = await MyGlobal.prisma.broker_desk_client_tags.findFirst({
    where: {
      broker_desk_client_id: clientId,
      value: { startsWith: prefix },
    },
  });
  if (raw === null) {
    if (existing && existing.deleted_at === null) {
      await MyGlobal.prisma.broker_desk_client_tags.update({
        where: { id: existing.id },
        data: { deleted_at: now, updated_at: now },
      });
    }
    return;
  }
  const value = `${prefix}${raw}`;
  if (existing) {
    await MyGlobal.prisma.broker_desk_client_tags.update({
      where: { id: existing.id },
      data: { value, deleted_at: null, updated_at: now },
    });
    return;
  }
  await MyGlobal.prisma.broker_desk_client_tags.create({
    data: {
      id: randomUUID(),
      broker_desk_client_id: clientId,
      value,
      created_at: now,
      updated_at: now,
    },
  });
};

export const writeProfile = async (
  clientId: string,
  profile: CrmProfile,
  now: Date,
): Promise<void> => {
  await upsertOverlay(clientId, PROFILE_PREFIX.type, profile.client_type, now);
  await upsertOverlay(clientId, PROFILE_PREFIX.legal, profile.legal_name, now);
  await upsertOverlay(clientId, PROFILE_PREFIX.first, profile.first_name, now);
  await upsertOverlay(clientId, PROFILE_PREFIX.last, profile.last_name, now);
  await upsertOverlay(
    clientId,
    PROFILE_PREFIX.preferred,
    profile.preferred_name,
    now,
  );
  await upsertOverlay(
    clientId,
    PROFILE_PREFIX.province,
    profile.primary_province,
    now,
  );
  await upsertOverlay(clientId, PROFILE_PREFIX.lang, profile.language, now);
  await upsertOverlay(clientId, PROFILE_PREFIX.phone, profile.phone, now);
  await upsertOverlay(clientId, PROFILE_PREFIX.status, profile.status, now);
  await upsertOverlay(clientId, PROFILE_PREFIX.notes, profile.notes, now);
  await upsertOverlay(
    clientId,
    PROFILE_PREFIX.producer,
    profile.assigned_producer_id,
    now,
  );
};

export const publicTags = (tags: TagRow[]): TagRow[] =>
  tags.filter((tag) => tag.deleted_at === null && isPublicTagValue(tag.value));

export const resolveProducerSummary = async (
  orgId: string,
  preferredId: string | null,
  fallback: StaffRow,
): Promise<IBrokerDeskProducerSummary> => {
  if (preferredId) {
    const producer = await MyGlobal.prisma.broker_desk_producers.findFirst({
      where: {
        id: preferredId,
        broker_desk_organization_id: orgId,
        deleted_at: null,
      },
    });
    if (producer) return toProducerCrmSummary(producer);
    const admin = await MyGlobal.prisma.broker_desk_admins.findFirst({
      where: {
        id: preferredId,
        broker_desk_organization_id: orgId,
        deleted_at: null,
      },
    });
    if (admin) return toProducerCrmSummary(admin);
    const csr = await MyGlobal.prisma.broker_desk_csrs.findFirst({
      where: {
        id: preferredId,
        broker_desk_organization_id: orgId,
        deleted_at: null,
      },
    });
    if (csr) return toProducerCrmSummary(csr);
  }
  const firstProducer = await MyGlobal.prisma.broker_desk_producers.findFirst({
    where: { broker_desk_organization_id: orgId, deleted_at: null },
    orderBy: { created_at: "asc" },
  });
  if (firstProducer) return toProducerCrmSummary(firstProducer);
  return toProducerCrmSummary(fallback);
};

export const requireOrgClient = async (clientId: string) => {
  const ctx = await requireCrmAdmin();
  const orgId = ctx.admin.broker_desk_organization_id;
  const client = await MyGlobal.prisma.broker_desk_clients.findFirst({
    where: { id: clientId, organization_id: orgId },
    include: {
      contacts: { orderBy: [{ is_primary: "desc" }, { name: "asc" }] },
      tags: { orderBy: { created_at: "asc" } },
      addressOwners: {
        include: {
          address: {
            include: {
              clientOwner: { include: { client: true } },
              organizationOwner: { include: { organization: true } },
            },
          },
        },
      },
    },
  });
  if (!client) throw new HttpException("Client not found", 404);
  return { ...ctx, orgId, client };
};

export const orgProvinceOf = (ctx: AdminCtx): string =>
  ctx.admin.organization.primary_province;

export const loadUploader = async (
  uploadedByType: string,
  uploadedById: string,
  fallback: StaffActorRow,
): Promise<ReturnType<typeof toStaffActorSummary>> => {
  if (uploadedByType === "producer") {
    const row = await MyGlobal.prisma.broker_desk_producers.findFirst({
      where: { id: uploadedById },
      include: { organization: true },
    });
    if (row) return toStaffActorSummary(row);
  }
  if (uploadedByType === "csr") {
    const row = await MyGlobal.prisma.broker_desk_csrs.findFirst({
      where: { id: uploadedById },
      include: { organization: true },
    });
    if (row) return toStaffActorSummary(row);
  }
  const admin = await MyGlobal.prisma.broker_desk_admins.findFirst({
    where: { id: uploadedById },
    include: { organization: true },
  });
  if (admin) return toStaffActorSummary(admin);
  return toStaffActorSummary(fallback);
};

export const adminAsStaffActor = (ctx: AdminCtx): StaffActorRow => ({
  id: ctx.admin.id,
  email: ctx.admin.email,
  display_name: ctx.admin.display_name,
  active: ctx.admin.active,
  created_at: ctx.admin.created_at,
  organization: {
    id: ctx.admin.organization.id,
    legal_name: ctx.admin.organization.legal_name,
    operating_name: ctx.admin.organization.operating_name,
    primary_province: ctx.admin.organization.primary_province,
    default_currency: ctx.admin.organization.default_currency,
  },
});

export const normalizeTag = (value: string): string => value.trim();

export const emptyToNull = (value: string | null | undefined): string | null => {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export { toOrganizationSummary, randomUUID };
