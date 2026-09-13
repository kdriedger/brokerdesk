import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import { IBrokerDeskCommissionSchedule } from "../../api/structures/BrokerDeskCatalogueProduct";
import { MyGlobal } from "../../MyGlobal";
import {
  stringifyRecord,
  toCommissionSchedule,
} from "../../transformers/catalogue";
import { requireAdmin } from "../auth/admin";

const liveProductCount = {
  _count: { select: { products: { where: { deleted_at: null } } } },
} as const;

const productSummaryInclude = {
  carrier: { include: liveProductCount },
  _count: { select: { coverageItems: { where: { deleted_at: null } } } },
} as const;

const scheduleInclude = {
  product: { include: productSummaryInclude },
} as const;

const requireLiveProduct = async (productId: string) => {
  const row = await MyGlobal.prisma.broker_desk_products.findFirst({
    where: { id: productId, deleted_at: null },
  });
  if (!row) throw new HttpException("Product not found", 404);
  return row;
};

const findLiveSchedule = async (productId: string) =>
  MyGlobal.prisma.broker_desk_commission_schedules.findFirst({
    where: { broker_desk_product_id: productId, deleted_at: null },
    include: scheduleInclude,
  });

export const getCommissionSchedule = async (
  productId: string,
): Promise<IBrokerDeskCommissionSchedule | null> => {
  await requireAdmin();
  await requireLiveProduct(productId);
  const row = await findLiveSchedule(productId);
  return row === null ? null : toCommissionSchedule(row);
};

export const postCommissionSchedule = async (
  productId: string,
  body: IBrokerDeskCommissionSchedule.ICreate,
): Promise<IBrokerDeskCommissionSchedule> => {
  await requireAdmin();
  await requireLiveProduct(productId);
  const existing =
    await MyGlobal.prisma.broker_desk_commission_schedules.findFirst({
      where: { broker_desk_product_id: productId },
    });
  if (existing !== null && existing.deleted_at === null)
    throw new HttpException("Commission schedule already exists", 409);
  const now = new Date();
  const data = {
    agency_rate_percent: body.agency_rate_percent,
    producer_split_percent: body.producer_split_percent,
    tier_table_json: stringifyRecord(body.tier_table_json) ?? null,
    updated_at: now,
    deleted_at: null as Date | null,
  };
  const row =
    existing === null
      ? await MyGlobal.prisma.broker_desk_commission_schedules.create({
          data: {
            id: randomUUID(),
            broker_desk_product_id: productId,
            created_at: now,
            ...data,
          },
          include: scheduleInclude,
        })
      : await MyGlobal.prisma.broker_desk_commission_schedules.update({
          where: { id: existing.id },
          data,
          include: scheduleInclude,
        });
  return toCommissionSchedule(row);
};

export const putCommissionSchedule = async (
  productId: string,
  body: IBrokerDeskCommissionSchedule.IUpdate,
): Promise<IBrokerDeskCommissionSchedule> => {
  await requireAdmin();
  await requireLiveProduct(productId);
  const existing = await findLiveSchedule(productId);
  if (existing === null)
    throw new HttpException("Commission schedule not found", 404);
  const row = await MyGlobal.prisma.broker_desk_commission_schedules.update({
    where: { id: existing.id },
    data: {
      agency_rate_percent: body.agency_rate_percent ?? undefined,
      producer_split_percent: body.producer_split_percent ?? undefined,
      tier_table_json:
        body.tier_table_json === undefined
          ? undefined
          : stringifyRecord(body.tier_table_json),
      updated_at: new Date(),
    },
    include: scheduleInclude,
  });
  return toCommissionSchedule(row);
};

export const deleteCommissionSchedule = async (
  productId: string,
): Promise<void> => {
  await requireAdmin();
  await requireLiveProduct(productId);
  const existing = await findLiveSchedule(productId);
  if (existing === null)
    throw new HttpException("Commission schedule not found", 404);
  const now = new Date();
  await MyGlobal.prisma.broker_desk_commission_schedules.update({
    where: { id: existing.id },
    data: { deleted_at: now, updated_at: now },
  });
};
