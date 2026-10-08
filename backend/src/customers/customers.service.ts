import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { PaginationDto, paginated, pagination } from '../common/pagination.dto';
import { CreateCustomerDto, UpdateCustomerDto } from './customers.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}
  async list(query: PaginationDto) {
    const where: Prisma.CustomerWhereInput = {
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        include: { _count: { select: { orders: true } } },
        ...pagination(query),
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.customer.count({ where }),
    ]);
    return paginated(data, total, query);
  }
  create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: dto });
  }
  async update(id: string, dto: UpdateCustomerDto) {
    if (!(await this.prisma.customer.findUnique({ where: { id } })))
      throw new NotFoundException('Cliente não encontrado.');
    return this.prisma.customer.update({ where: { id }, data: dto });
  }
}
