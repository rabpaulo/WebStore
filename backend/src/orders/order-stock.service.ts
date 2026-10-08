import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryMovementType, Prisma } from '@prisma/client';
import { lockVariants } from '../common/locks';

type StockItem = { productVariantId: string; quantity: number };
@Injectable()
export class OrderStockService {
  async availableVariants(tx: Prisma.TransactionClient, ids: string[]) {
    const references = await tx.productVariant.findMany({
      where: { id: { in: ids } },
      select: { productId: true },
    });
    const productIds = [...new Set(references.map((v) => v.productId))].sort();
    if (productIds.length)
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "Product" WHERE "id"::text IN (${Prisma.join(productIds)}) ORDER BY "id" FOR UPDATE`,
      );
    await lockVariants(tx, ids);
    const variants = await tx.productVariant.findMany({
      where: { id: { in: ids } },
      include: { product: true },
    });
    for (const variant of variants)
      if (!variant.product.active)
        throw new BadRequestException(`O produto ${variant.product.name} está inativo.`);
    return variants;
  }
  async consume(tx: Prisma.TransactionClient, items: StockItem[], orderId: string, userId: string) {
    const variants = await this.availableVariants(
      tx,
      items.map((i) => i.productVariantId),
    );
    for (const item of [...items].sort((a, b) =>
      a.productVariantId.localeCompare(b.productVariantId),
    )) {
      const variant = variants.find((v) => v.id === item.productVariantId);
      if (!variant) throw new NotFoundException('Variante não encontrada.');
      const result = await tx.productVariant.updateMany({
        where: { id: variant.id, currentStock: { gte: item.quantity } },
        data: { currentStock: { decrement: item.quantity } },
      });
      if (result.count !== 1)
        throw new BadRequestException(`Estoque insuficiente para o SKU ${variant.sku}.`);
      await tx.inventoryMovement.create({
        data: {
          productVariantId: variant.id,
          type: InventoryMovementType.OUT,
          quantity: item.quantity,
          previousStock: variant.currentStock,
          resultingStock: variant.currentStock - item.quantity,
          reason: 'Venda',
          orderId,
          createdById: userId,
        },
      });
    }
  }
  async restore(
    tx: Prisma.TransactionClient,
    items: StockItem[],
    orderId: string,
    orderNumber: number,
    userId: string,
  ) {
    await lockVariants(
      tx,
      items.map((i) => i.productVariantId),
    );
    for (const item of [...items].sort((a, b) =>
      a.productVariantId.localeCompare(b.productVariantId),
    )) {
      const variant = await tx.productVariant.findUniqueOrThrow({
        where: { id: item.productVariantId },
      });
      await tx.productVariant.update({
        where: { id: variant.id },
        data: { currentStock: { increment: item.quantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          productVariantId: variant.id,
          type: InventoryMovementType.IN,
          quantity: item.quantity,
          previousStock: variant.currentStock,
          resultingStock: variant.currentStock + item.quantity,
          reason: `Cancelamento do pedido #${orderNumber}`,
          orderId,
          createdById: userId,
        },
      });
    }
  }
}
