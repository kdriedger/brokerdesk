import { HttpException } from "@nestjs/common";

import { IBrokerDeskClientContact } from "../../api/structures/BrokerDeskCrmClient";
import { MyGlobal } from "../../MyGlobal";
import { toContact } from "../../transformers/crm";
import {
  emptyToNull,
  randomUUID,
  requireOrgClient,
} from "./common";

const requireContact = async (clientId: string, contactId: string) => {
  await requireOrgClient(clientId);
  const contact = await MyGlobal.prisma.broker_desk_client_contacts.findFirst({
    where: { id: contactId, broker_desk_client_id: clientId },
  });
  if (!contact) throw new HttpException("Contact not found", 404);
  return contact;
};

const clearOtherPrimaries = async (
  clientId: string,
  keepId: string,
  now: Date,
): Promise<void> => {
  await MyGlobal.prisma.broker_desk_client_contacts.updateMany({
    where: {
      broker_desk_client_id: clientId,
      is_primary: true,
      id: { not: keepId },
      deleted_at: null,
    },
    data: { is_primary: false, updated_at: now },
  });
};

export const getCrmClientContacts = async (
  clientId: string,
): Promise<IBrokerDeskClientContact[]> => {
  await requireOrgClient(clientId);
  const rows = await MyGlobal.prisma.broker_desk_client_contacts.findMany({
    where: { broker_desk_client_id: clientId, deleted_at: null },
    orderBy: [{ is_primary: "desc" }, { name: "asc" }],
  });
  return rows.map(toContact);
};

export const getCrmClientContact = async (
  clientId: string,
  contactId: string,
): Promise<IBrokerDeskClientContact> => {
  const contact = await requireContact(clientId, contactId);
  return toContact(contact);
};

export const postCrmClientContact = async (
  clientId: string,
  body: IBrokerDeskClientContact.ICreate,
): Promise<IBrokerDeskClientContact> => {
  await requireOrgClient(clientId);
  const now = new Date();
  const existingPrimary =
    await MyGlobal.prisma.broker_desk_client_contacts.findFirst({
      where: {
        broker_desk_client_id: clientId,
        is_primary: true,
        deleted_at: null,
      },
    });
  const isPrimary =
    body.is_primary === true || (body.is_primary !== false && !existingPrimary);
  const created = await MyGlobal.prisma.broker_desk_client_contacts.create({
    data: {
      id: randomUUID(),
      broker_desk_client_id: clientId,
      name: body.name,
      title: emptyToNull(body.title),
      email: emptyToNull(body.email),
      phone: emptyToNull(body.phone),
      is_primary: isPrimary,
      created_at: now,
      updated_at: now,
    },
  });
  if (isPrimary) await clearOtherPrimaries(clientId, created.id, now);
  return toContact(created);
};

export const putCrmClientContact = async (
  clientId: string,
  contactId: string,
  body: IBrokerDeskClientContact.IUpdate,
): Promise<IBrokerDeskClientContact> => {
  await requireContact(clientId, contactId);
  const now = new Date();
  const updated = await MyGlobal.prisma.broker_desk_client_contacts.update({
    where: { id: contactId },
    data: {
      name: body.name ?? undefined,
      title: body.title === undefined ? undefined : emptyToNull(body.title),
      email: body.email === undefined ? undefined : emptyToNull(body.email),
      phone: body.phone === undefined ? undefined : emptyToNull(body.phone),
      is_primary: body.is_primary ?? undefined,
      updated_at: now,
    },
  });
  if (updated.is_primary) await clearOtherPrimaries(clientId, updated.id, now);
  return toContact(updated);
};

export const deleteCrmClientContact = async (
  clientId: string,
  contactId: string,
): Promise<void> => {
  const contact = await requireContact(clientId, contactId);
  if (contact.deleted_at !== null) return;
  await MyGlobal.prisma.broker_desk_client_contacts.update({
    where: { id: contactId },
    data: { deleted_at: new Date(), updated_at: new Date(), is_primary: false },
  });
};
