import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { dateRange, paginated, pagination } from '../common/pagination.dto';
import { USER_SELECT } from '../users/users.service';
import { CreateOrderDto, OrderQueryDto } from './orders.dto';
import { assertTransition } from './order-state';
import { OrderStockService } from './order-stock.service';

export const ORDER_INCLUDE = {
  customer: true,
  createdBy: { select: USER_SELECT },
  items: { include: { productVariant: { include: { product: true } } } },
} satisfies Prisma.OrderInclude;
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: OrderStockService,
  ) {}
  async list(query: OrderQueryDto) {
    const number =
      query.search && /^#?\d+$/.test(query.search)
        ? Number(query.search.replace('#', ''))
        : undefined;
    const where: Prisma.OrderWhereInput = {
      status: query.status,
      createdAt: dateRange(query),
      OR: query.search
        ? [
            ...(number !== undefined ? [{ number }] : []),
            { customer: { name: { contains: query.search, mode: 'insensitive' } } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        ...pagination(query),
        orderBy: [{ createdAt: 'desc' }, { number: 'desc' }],
      }),
      this.prisma.order.count({ where }),
    ]);
    return paginated(data, total, query);
  }
  async detail(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    return order;
  }
  create(dto: CreateOrderDto, userId: string) {
    if (!dto.items.length) throw new BadRequestException('Adicione pelo menos um item ao pedido.');
    const quantities = new Map<string, number>();
    for (const item of dto.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 10000)
        throw new BadRequestException('A quantidade deve ser um inteiro de 1 a 10.000.');
      quantities.set(
        item.productVariantId,
        (quantities.get(item.productVariantId) ?? 0) + item.quantity,
      );
    }
    return this.prisma.$transaction(
      async (tx) => {
        if (dto.customerId && !(await tx.customer.findUnique({ where: { id: dto.customerId } })))
          throw new NotFoundException('Cliente não encontrado.');
        const variants = await this.stock.availableVariants(tx, [...quantities.keys()]);
        const items = [...quantities].map(([id, quantity]) => {
          const variant = variants.find((v) => v.id === id);
          if (!variant) throw new NotFoundException('Variante não encontrada.');
          if (variant.currentStock < quantity)
            throw new BadRequestException(`Estoque insuficiente para o SKU ${variant.sku}.`);
          return {
            productVariantId: id,
            quantity,
            unitPrice: variant.price,
            subtotal: variant.price.mul(quantity),
          };
        });
        const total = items.reduce((sum, item) => sum.add(item.subtotal), new Prisma.Decimal(0));
        if (total.gt('9999999999.99'))
          throw new BadRequestException('O total do pedido excede o limite permitido.');
        const order = await tx.order.create({
          data: {
            customerId: dto.customerId,
            createdById: userId,
            status: dto.payImmediately ? OrderStatus.PAID : OrderStatus.PENDING,
            paidAt: dto.payImmediately ? new Date() : null,
            total,
            items: { create: items },
          },
          include: ORDER_INCLUDE,
        });
        if (dto.payImmediately) await this.stock.consume(tx, items, order.id, userId);
        return order;
      },
      { timeout: 15000 },
    );
  }
  updateStatus(id: string, next: OrderStatus, userId: string) {
    if (next === OrderStatus.CANCELLED)
      throw new BadRequestException('Use a operação de cancelamento para devolver o estoque.');
    return this.prisma.$transaction(
      async (tx) => {
        const order = await this.lockOrder(tx, id);
        assertTransition(order.status, next);
        if (next === OrderStatus.PAID) await this.stock.consume(tx, order.items, id, userId);
        return tx.order.update({
          where: { id },
          data: { status: next, ...(next === OrderStatus.PAID ? { paidAt: new Date() } : {}) },
          include: ORDER_INCLUDE,
        });
      },
      { timeout: 15000 },
    );
  }
  cancel(id: string, userId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const order = await this.lockOrder(tx, id);
        if (order.status === OrderStatus.CANCELLED)
          throw new ConflictException('Este pedido já foi cancelado.');
        assertTransition(order.status, OrderStatus.CANCELLED);
        if (order.status === OrderStatus.PAID || order.status === OrderStatus.PREPARING)
          await this.stock.restore(tx, order.items, id, order.number, userId);
        return tx.order.update({
          where: { id },
          data: { status: OrderStatus.CANCELLED },
          include: ORDER_INCLUDE,
        });
      },
      { timeout: 15000 },
    );
  }
  private async lockOrder(tx: Prisma.TransactionClient, id: string) {
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT "id" FROM "Order" WHERE "id"::text = ${id} FOR UPDATE`;
    if (!rows.length) throw new NotFoundException('Pedido não encontrado.');
    return tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
  }
}
