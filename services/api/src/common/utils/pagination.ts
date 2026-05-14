import { PaginationDTO } from '../dto/pagination.dto';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function paginate<T>(data: T[], total: number, pagination: PaginationDTO): PaginatedResult<T> {
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 20;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}