import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { ProductsService, stockStatus } from './products.service';

describe('ProductsService', () => {
  const variant = {
    sku: 'SUT-COM-PRE-M',
    color: 'Preto',
    size: 'M',
    price: 89.9,
    initialStock: 10,
    minimumStock: 5,
  };
  const dto = { name: 'Sutiã Comfort', categoryId: 'category-id', variants: [variant] };
  const tx = {
    product: {
      create: jest.fn().mockResolvedValue({ id: 'product-id' }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ ...dto, id: 'product-id' }),
    },
    productVariant: { create: jest.fn().mockResolvedValue({ id: 'variant-id' }) },
    inventoryMovement: { create: jest.fn() },
  };
  const prisma = {
    productVariant: { findFirst: jest.fn() },
    category: { findUnique: jest.fn().mockResolvedValue({ id: 'category-id' }) },
    $transaction: jest.fn((fn: (t: Prisma.TransactionClient) => unknown) =>
      fn(tx as unknown as Prisma.TransactionClient),
    ),
  };
  const service = new ProductsService(prisma as unknown as PrismaService);
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.productVariant.findFirst.mockResolvedValue(null);
  });
  it('cria produto válido com variantes e auditoria do estoque inicial', async () => {
    const product = await service.create(dto, 'admin-id');
    expect(product.name).toBe('Sutiã Comfort');
    expect(tx.productVariant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ currentStock: 10, price: 89.9, productId: 'product-id' }),
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'IN',
        quantity: 10,
        previousStock: 0,
        resultingStock: 10,
        createdById: 'admin-id',
      }),
    });
  });
  it('rejeita SKU já existente', async () => {
    prisma.productVariant.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(service.create(dto, 'admin-id')).rejects.toThrow(ConflictException);
    expect(tx.product.create).not.toHaveBeenCalled();
  });
  it('rejeita SKU repetido no próprio formulário', async () => {
    await expect(
      service.create({ ...dto, variants: [variant, variant] }, 'admin-id'),
    ).rejects.toThrow(ConflictException);
  });
  it('estoque exatamente no mínimo é baixo; zero tem prioridade', () => {
    expect(stockStatus(5, 5)).toBe('LOW');
    expect(stockStatus(0, 0)).toBe('OUT');
    expect(stockStatus(6, 5)).toBe('OK');
  });
});
