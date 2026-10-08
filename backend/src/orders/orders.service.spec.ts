import { BadRequestException, ConflictException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { OrdersService } from './orders.service';
import { OrderStockService } from './order-stock.service';

describe('OrdersService: regras de estoque', () => {
  const variant = {
    id: 'variant-id',
    productId: 'product-id',
    sku: 'SUT-COM-PRE-M',
    currentStock: 4,
    price: new Prisma.Decimal('89.90'),
    product: { id: 'product-id', name: 'Sutiã Comfort', active: true },
  };
  const item = {
    productVariantId: 'variant-id',
    quantity: 2,
    unitPrice: variant.price,
    subtotal: new Prisma.Decimal('179.80'),
  };
  const order = { id: 'order-id', number: 1042, status: OrderStatus.PENDING, items: [item] };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'id' }]),
    productVariant: {
      findMany: jest.fn().mockResolvedValue([variant]),
      findUniqueOrThrow: jest.fn().mockResolvedValue(variant),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn(),
    },
    inventoryMovement: { create: jest.fn() },
    order: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(order),
      update: jest.fn(),
      create: jest.fn().mockResolvedValue(order),
    },
    customer: { findUnique: jest.fn() },
  };
  const prisma = {
    $transaction: (fn: (t: Prisma.TransactionClient) => unknown) =>
      fn(tx as unknown as Prisma.TransactionClient),
  };
  const service = new OrdersService(prisma as unknown as PrismaService, new OrderStockService());
  beforeEach(() => {
    jest.clearAllMocks();
    tx.order.findUniqueOrThrow.mockResolvedValue(order);
    tx.productVariant.findMany.mockResolvedValue([variant]);
    tx.productVariant.updateMany.mockResolvedValue({ count: 1 });
  });
  it('pedido não pode ter quantidade zero', () => {
    expect(() =>
      service.create({ items: [{ productVariantId: 'variant-id', quantity: 0 }] }, 'seller'),
    ).toThrow(BadRequestException);
  });
  it('pedido não pode exceder estoque', async () => {
    await expect(
      service.create({ items: [{ productVariantId: 'variant-id', quantity: 5 }] }, 'seller'),
    ).rejects.toThrow('Estoque insuficiente');
    expect(tx.order.create).not.toHaveBeenCalled();
  });
  it('agrega variantes repetidas antes de verificar estoque', async () => {
    await expect(
      service.create(
        {
          items: [
            { productVariantId: 'variant-id', quantity: 3 },
            { productVariantId: 'variant-id', quantity: 3 },
          ],
        },
        'seller',
      ),
    ).rejects.toThrow('Estoque insuficiente');
  });
  it('calcula total usando Decimal no backend', async () => {
    await service.create({ items: [{ productVariantId: 'variant-id', quantity: 2 }] }, 'seller');
    const data = tx.order.create.mock.calls[0][0].data;
    expect(data.total.toFixed(2)).toBe('179.80');
    expect(tx.productVariant.updateMany).not.toHaveBeenCalled();
  });
  it('confirmar pagamento reduz estoque com atualização condicional', async () => {
    await service.updateStatus('order-id', OrderStatus.PAID, 'seller');
    expect(tx.productVariant.updateMany).toHaveBeenCalledWith({
      where: { id: 'variant-id', currentStock: { gte: 2 } },
      data: { currentStock: { decrement: 2 } },
    });
  });
  it('confirmar pagamento registra OUT ligado ao pedido', async () => {
    await service.updateStatus('order-id', OrderStatus.PAID, 'seller');
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'OUT',
        quantity: 2,
        orderId: 'order-id',
        previousStock: 4,
        resultingStock: 2,
        reason: 'Venda',
      }),
    });
  });
  it('baixa falha atomicamente se atualização condicional não encontrar saldo', async () => {
    tx.productVariant.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.updateStatus('order-id', OrderStatus.PAID, 'seller')).rejects.toThrow(
      'Estoque insuficiente',
    );
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
    expect(tx.order.update).not.toHaveBeenCalled();
  });
  it('cancelar pedido pago devolve estoque', async () => {
    tx.order.findUniqueOrThrow.mockResolvedValue({ ...order, status: OrderStatus.PAID });
    await service.cancel('order-id', 'admin');
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: 'variant-id' },
      data: { currentStock: { increment: 2 } },
    });
  });
  it('cancelamento registra IN e motivo rastreável', async () => {
    tx.order.findUniqueOrThrow.mockResolvedValue({ ...order, status: OrderStatus.PAID });
    await service.cancel('order-id', 'admin');
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'IN',
        quantity: 2,
        orderId: 'order-id',
        reason: 'Cancelamento do pedido #1042',
        previousStock: 4,
        resultingStock: 6,
      }),
    });
  });
  it('cancelamento duplicado falha sem devolver estoque', async () => {
    tx.order.findUniqueOrThrow.mockResolvedValue({ ...order, status: OrderStatus.CANCELLED });
    await expect(service.cancel('order-id', 'admin')).rejects.toThrow(ConflictException);
    expect(tx.productVariant.update).not.toHaveBeenCalled();
  });
  it('cancelar pedido pendente não devolve estoque que não foi consumido', async () => {
    await service.cancel('order-id', 'admin');
    expect(tx.productVariant.update).not.toHaveBeenCalled();
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
  });
  it('transição inválida falha', async () => {
    tx.order.findUniqueOrThrow.mockResolvedValue({ ...order, status: OrderStatus.DELIVERED });
    await expect(service.updateStatus('order-id', OrderStatus.PENDING, 'seller')).rejects.toThrow(
      BadRequestException,
    );
  });
  it('pedido enviado não pode ser cancelado', async () => {
    tx.order.findUniqueOrThrow.mockResolvedValue({ ...order, status: OrderStatus.SHIPPED });
    await expect(service.cancel('order-id', 'admin')).rejects.toThrow(BadRequestException);
  });
  it('pagamento duplicado não reduz estoque novamente', async () => {
    tx.order.findUniqueOrThrow.mockResolvedValue({ ...order, status: OrderStatus.PAID });
    await expect(service.updateStatus('order-id', OrderStatus.PAID, 'seller')).rejects.toThrow(
      BadRequestException,
    );
    expect(tx.productVariant.updateMany).not.toHaveBeenCalled();
  });
  it('produto inativo não pode ser vendido', async () => {
    tx.productVariant.findMany.mockResolvedValue([
      { ...variant, product: { ...variant.product, active: false } },
    ]);
    await expect(
      service.create({ items: [{ productVariantId: 'variant-id', quantity: 1 }] }, 'seller'),
    ).rejects.toThrow('inativo');
  });
});
