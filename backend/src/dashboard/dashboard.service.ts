import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, Role, OrderStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { ORDER_INCLUDE } from '../orders/orders.service';

export function currentMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}`;
}
export function monthBounds(month: string) {
  const [year, m] = month.split('-').map(Number);
  if (year < 2000 || year > 2100)
    throw new BadRequestException('Selecione um mês entre 2000 e 2100.');
  const start = new Date(`${month}-01T00:00:00-03:00`);
  const end = new Date(Date.UTC(year, m, 1, 3));
  return { start, end, days: new Date(Date.UTC(year, m, 0)).getUTCDate() };
}
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}
  async summary(role: Role, requestedMonth?: string) {
    const month = requestedMonth ?? currentMonth();
    const { start, end, days } = monthBounds(month);
    return this.prisma.$transaction(
      async (tx) => {
        const active = { product: { active: true } };
        const lowWhere = {
          ...active,
          currentStock: { gt: 0, lte: this.prisma.productVariant.fields.minimumStock },
        };
        const zeroWhere = { ...active, currentStock: 0 };
        const paidWhere = {
          paidAt: { gte: start, lt: end },
          status: {
            in: [
              OrderStatus.PAID,
              OrderStatus.PREPARING,
              OrderStatus.SHIPPED,
              OrderStatus.DELIVERED,
            ],
          },
        };
        const [
          products,
          ordersThisMonth,
          lowStock,
          outOfStock,
          stock,
          variants,
          recentOrders,
          replenishment,
          revenue,
          daily,
        ] = await Promise.all([
          tx.product.count(),
          tx.order.count({ where: { createdAt: { gte: start, lt: end } } }),
          tx.productVariant.count({ where: lowWhere }),
          tx.productVariant.count({ where: zeroWhere }),
          tx.productVariant.aggregate({ where: active, _sum: { currentStock: true } }),
          tx.productVariant.count({ where: active }),
          tx.order.findMany({
            where: { createdAt: { gte: start, lt: end } },
            take: 5,
            orderBy: [{ createdAt: 'desc' }, { number: 'desc' }],
            include: ORDER_INCLUDE,
          }),
          tx.productVariant.findMany({
            where: {
              ...active,
              currentStock: { lte: this.prisma.productVariant.fields.minimumStock },
            },
            take: 5,
            orderBy: [{ currentStock: 'asc' }, { sku: 'asc' }],
            include: { product: { include: { category: true } } },
          }),
          role === Role.ADMIN
            ? tx.order.aggregate({ where: paidWhere, _sum: { total: true } })
            : Promise.resolve(null),
          tx.$queryRaw<
            { day: string; orders: bigint; total: Prisma.Decimal }[]
          >`SELECT to_char("paidAt" AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD') AS "day", COUNT(*) AS "orders", SUM("total") AS "total" FROM "Order" WHERE "paidAt" >= ${start} AND "paidAt" < ${end} AND "status" IN ('PAID','PREPARING','SHIPPED','DELIVERED') GROUP BY "day" ORDER BY "day"`,
        ]);
        return {
          month,
          products,
          ordersThisMonth,
          lowStock,
          outOfStock,
          stockUnits: stock._sum.currentStock ?? 0,
          totalVariants: variants,
          revenueThisMonth: revenue ? (revenue._sum.total ?? new Prisma.Decimal(0)) : null,
          recentOrders,
          replenishment: replenishment.map((v) => ({
            ...v,
            suggestedQuantity: Math.max(0, v.minimumStock * 2 - v.currentStock),
          })),
          salesByDay: Array.from({ length: days }, (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, '0')}`;
            const row = daily.find((d) => d.day === date);
            return {
              date,
              orders: Number(row?.orders ?? 0),
              total: role === Role.ADMIN ? (row?.total ?? new Prisma.Decimal(0)) : null,
            };
          }),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
