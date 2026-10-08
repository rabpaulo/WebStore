import { BadRequestException, Injectable } from '@nestjs/common';
import { InventoryMovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { dateRange, paginated, pagination } from '../common/pagination.dto';
import { lockVariants } from '../common/locks';
import { stockStatus } from '../products/products.service';
import { USER_SELECT } from '../users/users.service';
import {
  InventoryAdjustmentDto,
  InventoryEntryDto,
  InventoryQueryDto,
  MovementQueryDto,
} from './inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}
  async list(query: InventoryQueryDto) {
    const where: Prisma.ProductVariantWhereInput = {
      productId: query.productId,
      product: {
        categoryId: query.categoryId,
        active: query.active ? query.active === 'true' : undefined,
      },
      sku: query.sku ? { contains: query.sku, mode: 'insensitive' } : undefined,
      OR: query.search
        ? [
            { sku: { contains: query.search, mode: 'insensitive' } },
            { product: { name: { contains: query.search, mode: 'insensitive' } } },
          ]
        : undefined,
    };
    if (query.stockStatus === 'OUT') where.currentStock = 0;
    if (query.stockStatus === 'LOW')
      where.currentStock = { gt: 0, lte: this.prisma.productVariant.fields.minimumStock };
    if (query.stockStatus === 'OK')
      where.currentStock = { gt: this.prisma.productVariant.fields.minimumStock };
    if (query.replenishment === 'true')
      where.currentStock = { lte: this.prisma.productVariant.fields.minimumStock };
    const [variants, total] = await this.prisma.$transaction([
      this.prisma.productVariant.findMany({
        where,
        include: { product: { include: { category: true } } },
        ...pagination(query),
        orderBy: [{ product: { name: 'asc' } }, { sku: 'asc' }],
      }),
      this.prisma.productVariant.count({ where }),
    ]);
    return paginated(
      variants.map((v) => ({
        ...v,
        stockStatus: stockStatus(v.currentStock, v.minimumStock),
        suggestedQuantity: Math.max(0, v.minimumStock * 2 - v.currentStock),
      })),
      total,
      query,
    );
  }
  async movements(query: MovementQueryDto) {
    const where: Prisma.InventoryMovementWhereInput = {
      orderId: query.orderId,
      type: query.type,
      createdAt: dateRange(query),
      productVariant: {
        productId: query.productId,
        sku: query.sku ? { contains: query.sku, mode: 'insensitive' } : undefined,
      },
      OR: query.search
        ? [
            { reason: { contains: query.search, mode: 'insensitive' } },
            { productVariant: { sku: { contains: query.search, mode: 'insensitive' } } },
            {
              productVariant: {
                product: { name: { contains: query.search, mode: 'insensitive' } },
              },
            },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.findMany({
        where,
        include: {
          productVariant: { include: { product: true } },
          createdBy: { select: USER_SELECT },
          order: { select: { id: true, number: true } },
        },
        ...pagination(query),
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);
    return paginated(data, total, query);
  }
  entry(dto: InventoryEntryDto, userId: string) {
    if (!Number.isInteger(dto.quantity) || dto.quantity <= 0)
      throw new BadRequestException('A quantidade deve ser um inteiro maior que zero.');
    return this.changeStock(
      dto.productVariantId,
      userId,
      dto.reason,
      InventoryMovementType.IN,
      (current) => ({ quantity: dto.quantity, next: current + dto.quantity }),
    );
  }
  adjustment(dto: InventoryAdjustmentDto, userId: string) {
    if (!Number.isInteger(dto.targetStock) || dto.targetStock < 0)
      throw new BadRequestException('O estoque não pode ser negativo.');
    return this.changeStock(
      dto.productVariantId,
      userId,
      dto.reason,
      InventoryMovementType.ADJUSTMENT,
      (current) => ({ quantity: dto.targetStock - current, next: dto.targetStock }),
    );
  }
  private changeStock(
    id: string,
    userId: string,
    reason: string,
    type: InventoryMovementType,
    calculate: (current: number) => { quantity: number; next: number },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await lockVariants(tx, [id]);
      const variant = await tx.productVariant.findUniqueOrThrow({ where: { id } });
      const { quantity, next } = calculate(variant.currentStock);
      if (quantity === 0)
        throw new BadRequestException('O saldo informado é igual ao estoque atual.');
      const updated = await tx.productVariant.update({
        where: { id },
        data: { currentStock: next },
      });
      const movement = await tx.inventoryMovement.create({
        data: {
          productVariantId: id,
          type,
          quantity,
          previousStock: variant.currentStock,
          resultingStock: next,
          reason,
          createdById: userId,
        },
      });
      return { variant: updated, movement };
    });
  }
}
