import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};
export function assertTransition(current: OrderStatus, next: OrderStatus) {
  if (!STATUS_TRANSITIONS[current].includes(next))
    throw new BadRequestException(`Transição de ${current} para ${next} não permitida.`);
}
