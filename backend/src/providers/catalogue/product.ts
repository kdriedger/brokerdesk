import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import {
  IBrokerDeskProduct,
  IPageIBrokerDeskProductISummary,
} from "../../api/structures/BrokerDeskCatalogueProduct";
import { MyGlobal } from "../../MyGlobal";
import { Prisma } from "../../prisma/client";
import {
  stringifyRecord,
  toProduct,
  toProductSummary,
} from "../../transformers/catalogue";
import { pageArgs, pageOf } from "../../utils/pagination";
import { requireAdmin } from "../auth/admin";

const liveProductCount = {
  _count: { select: { products: { where: { deleted_at: null } } } },
} as const;

const productInclude = {
  carrier: { include: liveProductCount },
  coverageItems: { where: { deleted_at: null }, orderBy: { code: "asc" as const } },
  commissionSchedule: true,
  _count: { select: { coverageItems: { where: { deleted_at: null } } } },
} as const;

const productListInclude = {
  carrier: { include: liveProductCount },
  _count: { select: { coverageItems: { where: { deleted_at: null } } } },
} as const;

const isUniqueConflict = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

const requireCarrier = async (carrierId: string) => {
  const row = await MyGlobal.prisma.broker_desk_carriers.findFirst({
    where: { id: carrierId },
  });
  if (!row) throw new HttpException("Carrier not found", 404);
  return row;
};

const requireProduct = async (productId: string) => {
  const row = await MyGlobal.prisma.broker_desk_products.findFirst({
    where: { id: productId, deleted_at: null },
    include: productInclude,
  });
  if (!row) throw new HttpException("Product not found", 404);
  return row;
};

export const patchProducts = async (
  body: IBrokerDeskProduct.IRequest,
): Promise<IPageIBrokerDeskProductISummary> => {
  await requireAdmin();
  const { page, limit, skip } = pageArgs(body);
  const search = body.search?.trim();
  const where: Prisma.broker_desk_productsWhereInput = {
    deleted_at: null,
    ...(body.active === undefined ? {} : { active: body.active }),
    ...(body.broker_desk_carrier_id === undefined
      ? {}
      : { broker_desk_carrier_id: body.broker_desk_carrier_id }),
    ...(body.line_of_business === undefined
      ? {}
      : { line_of_business: body.line_of_business }),
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
  const orderBy: Prisma.broker_desk_productsOrderByWithRelationInput =
    sort === "name"
      ? { name: order }
      : sort === "code"
        ? { code: order }
        : { created_at: order };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_products.count({ where }),
    MyGlobal.prisma.broker_desk_products.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: productListInclude,
    }),
  ]);
  return pageOf(rows.map(toProductSummary), total, page, limit);
};

export const postProducts = async (
  body: IBrokerDeskProduct.ICreate,
): Promise<IBrokerDeskProduct> => {
  await requireAdmin();
  await requireCarrier(body.broker_desk_carrier_id);
  const existing = await MyGlobal.prisma.broker_desk_products.findFirst({
    where: {
      broker_desk_carrier_id: body.broker_desk_carrier_id,
      code: body.code,
    },
  });
  if (existing !== null && existing.deleted_at === null)
    throw new HttpException("Product code already exists for carrier", 409);
  const now = new Date();
  const data = {
    name: body.name,
    code: body.code,
    line_of_business: body.line_of_business,
    description: body.description ?? null,
    active: body.active ?? true,
    eligibility_rules: stringifyRecord(body.eligibility_rules) ?? null,
    rating_schema: stringifyRecord(body.rating_schema) ?? null,
    updated_at: now,
    deleted_at: null as Date | null,
  };
  const row =
    existing === null
      ? await MyGlobal.prisma.broker_desk_products.create({
          data: {
            id: randomUUID(),
            broker_desk_carrier_id: body.broker_desk_carrier_id,
            created_at: now,
            ...data,
          },
          include: productInclude,
        })
      : await MyGlobal.prisma.broker_desk_products.update({
          where: { id: existing.id },
          data,
          include: productInclude,
        });
  return toProduct(row);
};

export const getProduct = async (
  productId: string,
): Promise<IBrokerDeskProduct> => {
  await requireAdmin();
  return toProduct(await requireProduct(productId));
};

export const putProduct = async (
  productId: string,
  body: IBrokerDeskProduct.IUpdate,
): Promise<IBrokerDeskProduct> => {
  await requireAdmin();
  await requireProduct(productId);
  try {
    const row = await MyGlobal.prisma.broker_desk_products.update({
      where: { id: productId },
      data: {
        name: body.name ?? undefined,
        code: body.code ?? undefined,
        description:
          body.description === undefined ? undefined : body.description,
        active: body.active ?? undefined,
        eligibility_rules:
          body.eligibility_rules === undefined
            ? undefined
            : stringifyRecord(body.eligibility_rules),
        rating_schema:
          body.rating_schema === undefined
            ? undefined
            : stringifyRecord(body.rating_schema),
        updated_at: new Date(),
      },
      include: productInclude,
    });
    return toProduct(row);
  } catch (error) {
    if (isUniqueConflict(error))
      throw new HttpException("Product code already exists for carrier", 409);
    throw error;
  }
};

export const deleteProduct = async (productId: string): Promise<void> => {
  await requireAdmin();
  await requireProduct(productId);
  const now = new Date();
  await MyGlobal.prisma.broker_desk_products.update({
    where: { id: productId },
    data: { deleted_at: now, updated_at: now },
  });
};
