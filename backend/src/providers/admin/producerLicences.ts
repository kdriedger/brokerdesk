import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import { IBrokerDeskProducerLicence } from "../../api/structures/BrokerDeskActorsProducer";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import {
  toProducerLicence,
  toProducerLicenceSummary,
} from "../../transformers/producer";
import { pageArgs, pageOf } from "../../utils/pagination";
import { loadOrgProducer } from "./producers";

const licenceWhere = (
  producerId: string,
  body: IBrokerDeskProducerLicence.IRequest,
) => {
  const now = new Date();
  return {
    broker_desk_producer_id: producerId,
    deleted_at: null,
    ...(body.province_code ? { province_code: body.province_code } : {}),
    ...(body.licence_type ? { licence_type: body.licence_type } : {}),
    ...(body.status ? { status: body.status } : {}),
    ...(body.expired === true
      ? { expiry_date: { lt: now } }
      : body.expiring_within_days !== undefined
        ? {
            expiry_date: {
              gte: now,
              lte: new Date(
                now.getTime() + body.expiring_within_days * 86400000,
              ),
            },
          }
        : body.expired === false
          ? { expiry_date: { gte: now } }
          : {}),
  };
};

const loadLicence = async (producerId: string, licenceId: string) => {
  const { producer } = await loadOrgProducer(producerId);
  const licence = await MyGlobal.prisma.broker_desk_producer_licences.findFirst(
    {
      where: {
        id: licenceId,
        broker_desk_producer_id: producer.id,
        deleted_at: null,
      },
    },
  );
  if (!licence) throw new HttpException("Not found", 404);
  return { producer, licence };
};

export const patchAdminProducerLicences = async (
  producerId: string,
  body: IBrokerDeskProducerLicence.IRequest,
): Promise<IPage<IBrokerDeskProducerLicence.ISummary>> => {
  const { producer } = await loadOrgProducer(producerId);
  const { page, limit, skip } = pageArgs(body);
  const where = licenceWhere(producer.id, body);
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_producer_licences.count({ where }),
    MyGlobal.prisma.broker_desk_producer_licences.findMany({
      where,
      orderBy: { expiry_date: "asc" },
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toProducerLicenceSummary), total, page, limit);
};

export const postAdminProducerLicences = async (
  producerId: string,
  body: IBrokerDeskProducerLicence.ICreate,
): Promise<IBrokerDeskProducerLicence> => {
  const { producer } = await loadOrgProducer(producerId);
  const clash = await MyGlobal.prisma.broker_desk_producer_licences.findFirst({
    where: {
      broker_desk_producer_id: producer.id,
      province_code: body.province_code,
      licence_type: body.licence_type,
      deleted_at: null,
    },
  });
  if (clash)
    throw new HttpException(
      "Licence already registered for this province and type",
      409,
    );
  const now = new Date();
  const created = await MyGlobal.prisma.broker_desk_producer_licences.create({
    data: {
      id: randomUUID(),
      broker_desk_producer_id: producer.id,
      province_code: body.province_code,
      licence_type: body.licence_type,
      licence_number: body.licence_number,
      issue_date: new Date(body.issue_date),
      expiry_date: new Date(body.expiry_date),
      status: body.status,
      created_at: now,
      updated_at: now,
    },
  });
  return toProducerLicence(created, producer);
};

export const getAdminProducerLicencesAt = async (
  producerId: string,
  licenceId: string,
): Promise<IBrokerDeskProducerLicence> => {
  const { producer, licence } = await loadLicence(producerId, licenceId);
  return toProducerLicence(licence, producer);
};

export const putAdminProducerLicences = async (
  producerId: string,
  licenceId: string,
  body: IBrokerDeskProducerLicence.IUpdate,
): Promise<IBrokerDeskProducerLicence> => {
  const { producer, licence } = await loadLicence(producerId, licenceId);
  const province = body.province_code ?? licence.province_code;
  const licenceType = body.licence_type ?? licence.licence_type;
  if (
    province !== licence.province_code ||
    licenceType !== licence.licence_type
  ) {
    const clash = await MyGlobal.prisma.broker_desk_producer_licences.findFirst(
      {
        where: {
          broker_desk_producer_id: producer.id,
          province_code: province,
          licence_type: licenceType,
          deleted_at: null,
          id: { not: licence.id },
        },
      },
    );
    if (clash)
      throw new HttpException(
        "Licence already registered for this province and type",
        409,
      );
  }
  const updated = await MyGlobal.prisma.broker_desk_producer_licences.update({
    where: { id: licence.id },
    data: {
      province_code: body.province_code ?? undefined,
      licence_type: body.licence_type ?? undefined,
      licence_number: body.licence_number ?? undefined,
      issue_date:
        body.issue_date === undefined ? undefined : new Date(body.issue_date),
      expiry_date:
        body.expiry_date === undefined ? undefined : new Date(body.expiry_date),
      status: body.status ?? undefined,
      updated_at: new Date(),
    },
  });
  return toProducerLicence(updated, producer);
};

export const deleteAdminProducerLicences = async (
  producerId: string,
  licenceId: string,
): Promise<void> => {
  const { licence } = await loadLicence(producerId, licenceId);
  const now = new Date();
  await MyGlobal.prisma.broker_desk_producer_licences.update({
    where: { id: licence.id },
    data: { deleted_at: now, updated_at: now },
  });
};
