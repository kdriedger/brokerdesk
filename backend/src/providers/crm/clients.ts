import { randomBytes } from "node:crypto";

import { HttpException } from "@nestjs/common";

import {
  IBrokerDeskClient,
  IBrokerDeskClientDocument,
  IBrokerDeskClientTag,
  IPageIBrokerDeskClientSummary,
} from "../../api/structures/BrokerDeskCrmClient";
import { MyGlobal } from "../../MyGlobal";
import {
  toAddress,
  toClient,
  toClientDocument,
  toClientSummary,
  toContact,
  toPublicTag,
  toStaffActorSummary,
} from "../../transformers/crm";
import { pageArgs, pageOf } from "../../utils/pagination";
import { PasswordUtil } from "../../utils/PasswordUtil";
import {
  adminAsStaffActor,
  emptyToNull,
  isPublicTagValue,
  loadUploader,
  normalizeTag,
  orgProvinceOf,
  PROFILE_PREFIX,
  publicTags,
  randomUUID,
  readProfile,
  requireCrmAdmin,
  requireOrgClient,
  resolveProducerSummary,
  writeProfile,
  type CrmProfile,
} from "./common";

const mapClient = async (
  client: Awaited<ReturnType<typeof requireOrgClient>>["client"],
  orgId: string,
  orgProvince: string,
  fallback: { id: string; email: string; display_name: string },
) => {
  const profile = readProfile(client.tags, client, orgProvince);
  const assigned = await resolveProducerSummary(
    orgId,
    profile.assigned_producer_id,
    fallback,
  );
  const legalName = profile.legal_name;
  const addresses = client.addressOwners
    .filter((owner) => owner.address.deleted_at === null)
    .map((owner) => toAddress(owner.address, legalName));
  const contacts = client.contacts
    .filter((row) => row.deleted_at === null)
    .map(toContact);
  const tags = publicTags(client.tags).map(toPublicTag);
  return toClient({
    id: client.id,
    client_type: profile.client_type,
    legal_name: legalName,
    first_name: profile.first_name,
    last_name: profile.last_name,
    preferred_name: profile.preferred_name,
    primary_province: profile.primary_province,
    language: profile.language,
    email: client.email,
    phone: profile.phone,
    status: profile.status,
    notes: profile.notes,
    created_at: client.created_at,
    updated_at: client.updated_at,
    deleted_at: client.active ? null : client.updated_at,
    assigned_producer: assigned,
    addresses,
    contacts,
    tags,
  });
};

const reloadClient = async (
  clientId: string,
  orgId: string,
  orgProvince: string,
  fallback: { id: string; email: string; display_name: string },
) => {
  const packed = await requireOrgClient(clientId);
  if (packed.orgId !== orgId) throw new HttpException("Client not found", 404);
  return mapClient(packed.client, orgId, orgProvince, fallback);
};

export const patchCrmClients = async (
  body: IBrokerDeskClient.IRequest,
): Promise<IPageIBrokerDeskClientSummary> => {
  const ctx = await requireCrmAdmin();
  const orgId = ctx.admin.broker_desk_organization_id;
  const orgProvince = orgProvinceOf(ctx);
  const fallback = {
    id: ctx.admin.id,
    email: ctx.admin.email,
    display_name: ctx.admin.display_name,
  };
  const { page, limit, skip } = pageArgs(body);
  const order = body.order === "asc" ? "asc" : "desc";
  const where = {
    organization_id: orgId,
    ...(body.status === "inactive" || body.status === "lost"
      ? {}
      : { active: true }),
    AND: [
      body.search
        ? {
            OR: [
              { email: { contains: body.search, mode: "insensitive" as const } },
              {
                contacts: {
                  some: {
                    deleted_at: null,
                    name: { contains: body.search, mode: "insensitive" as const },
                  },
                },
              },
              {
                tags: {
                  some: {
                    deleted_at: null,
                    value: {
                      contains: body.search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
            ],
          }
        : {},
      body.status
        ? {
            tags: {
              some: {
                deleted_at: null,
                value: `${PROFILE_PREFIX.status}${body.status}`,
              },
            },
          }
        : {},
      body.assigned_producer_id
        ? {
            tags: {
              some: {
                deleted_at: null,
                value: `${PROFILE_PREFIX.producer}${body.assigned_producer_id}`,
              },
            },
          }
        : {},
      body.primary_province
        ? {
            tags: {
              some: {
                deleted_at: null,
                value: `${PROFILE_PREFIX.province}${body.primary_province}`,
              },
            },
          }
        : {},
      body.client_type
        ? {
            tags: {
              some: {
                deleted_at: null,
                value: `${PROFILE_PREFIX.type}${body.client_type}`,
              },
            },
          }
        : {},
      ...(body.tags ?? []).map((tag) => ({
        tags: {
          some: {
            deleted_at: null,
            value: tag,
          },
        },
      })),
    ],
  };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_clients.count({ where }),
    MyGlobal.prisma.broker_desk_clients.findMany({
      where,
      orderBy:
        body.sort === "legal_name"
          ? { email: order }
          : { created_at: order },
      skip,
      take: limit,
      include: { tags: true },
    }),
  ]);
  const data = await Promise.all(
    rows.map(async (row) => {
      const profile = readProfile(row.tags, row, orgProvince);
      const assigned = await resolveProducerSummary(
        orgId,
        profile.assigned_producer_id,
        fallback,
      );
      return toClientSummary({
        id: row.id,
        client_type: profile.client_type,
        legal_name: profile.legal_name,
        preferred_name: profile.preferred_name,
        primary_province: profile.primary_province,
        email: row.email,
        phone: profile.phone,
        status: profile.status,
        created_at: row.created_at,
        assigned_producer: assigned,
        tag_values: publicTags(row.tags).map((tag) => tag.value),
      });
    }),
  );
  return pageOf(data, total, page, limit);
};

export const getCrmClient = async (
  clientId: string,
): Promise<IBrokerDeskClient> => {
  const packed = await requireOrgClient(clientId);
  return mapClient(
    packed.client,
    packed.orgId,
    orgProvinceOf(packed),
    {
      id: packed.admin.id,
      email: packed.admin.email,
      display_name: packed.admin.display_name,
    },
  );
};

export const postCrmClient = async (
  body: IBrokerDeskClient.ICreate,
): Promise<IBrokerDeskClient> => {
  const ctx = await requireCrmAdmin();
  const orgId = ctx.admin.broker_desk_organization_id;
  const orgProvince = orgProvinceOf(ctx);
  const now = new Date();
  const id = randomUUID();
  const email = emptyToNull(body.email) ?? `${id}@crm.brokerdesk.invalid`;
  const duplicate = await MyGlobal.prisma.broker_desk_clients.findFirst({
    where: { email },
  });
  if (duplicate) throw new HttpException("Email already registered", 409);

  await MyGlobal.prisma.broker_desk_clients.create({
    data: {
      id,
      organization_id: orgId,
      email,
      password_hash: PasswordUtil.hash(randomBytes(32).toString("hex")),
      active: body.status !== "inactive" && body.status !== "lost",
      created_at: now,
      updated_at: now,
    },
  });

  const profile: CrmProfile = {
    client_type: body.client_type,
    legal_name: body.legal_name,
    first_name: emptyToNull(body.first_name),
    last_name: emptyToNull(body.last_name),
    preferred_name: emptyToNull(body.preferred_name),
    primary_province: body.primary_province,
    language: body.language ?? "en",
    phone: emptyToNull(body.phone),
    status: body.status ?? "prospect",
    notes: emptyToNull(body.notes),
    assigned_producer_id: ctx.admin.id,
  };
  await writeProfile(id, profile, now);

  const initialTags = (body.tags ?? [])
    .map(normalizeTag)
    .filter((value) => value.length > 0 && isPublicTagValue(value));
  const uniqueTags = [...new Set(initialTags)];
  if (uniqueTags.length > 0) {
    await MyGlobal.prisma.broker_desk_client_tags.createMany({
      data: uniqueTags.map((value) => ({
        id: randomUUID(),
        broker_desk_client_id: id,
        value,
        created_at: now,
        updated_at: now,
      })),
    });
  }

  const contacts = body.contacts ?? [];
  if (contacts.length > 0) {
    let primarySeen = false;
    await MyGlobal.prisma.broker_desk_client_contacts.createMany({
      data: contacts.map((contact, index) => {
        const wantPrimary = contact.is_primary === true && !primarySeen;
        if (wantPrimary) primarySeen = true;
        const isPrimary =
          contact.is_primary === undefined
            ? index === 0 && !primarySeen
            : wantPrimary;
        if (isPrimary) primarySeen = true;
        return {
          id: randomUUID(),
          broker_desk_client_id: id,
          name: contact.name,
          title: emptyToNull(contact.title),
          email: emptyToNull(contact.email),
          phone: emptyToNull(contact.phone),
          is_primary: isPrimary,
          created_at: now,
          updated_at: now,
        };
      }),
    });
  }

  return reloadClient(id, orgId, orgProvince, {
    id: ctx.admin.id,
    email: ctx.admin.email,
    display_name: ctx.admin.display_name,
  });
};

export const putCrmClient = async (
  clientId: string,
  body: IBrokerDeskClient.IUpdate,
): Promise<IBrokerDeskClient> => {
  const packed = await requireOrgClient(clientId);
  const now = new Date();
  const profile = readProfile(
    packed.client.tags,
    packed.client,
    orgProvinceOf(packed),
  );
  if (body.legal_name !== undefined) profile.legal_name = body.legal_name;
  if (body.first_name !== undefined)
    profile.first_name = emptyToNull(body.first_name);
  if (body.last_name !== undefined)
    profile.last_name = emptyToNull(body.last_name);
  if (body.preferred_name !== undefined)
    profile.preferred_name = emptyToNull(body.preferred_name);
  if (body.primary_province !== undefined)
    profile.primary_province = body.primary_province;
  if (body.language !== undefined) profile.language = body.language;
  if (body.email !== undefined && body.email !== null) {
    const duplicate = await MyGlobal.prisma.broker_desk_clients.findFirst({
      where: { email: body.email, id: { not: clientId } },
    });
    if (duplicate) throw new HttpException("Email already registered", 409);
  }
  if (body.phone !== undefined) profile.phone = emptyToNull(body.phone);
  if (body.status !== undefined) profile.status = body.status;
  if (body.notes !== undefined) profile.notes = emptyToNull(body.notes);
  if (body.assigned_producer_id !== undefined)
    profile.assigned_producer_id = body.assigned_producer_id;

  const active =
    profile.status !== "inactive" && profile.status !== "lost";
  await MyGlobal.prisma.broker_desk_clients.update({
    where: { id: clientId },
    data: {
      email:
        body.email === undefined || body.email === null
          ? undefined
          : body.email,
      active,
      updated_at: now,
    },
  });
  await writeProfile(clientId, profile, now);
  return reloadClient(clientId, packed.orgId, orgProvinceOf(packed), {
    id: packed.admin.id,
    email: packed.admin.email,
    display_name: packed.admin.display_name,
  });
};

export const deleteCrmClient = async (clientId: string): Promise<void> => {
  const packed = await requireOrgClient(clientId);
  const now = new Date();
  const profile = readProfile(
    packed.client.tags,
    packed.client,
    orgProvinceOf(packed),
  );
  profile.status = "inactive";
  await MyGlobal.prisma.broker_desk_clients.update({
    where: { id: clientId },
    data: { active: false, updated_at: now },
  });
  await writeProfile(clientId, profile, now);
};

export const getCrmClientTimeline = async (
  clientId: string,
): Promise<IBrokerDeskClient.ITimeline> => {
  const packed = await requireOrgClient(clientId);
  const orgProvince = orgProvinceOf(packed);
  const fallback = {
    id: packed.admin.id,
    email: packed.admin.email,
    display_name: packed.admin.display_name,
  };
  const profile = readProfile(packed.client.tags, packed.client, orgProvince);
  const assigned = await resolveProducerSummary(
    packed.orgId,
    profile.assigned_producer_id,
    fallback,
  );
  const [activities, tasks, quotes, policies] = await Promise.all([
    MyGlobal.prisma.broker_desk_activities.findMany({
      where: { broker_desk_client_id: clientId, deleted_at: null },
    }),
    MyGlobal.prisma.broker_desk_tasks.findMany({
      where: { client_id: clientId },
    }),
    MyGlobal.prisma.broker_desk_quotes.findMany({
      where: { broker_desk_client_id: clientId, deleted_at: null },
    }),
    MyGlobal.prisma.broker_desk_policies.findMany({
      where: { client_id: clientId, deleted_at: null },
    }),
  ]);
  const items: IBrokerDeskClient.ITimelineItem[] = [
    ...activities.map((row) => ({
      kind: "activity" as const,
      id: row.id,
      title: row.subject,
      body: row.body,
      occurred_at: row.occurred_at.toISOString(),
    })),
    ...tasks.map((row) => ({
      kind: "task" as const,
      id: row.id,
      title: row.title,
      body: row.description,
      occurred_at: row.created_at.toISOString(),
    })),
    ...quotes.map((row) => ({
      kind: "quote" as const,
      id: row.id,
      title: `Quote (${row.status})`,
      body: row.notes,
      occurred_at: row.created_at.toISOString(),
    })),
    ...policies.map((row) => ({
      kind: "policy" as const,
      id: row.id,
      title: `Policy ${row.org_policy_number}`,
      body: row.status,
      occurred_at: row.created_at.toISOString(),
    })),
  ].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  return {
    client: toClientSummary({
      id: packed.client.id,
      client_type: profile.client_type,
      legal_name: profile.legal_name,
      preferred_name: profile.preferred_name,
      primary_province: profile.primary_province,
      email: packed.client.email,
      phone: profile.phone,
      status: profile.status,
      created_at: packed.client.created_at,
      assigned_producer: assigned,
      tag_values: publicTags(packed.client.tags).map((tag) => tag.value),
    }),
    items,
  };
};

export const getCrmClientTags = async (
  clientId: string,
): Promise<IBrokerDeskClientTag[]> => {
  const packed = await requireOrgClient(clientId);
  return publicTags(packed.client.tags).map(toPublicTag);
};

export const postCrmClientTag = async (
  clientId: string,
  body: { value: string },
): Promise<IBrokerDeskClientTag> => {
  await requireOrgClient(clientId);
  const value = normalizeTag(body.value);
  if (value.length === 0 || !isPublicTagValue(value))
    throw new HttpException("Invalid tag", 400);
  const now = new Date();
  const existing = await MyGlobal.prisma.broker_desk_client_tags.findFirst({
    where: { broker_desk_client_id: clientId, value },
  });
  if (existing && existing.deleted_at === null)
    throw new HttpException("Tag already assigned", 409);
  const row = existing
    ? await MyGlobal.prisma.broker_desk_client_tags.update({
        where: { id: existing.id },
        data: { deleted_at: null, updated_at: now },
      })
    : await MyGlobal.prisma.broker_desk_client_tags.create({
        data: {
          id: randomUUID(),
          broker_desk_client_id: clientId,
          value,
          created_at: now,
          updated_at: now,
        },
      });
  return toPublicTag(row);
};

export const deleteCrmClientTag = async (
  clientId: string,
  tagId: string,
): Promise<void> => {
  await requireOrgClient(clientId);
  const tag = await MyGlobal.prisma.broker_desk_client_tags.findFirst({
    where: { id: tagId, broker_desk_client_id: clientId, deleted_at: null },
  });
  if (!tag || !isPublicTagValue(tag.value))
    throw new HttpException("Tag not found", 404);
  await MyGlobal.prisma.broker_desk_client_tags.update({
    where: { id: tag.id },
    data: { deleted_at: new Date(), updated_at: new Date() },
  });
};

export const getCrmClientDocuments = async (
  clientId: string,
): Promise<IBrokerDeskClientDocument[]> => {
  const packed = await requireOrgClient(clientId);
  const owners =
    await MyGlobal.prisma.broker_desk_document_client_owners.findMany({
      where: {
        broker_desk_client_id: clientId,
        deleted_at: null,
        document: { deleted_at: null },
      },
      include: { document: true },
      orderBy: { created_at: "desc" },
    });
  const fallback = adminAsStaffActor(packed);
  return Promise.all(
    owners.map(async (owner) => {
      const uploadedBy = await loadUploader(
        owner.document.uploaded_by_type,
        owner.document.uploaded_by_id,
        fallback,
      );
      return toClientDocument({
        id: owner.document.id,
        kind: owner.document.kind,
        filename: owner.document.filename,
        mime_type: owner.document.mime_type,
        size: owner.document.size_bytes,
        storage_path: owner.document.storage_path,
        checksum: owner.document.checksum,
        version: owner.document.version,
        created_at: owner.document.created_at,
        deleted_at: owner.document.deleted_at,
        uploaded_by: uploadedBy,
      });
    }),
  );
};

export const postCrmClientDocument = async (
  clientId: string,
  body: {
    kind: string;
    filename: string;
    mime_type: string;
    size: number;
    storage_path: string;
    checksum?: string | null;
  },
): Promise<IBrokerDeskClientDocument> => {
  const packed = await requireOrgClient(clientId);
  const now = new Date();
  const documentId = randomUUID();
  const document = await MyGlobal.prisma.broker_desk_documents.create({
    data: {
      id: documentId,
      broker_desk_organization_id: packed.orgId,
      owner_type: "client",
      kind: body.kind,
      filename: body.filename,
      mime_type: body.mime_type,
      size_bytes: body.size,
      storage_path: body.storage_path,
      checksum: body.checksum ?? "unsigned",
      version: 1,
      uploaded_by_type: "admin",
      uploaded_by_id: packed.admin.id,
      created_at: now,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.broker_desk_document_client_owners.create({
    data: {
      id: randomUUID(),
      broker_desk_document_id: document.id,
      broker_desk_client_id: clientId,
      created_at: now,
      updated_at: now,
    },
  });
  return toClientDocument({
    id: document.id,
    kind: document.kind,
    filename: document.filename,
    mime_type: document.mime_type,
    size: document.size_bytes,
    storage_path: document.storage_path,
    checksum: document.checksum,
    version: document.version,
    created_at: document.created_at,
    deleted_at: document.deleted_at,
    uploaded_by: toStaffActorSummary(adminAsStaffActor(packed)),
  });
};
