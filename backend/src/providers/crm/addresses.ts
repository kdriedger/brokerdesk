import { HttpException } from "@nestjs/common";

import { IBrokerDeskAddress } from "../../api/structures/BrokerDeskCrmAddress";
import { MyGlobal } from "../../MyGlobal";
import { isAddressType, toAddress } from "../../transformers/crm";
import {
  emptyToNull,
  orgProvinceOf,
  randomUUID,
  readProfile,
  requireCrmAdmin,
  requireOrgClient,
} from "./common";

const addressInclude = {
  clientOwner: { include: { client: true } },
  organizationOwner: { include: { organization: true } },
} as const;

const legalNameFor = async (
  clientId: string | null,
  fallbackEmail: string | null,
): Promise<string | null> => {
  if (!clientId) return fallbackEmail;
  const client = await MyGlobal.prisma.broker_desk_clients.findFirst({
    where: { id: clientId },
    include: { tags: true },
  });
  if (!client) return fallbackEmail;
  const org = await MyGlobal.prisma.broker_desk_organizations.findFirst({
    where: { id: client.organization_id },
  });
  return readProfile(client.tags, client, org?.primary_province ?? "ON")
    .legal_name;
};

const toMappedAddress = async (
  row: Awaited<
    ReturnType<typeof MyGlobal.prisma.broker_desk_addresses.findFirstOrThrow>
  > & {
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
  },
): Promise<IBrokerDeskAddress> => {
  const clientId = row.clientOwner?.client.id ?? null;
  const legal = await legalNameFor(
    clientId,
    row.clientOwner?.client.email ?? null,
  );
  return toAddress(row, legal);
};

export const getCrmClientAddresses = async (
  clientId: string,
): Promise<IBrokerDeskAddress[]> => {
  const packed = await requireOrgClient(clientId);
  const legal = readProfile(
    packed.client.tags,
    packed.client,
    orgProvinceOf(packed),
  ).legal_name;
  return packed.client.addressOwners
    .filter((owner) => owner.address.deleted_at === null)
    .map((owner) => toAddress(owner.address, legal));
};

export const getCrmClientAddress = async (
  clientId: string,
  addressId: string,
): Promise<IBrokerDeskAddress> => {
  const packed = await requireOrgClient(clientId);
  const owner = packed.client.addressOwners.find(
    (row) => row.broker_desk_address_id === addressId,
  );
  if (!owner || owner.address.deleted_at !== null)
    throw new HttpException("Address not found", 404);
  const legal = readProfile(
    packed.client.tags,
    packed.client,
    orgProvinceOf(packed),
  ).legal_name;
  return toAddress(owner.address, legal);
};

export const postCrmClientAddress = async (
  clientId: string,
  body: IBrokerDeskAddress.ICreate,
): Promise<IBrokerDeskAddress> => {
  const packed = await requireOrgClient(clientId);
  if (!isAddressType(body.type))
    throw new HttpException("Invalid address type", 400);
  const now = new Date();
  const address = await MyGlobal.prisma.broker_desk_addresses.create({
    data: {
      id: randomUUID(),
      type: body.type,
      line1: body.line1,
      line2: emptyToNull(body.line2),
      city: body.city,
      province: body.province,
      postal_code: body.postal_code,
      created_at: now,
      updated_at: now,
      clientOwner: {
        create: {
          id: randomUUID(),
          created_at: now,
          updated_at: now,
          client: { connect: { id: clientId } },
        },
      },
    },
    include: addressInclude,
  });
  const legal = readProfile(
    packed.client.tags,
    packed.client,
    orgProvinceOf(packed),
  ).legal_name;
  return toAddress(address, legal);
};

export const putCrmClientAddress = async (
  clientId: string,
  addressId: string,
  body: IBrokerDeskAddress.IUpdate,
): Promise<IBrokerDeskAddress> => {
  const packed = await requireOrgClient(clientId);
  const owner = packed.client.addressOwners.find(
    (row) => row.broker_desk_address_id === addressId,
  );
  if (!owner || owner.address.deleted_at !== null)
    throw new HttpException("Address not found", 404);
  if (body.type !== undefined && !isAddressType(body.type))
    throw new HttpException("Invalid address type", 400);
  const updated = await MyGlobal.prisma.broker_desk_addresses.update({
    where: { id: addressId },
    data: {
      type: body.type ?? undefined,
      line1: body.line1 ?? undefined,
      line2: body.line2 === undefined ? undefined : emptyToNull(body.line2),
      city: body.city ?? undefined,
      province: body.province ?? undefined,
      postal_code: body.postal_code ?? undefined,
      updated_at: new Date(),
    },
    include: addressInclude,
  });
  const legal = readProfile(
    packed.client.tags,
    packed.client,
    orgProvinceOf(packed),
  ).legal_name;
  return toAddress(updated, legal);
};

export const deleteCrmClientAddress = async (
  clientId: string,
  addressId: string,
): Promise<void> => {
  const packed = await requireOrgClient(clientId);
  const owner = packed.client.addressOwners.find(
    (row) => row.broker_desk_address_id === addressId,
  );
  if (!owner) throw new HttpException("Address not found", 404);
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.broker_desk_address_of_clients.delete({
      where: { id: owner.id },
    }),
    MyGlobal.prisma.broker_desk_addresses.update({
      where: { id: addressId },
      data: { deleted_at: now, updated_at: now },
    }),
  ]);
};

export const getCrmOrganizationAddresses = async (): Promise<
  IBrokerDeskAddress[]
> => {
  const ctx = await requireCrmAdmin();
  const orgId = ctx.admin.broker_desk_organization_id;
  const rows =
    await MyGlobal.prisma.broker_desk_address_of_organizations.findMany({
      where: { broker_desk_organization_id: orgId },
      include: { address: { include: addressInclude } },
      orderBy: { created_at: "asc" },
    });
  const mapped: IBrokerDeskAddress[] = [];
  for (const row of rows) {
    if (row.address.deleted_at !== null) continue;
    mapped.push(await toMappedAddress(row.address));
  }
  return mapped;
};

export const postCrmOrganizationAddress = async (
  body: IBrokerDeskAddress.ICreate,
): Promise<IBrokerDeskAddress> => {
  const ctx = await requireCrmAdmin();
  if (!isAddressType(body.type))
    throw new HttpException("Invalid address type", 400);
  const now = new Date();
  const address = await MyGlobal.prisma.broker_desk_addresses.create({
    data: {
      id: randomUUID(),
      type: body.type,
      line1: body.line1,
      line2: emptyToNull(body.line2),
      city: body.city,
      province: body.province,
      postal_code: body.postal_code,
      created_at: now,
      updated_at: now,
      organizationOwner: {
        create: {
          id: randomUUID(),
          created_at: now,
          organization: {
            connect: { id: ctx.admin.broker_desk_organization_id },
          },
        },
      },
    },
    include: addressInclude,
  });
  return toMappedAddress(address);
};

export const getCrmOrganizationAddress = async (
  addressId: string,
): Promise<IBrokerDeskAddress> => {
  const ctx = await requireCrmAdmin();
  const owner =
    await MyGlobal.prisma.broker_desk_address_of_organizations.findFirst({
      where: {
        broker_desk_address_id: addressId,
        broker_desk_organization_id: ctx.admin.broker_desk_organization_id,
      },
      include: { address: { include: addressInclude } },
    });
  if (!owner || owner.address.deleted_at !== null)
    throw new HttpException("Address not found", 404);
  return toMappedAddress(owner.address);
};
