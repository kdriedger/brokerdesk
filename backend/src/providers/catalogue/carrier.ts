import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import {
  IBrokerDeskCarrier,
  IBrokerDeskCarrierAppointment,
  IPageIBrokerDeskCarrierAppointmentISummary,
  IPageIBrokerDeskCarrierISummary,
} from "../../api/structures/BrokerDeskCatalogueCarrier";
import { MyGlobal } from "../../MyGlobal";
import { Prisma } from "../../prisma/client";
import {
  toAppointment,
  toAppointmentSummary,
  toCarrier,
  toCarrierSummary,
} from "../../transformers/catalogue";
import { pageArgs, pageOf } from "../../utils/pagination";
import { requireAdmin } from "../auth/admin";

const liveProductCount = {
  _count: { select: { products: { where: { deleted_at: null } } } },
} as const;

const isUniqueConflict = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

const requireCarrier = async (carrierId: string) => {
  const row = await MyGlobal.prisma.broker_desk_carriers.findFirst({
    where: { id: carrierId },
    include: {
      ...liveProductCount,
      products: { where: { deleted_at: null }, orderBy: { name: "asc" } },
    },
  });
  if (!row) throw new HttpException("Carrier not found", 404);
  return row;
};

const requireAppointment = async (
  orgId: string,
  carrierId: string,
  appointmentId: string,
) => {
  const row = await MyGlobal.prisma.broker_desk_carrier_appointments.findFirst({
    where: {
      id: appointmentId,
      broker_desk_carrier_id: carrierId,
      broker_desk_organization_id: orgId,
      deleted_at: null,
    },
    include: { carrier: { include: liveProductCount } },
  });
  if (!row) throw new HttpException("Appointment not found", 404);
  return row;
};

export const patchCarriers = async (
  body: IBrokerDeskCarrier.IRequest,
): Promise<IPageIBrokerDeskCarrierISummary> => {
  await requireAdmin();
  const { page, limit, skip } = pageArgs(body);
  const search = body.search?.trim();
  const where: Prisma.broker_desk_carriersWhereInput = {
    ...(body.active === undefined ? {} : { active: body.active }),
    ...(search === undefined || search.length === 0
      ? {}
      : {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
          ],
        }),
  };
  const sort = body.sort ?? "created_at";
  const order = body.order ?? "asc";
  const orderBy: Prisma.broker_desk_carriersOrderByWithRelationInput =
    sort === "name"
      ? { name: order }
      : sort === "code"
        ? { code: order }
        : { created_at: order };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_carriers.count({ where }),
    MyGlobal.prisma.broker_desk_carriers.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: liveProductCount,
    }),
  ]);
  return pageOf(rows.map(toCarrierSummary), total, page, limit);
};

export const postCarriers = async (
  body: IBrokerDeskCarrier.ICreate,
): Promise<IBrokerDeskCarrier> => {
  await requireAdmin();
  const now = new Date();
  try {
    const row = await MyGlobal.prisma.broker_desk_carriers.create({
      data: {
        id: randomUUID(),
        name: body.name,
        code: body.code,
        financial_strength_note: body.financial_strength_note ?? null,
        website: body.website ?? null,
        service_email: body.service_email ?? null,
        service_phone: body.service_phone ?? null,
        notes: body.notes ?? null,
        active: body.active ?? true,
        created_at: now,
        updated_at: now,
      },
      include: {
        ...liveProductCount,
        products: { where: { deleted_at: null }, orderBy: { name: "asc" } },
      },
    });
    return toCarrier(row);
  } catch (error) {
    if (isUniqueConflict(error))
      throw new HttpException("Carrier code already exists", 409);
    throw error;
  }
};

export const getCarrier = async (
  carrierId: string,
): Promise<IBrokerDeskCarrier> => {
  await requireAdmin();
  return toCarrier(await requireCarrier(carrierId));
};

export const putCarrier = async (
  carrierId: string,
  body: IBrokerDeskCarrier.IUpdate,
): Promise<IBrokerDeskCarrier> => {
  await requireAdmin();
  await requireCarrier(carrierId);
  try {
    const row = await MyGlobal.prisma.broker_desk_carriers.update({
      where: { id: carrierId },
      data: {
        name: body.name ?? undefined,
        code: body.code ?? undefined,
        financial_strength_note:
          body.financial_strength_note === undefined
            ? undefined
            : body.financial_strength_note,
        website: body.website === undefined ? undefined : body.website,
        service_email:
          body.service_email === undefined ? undefined : body.service_email,
        service_phone:
          body.service_phone === undefined ? undefined : body.service_phone,
        notes: body.notes === undefined ? undefined : body.notes,
        active: body.active ?? undefined,
        updated_at: new Date(),
      },
      include: {
        ...liveProductCount,
        products: { where: { deleted_at: null }, orderBy: { name: "asc" } },
      },
    });
    return toCarrier(row);
  } catch (error) {
    if (isUniqueConflict(error))
      throw new HttpException("Carrier code already exists", 409);
    throw error;
  }
};

export const deleteCarrier = async (carrierId: string): Promise<void> => {
  await requireAdmin();
  await requireCarrier(carrierId);
  await MyGlobal.prisma.broker_desk_carriers.update({
    where: { id: carrierId },
    data: { active: false, updated_at: new Date() },
  });
};

export const patchCarrierAppointments = async (
  carrierId: string,
  body: IBrokerDeskCarrierAppointment.IRequest,
): Promise<IPageIBrokerDeskCarrierAppointmentISummary> => {
  const { admin } = await requireAdmin();
  await requireCarrier(carrierId);
  if (
    body.broker_desk_carrier_id !== undefined &&
    body.broker_desk_carrier_id !== carrierId
  )
    throw new HttpException("Carrier id mismatch", 400);
  const { page, limit, skip } = pageArgs(body);
  const now = new Date();
  const expiring =
    body.expiring_within_days === undefined
      ? undefined
      : new Date(
          now.getTime() + body.expiring_within_days * 24 * 60 * 60 * 1000,
        );
  const where: Prisma.broker_desk_carrier_appointmentsWhereInput = {
    broker_desk_organization_id: admin.broker_desk_organization_id,
    broker_desk_carrier_id: carrierId,
    deleted_at: null,
    ...(body.status === undefined ? {} : { status: body.status }),
    ...(expiring === undefined ? {} : { expires_at: { lte: expiring } }),
  };
  const order = body.order ?? "asc";
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_carrier_appointments.count({ where }),
    MyGlobal.prisma.broker_desk_carrier_appointments.findMany({
      where,
      orderBy: { expires_at: order },
      skip,
      take: limit,
      include: { carrier: { include: liveProductCount } },
    }),
  ]);
  return pageOf(rows.map(toAppointmentSummary), total, page, limit);
};

export const postCarrierAppointments = async (
  carrierId: string,
  body: IBrokerDeskCarrierAppointment.ICreate,
): Promise<IBrokerDeskCarrierAppointment> => {
  const { admin } = await requireAdmin();
  await requireCarrier(carrierId);
  if (body.broker_desk_carrier_id !== carrierId)
    throw new HttpException("Carrier id mismatch", 400);
  const orgId = admin.broker_desk_organization_id;
  const existing =
    await MyGlobal.prisma.broker_desk_carrier_appointments.findFirst({
      where: {
        broker_desk_organization_id: orgId,
        broker_desk_carrier_id: carrierId,
      },
    });
  if (existing !== null && existing.deleted_at === null)
    throw new HttpException("Appointment already exists", 409);
  const now = new Date();
  const data = {
    status: body.status,
    appointed_at: new Date(body.appointed_at),
    expires_at: new Date(body.expires_at),
    updated_at: now,
    deleted_at: null as Date | null,
  };
  const row =
    existing === null
      ? await MyGlobal.prisma.broker_desk_carrier_appointments.create({
          data: {
            id: randomUUID(),
            broker_desk_organization_id: orgId,
            broker_desk_carrier_id: carrierId,
            created_at: now,
            ...data,
          },
          include: { carrier: { include: liveProductCount } },
        })
      : await MyGlobal.prisma.broker_desk_carrier_appointments.update({
          where: { id: existing.id },
          data,
          include: { carrier: { include: liveProductCount } },
        });
  return toAppointment(row);
};

export const getCarrierAppointment = async (
  carrierId: string,
  appointmentId: string,
): Promise<IBrokerDeskCarrierAppointment> => {
  const { admin } = await requireAdmin();
  return toAppointment(
    await requireAppointment(
      admin.broker_desk_organization_id,
      carrierId,
      appointmentId,
    ),
  );
};

export const putCarrierAppointment = async (
  carrierId: string,
  appointmentId: string,
  body: IBrokerDeskCarrierAppointment.IUpdate,
): Promise<IBrokerDeskCarrierAppointment> => {
  const { admin } = await requireAdmin();
  await requireAppointment(
    admin.broker_desk_organization_id,
    carrierId,
    appointmentId,
  );
  const row = await MyGlobal.prisma.broker_desk_carrier_appointments.update({
    where: { id: appointmentId },
    data: {
      status: body.status ?? undefined,
      appointed_at:
        body.appointed_at === undefined
          ? undefined
          : new Date(body.appointed_at),
      expires_at:
        body.expires_at === undefined ? undefined : new Date(body.expires_at),
      updated_at: new Date(),
    },
    include: { carrier: { include: liveProductCount } },
  });
  return toAppointment(row);
};

export const deleteCarrierAppointment = async (
  carrierId: string,
  appointmentId: string,
): Promise<void> => {
  const { admin } = await requireAdmin();
  await requireAppointment(
    admin.broker_desk_organization_id,
    carrierId,
    appointmentId,
  );
  const now = new Date();
  await MyGlobal.prisma.broker_desk_carrier_appointments.update({
    where: { id: appointmentId },
    data: { deleted_at: now, updated_at: now },
  });
};
