import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import {
  IBrokerDeskCoverageItem,
  IPageIBrokerDeskCoverageItemISummary,
} from "../../api/structures/BrokerDeskCatalogueProduct";
import { MyGlobal } from "../../MyGlobal";
import { Prisma } from "../../prisma/client";
import {
  toCoverageItem,
  toCoverageItemInvert,
  toCoverageItemSummary,
} from "../../transformers/catalogue";
import { pageArgs, pageOf } from "../../utils/pagination";
import { requireAdmin } from "../auth/admin";

const liveProductCount = {
  _count: { select: { products: { where: { deleted_at: null } } } },
} as const;

const productSummaryInclude = {
  carrier: { include: liveProductCount },
  _count: { select: { coverageItems: { where: { deleted_at: null } } } },
} as const;

const coverageInclude = {
  product: { include: productSummaryInclude },
} as const;

const requireLiveProduct = async (productId: string) => {
  const row = await MyGlobal.prisma.broker_desk_products.findFirst({
    where: { id: productId, deleted_at: null },
    include: productSummaryInclude,
  });
  if (!row) throw new HttpException("Product not found", 404);
  return row;
};

const requireCoverageItem = async (
  productId: string,
  coverageItemId: string,
) => {
  const row = await MyGlobal.prisma.broker_desk_coverage_items.findFirst({
    where: {
      id: coverageItemId,
      broker_desk_product_id: productId,
      deleted_at: null,
    },
    include: coverageInclude,
  });
  if (!row) throw new HttpException("Coverage item not found", 404);
  return row;
};

export const patchCoverageItems = async (
  productId: string,
  body: IBrokerDeskCoverageItem.IRequest,
): Promise<IPageIBrokerDeskCoverageItemISummary> => {
  await requireAdmin();
  await requireLiveProduct(productId);
  const { page, limit, skip } = pageArgs(body);
  const search = body.search?.trim();
  const where: Prisma.broker_desk_coverage_itemsWhereInput = {
    broker_desk_product_id: productId,
    deleted_at: null,
    ...(body.is_optional === undefined ? {} : { is_optional: body.is_optional }),
    ...(search === undefined || search.length === 0
      ? {}
      : {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
          ],
        }),
  };
  const order = body.order ?? "asc";
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_coverage_items.count({ where }),
    MyGlobal.prisma.broker_desk_coverage_items.findMany({
      where,
      orderBy: { code: order },
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toCoverageItemSummary), total, page, limit);
};

export const postCoverageItems = async (
  productId: string,
  body: IBrokerDeskCoverageItem.ICreate,
): Promise<IBrokerDeskCoverageItem> => {
  await requireAdmin();
  await requireLiveProduct(productId);
  const existing = await MyGlobal.prisma.broker_desk_coverage_items.findFirst({
    where: { broker_desk_product_id: productId, code: body.code },
  });
  if (existing !== null && existing.deleted_at === null)
    throw new HttpException("Coverage item code already exists", 409);
  const now = new Date();
  const data = {
    name: body.name,
    code: body.code,
    default_limit: body.default_limit,
    is_optional: body.is_optional,
    updated_at: now,
    deleted_at: null as Date | null,
  };
  const row =
    existing === null
      ? await MyGlobal.prisma.broker_desk_coverage_items.create({
          data: {
            id: randomUUID(),
            broker_desk_product_id: productId,
            created_at: now,
            ...data,
          },
          include: coverageInclude,
        })
      : await MyGlobal.prisma.broker_desk_coverage_items.update({
          where: { id: existing.id },
          data,
          include: coverageInclude,
        });
  return toCoverageItem(row);
};

export const invertCoverageItem = async (
  productId: string,
  coverageItemId: string,
): Promise<IBrokerDeskCoverageItem.IInvert> => {
  await requireAdmin();
  await requireLiveProduct(productId);
  return toCoverageItemInvert(await requireCoverageItem(productId, coverageItemId));
};

export const putCoverageItem = async (
  productId: string,
  coverageItemId: string,
  body: IBrokerDeskCoverageItem.IUpdate,
): Promise<IBrokerDeskCoverageItem> => {
  await requireAdmin();
  await requireCoverageItem(productId, coverageItemId);
  try {
    const row = await MyGlobal.prisma.broker_desk_coverage_items.update({
      where: { id: coverageItemId },
      data: {
        name: body.name ?? undefined,
        code: body.code ?? undefined,
        default_limit: body.default_limit ?? undefined,
        is_optional: body.is_optional ?? undefined,
        updated_at: new Date(),
      },
      include: coverageInclude,
    });
    return toCoverageItem(row);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new HttpException("Coverage item code already exists", 409);
    throw error;
  }
};

export const deleteCoverageItem = async (
  productId: string,
  coverageItemId: string,
): Promise<void> => {
  await requireAdmin();
  await requireCoverageItem(productId, coverageItemId);
  const now = new Date();
  await MyGlobal.prisma.broker_desk_coverage_items.update({
    where: { id: coverageItemId },
    data: { deleted_at: now, updated_at: now },
  });
};
