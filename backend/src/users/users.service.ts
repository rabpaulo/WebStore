import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma.service';
import { PaginationDto, paginated, pagination } from '../common/pagination.dto';
import { CreateUserDto } from './users.dto';

export const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  async list(query: PaginationDto) {
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        ...pagination(query),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(data, total, query);
  }
  async create(dto: CreateUserDto) {
    if (await this.prisma.user.findUnique({ where: { email: dto.email } }))
      throw new ConflictException('Este e-mail já está cadastrado.');
    const { password, ...data } = dto;
    return this.prisma.user.create({
      data: { ...data, passwordHash: await bcrypt.hash(password, 12) },
      select: USER_SELECT,
    });
  }
}
