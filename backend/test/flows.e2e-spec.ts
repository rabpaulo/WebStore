import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

describe('LingerieFlow · HTTP + PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: string;
  let seller: string;
  let categoryId: string;
  const uid = randomUUID().slice(0, 8);
  const api = () => request(app.getHttpServer());
  const createProduct = async (stock = 5) => {
    const sku = `TEST-${uid}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const result = await api()
      .post('/api/products')
      .auth(admin, { type: 'bearer' })
      .send({
        name: 'Sutiã de teste',
        categoryId,
        variants: [
          { sku, color: 'Preto', size: 'M', price: 89.9, initialStock: stock, minimumStock: 2 },
        ],
      })
      .expect(201);
    return result.body as {
      id: string;
      variants: { id: string; sku: string; currentStock: number }[];
    };
  };
  const placeOrder = (variantId: string, quantity: number, payImmediately = true) =>
    api()
      .post('/api/orders')
      .auth(seller, { type: 'bearer' })
      .send({ items: [{ productVariantId: variantId, quantity }], payImmediately });

  beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL;
    if (!url || !new URL(url).pathname.endsWith('_test'))
      throw new Error(
        'TEST_DATABASE_URL deve apontar para um banco exclusivo cujo nome termina em _test.',
      );
    process.env.DATABASE_URL = url;
    process.env.JWT_SECRET = 'exclusive-test-secret-with-at-least-32-characters';
    prisma = new PrismaClient({ datasourceUrl: url });
    await prisma.$connect();
    const passwordHash = await bcrypt.hash('Password123!', 4);
    await prisma.user.createMany({
      data: [
        { name: 'Admin Teste', email: `admin-${uid}@example.com`, passwordHash, role: Role.ADMIN },
        {
          name: 'Vendedora Teste',
          email: `seller-${uid}@example.com`,
          passwordHash,
          role: Role.SELLER,
        },
      ],
    });
    categoryId = (await prisma.category.create({ data: { name: `Teste ${uid}` } })).id;
    app = (
      await Test.createTestingModule({ imports: [AppModule] }).compile()
    ).createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    admin = (
      await api()
        .post('/api/auth/login')
        .send({ email: `admin-${uid}@example.com`, password: 'Password123!' })
        .expect(201)
    ).body.accessToken;
    seller = (
      await api()
        .post('/api/auth/login')
        .send({ email: `seller-${uid}@example.com`, password: 'Password123!' })
        .expect(201)
    ).body.accessToken;
  });
  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  it('exige JWT e nunca retorna hash de senha', async () => {
    await api().get('/api/products').expect(401);
    const profile = await api().get('/api/auth/me').auth(seller, { type: 'bearer' }).expect(200);
    expect(profile.body.passwordHash).toBeUndefined();
    expect(profile.body.role).toBe('SELLER');
  });
  it('bloqueia SELLER em usuários, produtos, estoque e cancelamento', async () => {
    await api().get('/api/users').auth(seller, { type: 'bearer' }).expect(403);
    await api().post('/api/products').auth(seller, { type: 'bearer' }).send({}).expect(403);
    await api()
      .post('/api/inventory/adjustment')
      .auth(seller, { type: 'bearer' })
      .send({})
      .expect(403);
    await api()
      .post(`/api/orders/${randomUUID()}/cancel`)
      .auth(seller, { type: 'bearer' })
      .expect(403);
  });
  it('cria produto persistente e rejeita SKU duplicado', async () => {
    const product = await createProduct();
    const saved = await api()
      .get(`/api/products/${product.id}`)
      .auth(seller, { type: 'bearer' })
      .expect(200);
    expect(saved.body.variants[0].currentStock).toBe(5);
    await api()
      .post('/api/products')
      .auth(admin, { type: 'bearer' })
      .send({
        name: 'Duplicado',
        categoryId,
        variants: [
          {
            sku: product.variants[0].sku,
            color: 'Nude',
            size: 'P',
            price: 39.9,
            initialStock: 1,
            minimumStock: 0,
          },
        ],
      })
      .expect(409);
  });
  it('valida quantidade, saldo e proíbe total fornecido pelo cliente', async () => {
    const product = await createProduct(2);
    const id = product.variants[0].id;
    await placeOrder(id, 0).expect(400);
    await placeOrder(id, 3).expect(400);
    await api()
      .post('/api/orders')
      .auth(seller, { type: 'bearer' })
      .send({ items: [{ productVariantId: id, quantity: 1 }], total: 0.01 })
      .expect(400);
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id } })).currentStock).toBe(2);
  });
  it('pagamento baixa estoque; cancelamento devolve uma única vez e audita', async () => {
    const product = await createProduct(5);
    const id = product.variants[0].id;
    const order = await placeOrder(id, 2).expect(201);
    expect(order.body.total).toBe('179.8');
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id } })).currentStock).toBe(3);
    const out = await prisma.inventoryMovement.findMany({
      where: { orderId: order.body.id, type: 'OUT' },
    });
    expect(out).toHaveLength(1);
    expect(out[0].quantity).toBe(2);
    await api()
      .post(`/api/orders/${order.body.id}/cancel`)
      .auth(admin, { type: 'bearer' })
      .expect(201);
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id } })).currentStock).toBe(5);
    await api()
      .post(`/api/orders/${order.body.id}/cancel`)
      .auth(admin, { type: 'bearer' })
      .expect(409);
    const inbound = await prisma.inventoryMovement.findMany({
      where: { orderId: order.body.id, type: 'IN' },
    });
    expect(inbound).toHaveLength(1);
    expect(inbound[0].quantity).toBe(2);
  });
  it('duas vendas concorrentes da última unidade não deixam saldo negativo', async () => {
    const product = await createProduct(1);
    const id = product.variants[0].id;
    const results = await Promise.all([placeOrder(id, 1), placeOrder(id, 1)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id } })).currentStock).toBe(0);
    expect(
      await prisma.inventoryMovement.count({ where: { productVariantId: id, type: 'OUT' } }),
    ).toBe(1);
  });
  it('dois pagamentos concorrentes do mesmo pedido debitam uma vez', async () => {
    const product = await createProduct(5);
    const id = product.variants[0].id;
    const order = await placeOrder(id, 2, false).expect(201);
    const pay = () =>
      api()
        .patch(`/api/orders/${order.body.id}/status`)
        .auth(seller, { type: 'bearer' })
        .send({ status: 'PAID' });
    expect((await Promise.all([pay(), pay()])).map((r) => r.status).sort()).toEqual([200, 400]);
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id } })).currentStock).toBe(3);
  });
  it('dois cancelamentos concorrentes restauram uma vez', async () => {
    const product = await createProduct(5);
    const id = product.variants[0].id;
    const order = await placeOrder(id, 2).expect(201);
    const cancel = () =>
      api().post(`/api/orders/${order.body.id}/cancel`).auth(admin, { type: 'bearer' });
    expect((await Promise.all([cancel(), cancel()])).map((r) => r.status).sort()).toEqual([
      201, 409,
    ]);
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id } })).currentStock).toBe(5);
  });
  it('falha em um item reverte toda a transação de pagamento', async () => {
    const a = await createProduct(5);
    const b = await createProduct(1);
    const aid = a.variants[0].id;
    const bid = b.variants[0].id;
    const order = await api()
      .post('/api/orders')
      .auth(seller, { type: 'bearer' })
      .send({
        items: [
          { productVariantId: aid, quantity: 2 },
          { productVariantId: bid, quantity: 1 },
        ],
      })
      .expect(201);
    await api()
      .post('/api/inventory/adjustment')
      .auth(admin, { type: 'bearer' })
      .send({ productVariantId: bid, targetStock: 0, reason: 'Contagem física de teste' })
      .expect(201);
    await api()
      .patch(`/api/orders/${order.body.id}/status`)
      .auth(seller, { type: 'bearer' })
      .send({ status: 'PAID' })
      .expect(400);
    expect(
      (await prisma.productVariant.findUniqueOrThrow({ where: { id: aid } })).currentStock,
    ).toBe(5);
    expect(await prisma.inventoryMovement.count({ where: { orderId: order.body.id } })).toBe(0);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.body.id } })).status).toBe(
      'PENDING',
    );
  });
  it('status só avança na sequência e entregue não cancela', async () => {
    const product = await createProduct();
    const order = await placeOrder(product.variants[0].id, 1).expect(201);
    const change = (status: string) =>
      api()
        .patch(`/api/orders/${order.body.id}/status`)
        .auth(seller, { type: 'bearer' })
        .send({ status });
    await change('SHIPPED').expect(400);
    await change('PREPARING').expect(200);
    await change('SHIPPED').expect(200);
    await change('DELIVERED').expect(200);
    await change('PENDING').expect(400);
    await api()
      .post(`/api/orders/${order.body.id}/cancel`)
      .auth(admin, { type: 'bearer' })
      .expect(400);
  });
  it('banco recusa saldo negativo até em SQL direto', async () => {
    const product = await createProduct(3);
    const id = product.variants[0].id;
    await expect(
      prisma.$executeRaw`UPDATE "ProductVariant" SET "currentStock" = -1 WHERE "id"::text = ${id}`,
    ).rejects.toThrow();
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id } })).currentStock).toBe(3);
  });
  it('filtros e paginação consultam o banco', async () => {
    const product = await createProduct(0);
    const sku = product.variants[0].sku;
    const inventory = await api()
      .get(`/api/inventory?sku=${sku}&stockStatus=OUT&limit=1`)
      .auth(seller, { type: 'bearer' })
      .expect(200);
    expect(inventory.body.meta.total).toBe(1);
    const movements = await api()
      .get('/api/inventory/movements?from=2099-01-01')
      .auth(seller, { type: 'bearer' })
      .expect(200);
    expect(movements.body.meta.total).toBe(0);
  });
  it('dashboard limita faturamento a ADMIN e valida o mês', async () => {
    const basic = await api()
      .get('/api/dashboard/summary')
      .auth(seller, { type: 'bearer' })
      .expect(200);
    expect(basic.body.revenueThisMonth).toBeNull();
    expect(basic.body.totalVariants).toBeGreaterThan(0);
    const full = await api()
      .get('/api/dashboard/summary')
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(typeof full.body.revenueThisMonth).toBe('string');
    expect(full.body.salesByDay.length).toBeGreaterThanOrEqual(28);
    await api()
      .get('/api/dashboard/summary?month=2026-99')
      .auth(admin, { type: 'bearer' })
      .expect(400);
  });
  it('cliente pode cadastrar e remover contatos opcionais', async () => {
    const created = await api()
      .post('/api/customers')
      .auth(seller, { type: 'bearer' })
      .send({ name: 'Cliente Teste', email: 'contato@example.com', phone: '(11) 99876-5432' })
      .expect(201);
    const edited = await api()
      .patch(`/api/customers/${created.body.id}`)
      .auth(seller, { type: 'bearer' })
      .send({ email: null, phone: null })
      .expect(200);
    expect(edited.body.email).toBeNull();
    expect(edited.body.phone).toBeNull();
    await api()
      .post('/api/customers')
      .auth(seller, { type: 'bearer' })
      .send({ name: 'Cliente', email: 'invalido' })
      .expect(400);
  });
  it('produto inativo impede pagamento de um pedido pendente', async () => {
    const product = await createProduct(5);
    const order = await placeOrder(product.variants[0].id, 1, false).expect(201);
    await api()
      .patch(`/api/products/${product.id}`)
      .auth(admin, { type: 'bearer' })
      .send({ active: false })
      .expect(200);
    await api()
      .patch(`/api/orders/${order.body.id}/status`)
      .auth(seller, { type: 'bearer' })
      .send({ status: 'PAID' })
      .expect(400);
    expect(
      (await prisma.productVariant.findUniqueOrThrow({ where: { id: product.variants[0].id } }))
        .currentStock,
    ).toBe(5);
  });
  it('entrada concorrente com venda preserva saldo e auditoria', async () => {
    const product = await createProduct(1);
    const id = product.variants[0].id;
    const entry = api()
      .post('/api/inventory/entry')
      .auth(admin, { type: 'bearer' })
      .send({ productVariantId: id, quantity: 3, reason: 'Reposição concorrente' });
    const results = await Promise.all([placeOrder(id, 1), entry]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id } })).currentStock).toBe(3);
    expect(await prisma.inventoryMovement.count({ where: { productVariantId: id } })).toBe(3);
  });
  it('edição rejeita null em campos obrigatórios sem alterar o registro', async () => {
    const product = await createProduct();
    for (const payload of [{ name: null }, { active: null }, { description: null }]) {
      await api()
        .patch(`/api/products/${product.id}`)
        .auth(admin, { type: 'bearer' })
        .send(payload)
        .expect(400);
    }
    await api()
      .patch(`/api/variants/${product.variants[0].id}`)
      .auth(admin, { type: 'bearer' })
      .send({ sku: null })
      .expect(400);
    const unchanged = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(unchanged.name).toBe('Sutiã de teste');
    expect(unchanged.active).toBe(true);
  });
  it('paginação inválida falha e consultas nunca incluem hashes em relações', async () => {
    await api().get('/api/products?page=0').auth(seller, { type: 'bearer' }).expect(400);
    await api().get('/api/products?limit=1000').auth(seller, { type: 'bearer' }).expect(400);
    const movements = await api()
      .get('/api/inventory/movements?limit=1')
      .auth(seller, { type: 'bearer' })
      .expect(200);
    expect(movements.body.data[0].createdBy.passwordHash).toBeUndefined();
    const users = await api().get('/api/users').auth(admin, { type: 'bearer' }).expect(200);
    expect(users.body.data.every((u: Record<string, unknown>) => !('passwordHash' in u))).toBe(
      true,
    );
  });
});
