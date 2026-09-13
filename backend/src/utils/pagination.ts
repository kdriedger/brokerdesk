import { IPage } from "../api/structures/IPage";

export const pageOf = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): IPage<T> => ({
  pagination: {
    page,
    limit,
    total_count: total,
    total_pages: Math.max(1, Math.ceil(total / limit)),
  },
  data,
});

export const pageArgs = (body: { page?: number; limit?: number }): {
  page: number;
  limit: number;
  skip: number;
} => {
  const page = Math.max(1, body.page ?? 1);
  const limit = Math.min(100, Math.max(1, body.limit ?? 20));
  return { page, limit, skip: (page - 1) * limit };
};
