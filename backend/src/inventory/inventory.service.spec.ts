import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../common/prisma.service';

describe('InventoryService', () => {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'variant-id' }]),
    productVariant: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'variant-id', currentStock: 4 }),
      update: jest.fn(),
    },
    inventoryMovement: { create: jest.fn() },
  };
  const prisma = {
    $transaction: (fn: (t: Prisma.TransactionClient) => unknown) =>
      fn(tx as unknown as Prisma.TransactionClient),
  };
  const service = new InventoryService(prisma as unknown as PrismaService);
  beforeEach(() => jest.clearAllMocks());
  it('entrada soma e registra saldo anterior, novo saldo e responsável', async () => {
    await service.entry(
      { productVariantId: 'variant-id', quantity: 20, reason: 'Reposição do fornecedor' },
      'admin',
    );
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: 'variant-id' },
      data: { currentStock: 24 },
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'IN',
        quantity: 20,
        previousStock: 4,
        resultingStock: 24,
        createdById: 'admin',
      }),
    });
  });
  it('ajuste registra diferença negativa sem deixar saldo negativo', async () => {
    await service.adjustment(
      { productVariantId: 'variant-id', targetStock: 1, reason: 'Contagem física' },
      'admin',
    );
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'ADJUSTMENT',
        quantity: -3,
        previousStock: 4,
        resultingStock: 1,
      }),
    });
  });
  it('rejeita estoque negativo', () => {
    expect(() =>
      service.adjustment(
        { productVariantId: 'v', targetStock: -1, reason: 'Contagem física' },
        'admin',
      ),
    ).toThrow(BadRequestException);
    expect(tx.productVariant.update).not.toHaveBeenCalled();
  });
  it('rejeita entrada zero', () => {
    expect(() =>
      service.entry({ productVariantId: 'v', quantity: 0, reason: 'Reposição' }, 'admin'),
    ).toThrow(BadRequestException);
  });
  it('não cria movimentação para ajuste sem mudança', async () => {
    await expect(
      service.adjustment(
        { productVariantId: 'variant-id', targetStock: 4, reason: 'Contagem física' },
        'admin',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
  });
});
