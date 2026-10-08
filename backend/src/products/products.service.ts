import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryMovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { paginated, pagination } from '../common/pagination.dto';
import {
  CreateProductDto,
  CreateVariantDto,
  ProductQueryDto,
  UpdateProductDto,
  UpdateVariantDto,
} from './products.dto';

export const STOCK_STATUS = { OK: 'OK', LOW: 'LOW', OUT: 'OUT' } as const;
export function stockStatus(stock: number, minimum: number) {
  return stock === 0 ? STOCK_STATUS.OUT : stock <= minimum ? STOCK_STATUS.LOW : STOCK_STATUS.OK;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = {
      categoryId: query.categoryId,
      active: query.active ? query.active === 'true' : undefined,
      name: query.search ? { contains: query.search, mode: 'insensitive' } : undefined,
    };
    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { category: true, variants: true },
        ...pagination(query),
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.product.count({ where }),
    ]);
    const data = products.map((product) => ({
      ...product,
      variantCount: product.variants.length,
      totalStock: product.variants.reduce((sum, variant) => sum + variant.currentStock, 0),
      stockStatus: product.variants.some((v) => v.currentStock === 0)
        ? 'OUT'
        : product.variants.some((v) => v.currentStock <= v.minimumStock)
          ? 'LOW'
          : 'OK',
    }));
    return paginated(data, total, query);
  }
  async detail(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }] } },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    return product;
  }
  async create(dto: CreateProductDto, userId: string) {
    const skus = dto.variants.map((v) => v.sku);
    if (new Set(skus).size !== skus.length)
      throw new ConflictException('SKU duplicado nas variantes do produto.');
    if (await this.prisma.productVariant.findFirst({ where: { sku: { in: skus } } }))
      throw new ConflictException('Já existe uma variante com este SKU.');
    await this.checkCategory(dto.categoryId);
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: { name: dto.name, description: dto.description, categoryId: dto.categoryId },
      });
      for (const variant of dto.variants) await this.insertVariant(tx, product.id, variant, userId);
      return tx.product.findUniqueOrThrow({
        where: { id: product.id },
        include: { category: true, variants: true },
      });
    });
  }
  async update(id: string, dto: UpdateProductDto) {
    await this.detail(id);
    if (dto.categoryId) await this.checkCategory(dto.categoryId);
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true, variants: true },
    });
  }
  async addVariant(id: string, dto: CreateVariantDto, userId: string) {
    await this.detail(id);
    if (await this.prisma.productVariant.findUnique({ where: { sku: dto.sku } }))
      throw new ConflictException('Já existe uma variante com este SKU.');
    return this.prisma.$transaction((tx) => this.insertVariant(tx, id, dto, userId));
  }
  async updateVariant(id: string, dto: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id } });
    if (!variant) throw new NotFoundException('Variante não encontrada.');
    return this.prisma.productVariant.update({ where: { id }, data: dto });
  }
  private async checkCategory(id: string) {
    if (!(await this.prisma.category.findUnique({ where: { id } })))
      throw new NotFoundException('Categoria não encontrada.');
  }
  private async insertVariant(
    tx: Prisma.TransactionClient,
    productId: string,
    dto: CreateVariantDto,
    userId: string,
  ) {
    const { initialStock, ...data } = dto;
    const variant = await tx.productVariant.create({
      data: { ...data, productId, currentStock: initialStock },
    });
    if (initialStock > 0)
      await tx.inventoryMovement.create({
        data: {
          productVariantId: variant.id,
          type: InventoryMovementType.IN,
          quantity: initialStock,
          previousStock: 0,
          resultingStock: initialStock,
          reason: 'Estoque inicial',
          createdById: userId,
        },
      });
    return variant;
  }
}
