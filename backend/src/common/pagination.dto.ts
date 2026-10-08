import { BadRequestException } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
  @ApiPropertyOptional({ default: 12, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 12;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  search?: string;
}
export class PeriodDto extends PaginationDto {
  @ApiPropertyOptional({ example: '2026-10-01T00:00:00-03:00' })
  @IsOptional()
  @IsDateString()
  from?: string;
  @ApiPropertyOptional({ example: '2026-10-31T23:59:59-03:00' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
export function dateRange(query: { from?: string; to?: string }) {
  const from = query.from ? new Date(query.from) : undefined;
  const to = query.to ? new Date(query.to) : undefined;
  if (from && to && from > to)
    throw new BadRequestException('O início do período deve ser anterior ao fim.');
  return { gte: from, lte: to };
}
export function pagination(query: PaginationDto) {
  return { skip: (query.page - 1) * query.limit, take: query.limit };
}
export function paginated<T>(data: T[], total: number, query: PaginationDto) {
  return {
    data,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}
