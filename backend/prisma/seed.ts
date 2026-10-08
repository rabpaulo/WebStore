import 'dotenv/config';
import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { OrderStatus, Role } from '@prisma/client';
import { PrismaService } from '../src/common/prisma.service';
import { ProductsService } from '../src/products/products.service';
import { OrdersService } from '../src/orders/orders.service';
import { OrderStockService } from '../src/orders/order-stock.service';
import { currentMonth } from '../src/dashboard/dashboard.service';

const prisma = new PrismaService();
const products = new ProductsService(prisma);
const orders = new OrdersService(prisma, new OrderStockService());
const catalog = [
  {
    name: 'Sutiã Comfort',
    prefix: 'SUT-COM',
    category: 'Sutiãs',
    price: 89.9,
    description: 'Microfibra macia, alças reguláveis e suporte para todos os dias.',
    colors: ['Preto', 'Nude'],
  },
  {
    name: 'Sutiã Essential',
    prefix: 'SUT-ESS',
    category: 'Sutiãs',
    price: 79.9,
    description: 'Design sem costura e toque leve para acompanhar a rotina.',
    colors: ['Branco', 'Rosa'],
  },
  {
    name: 'Calcinha Basic',
    prefix: 'CAL-BAS',
    category: 'Calcinhas',
    price: 39.9,
    description: 'Algodão respirável e acabamento delicado, com conforto essencial.',
    colors: ['Nude', 'Preto'],
  },
  {
    name: 'Calcinha Comfort',
    prefix: 'CAL-COM',
    category: 'Calcinhas',
    price: 44.9,
    description: 'Cintura média, cobertura confortável e tecido flexível.',
    colors: ['Rosa', 'Branco'],
  },
  {
    name: 'Body Classic',
    prefix: 'BOD-CLA',
    category: 'Bodies',
    price: 149.9,
    description: 'Modelagem clássica em microfibra, com fechamento ajustável.',
    colors: ['Preto', 'Nude'],
  },
  {
    name: 'Body Elegance',
    prefix: 'BOD-ELE',
    category: 'Bodies',
    price: 189.9,
    description: 'Renda delicada com forro suave e caimento elegante.',
    colors: ['Preto', 'Vermelho'],
  },
  {
    name: 'Camisola Soft',
    prefix: 'CAM-SOF',
    category: 'Camisolas',
    price: 119.9,
    description: 'Malha leve e confortável, feita para noites tranquilas.',
    colors: ['Rosa', 'Branco'],
  },
  {
    name: 'Camisola Sereno',
    prefix: 'CAM-SER',
    category: 'Camisolas',
    price: 139.9,
    description: 'Cetim de toque macio com alças delicadas e acabamento em renda.',
    colors: ['Nude', 'Preto'],
  },
  {
    name: 'Conjunto Bella',
    prefix: 'CON-BEL',
    category: 'Conjuntos',
    price: 159.9,
    description: 'Conjunto de sutiã e calcinha em renda com detalhes delicados.',
    colors: ['Rosa', 'Vermelho'],
  },
  {
    name: 'Conjunto Aurora',
    prefix: 'CON-AUR',
    category: 'Conjuntos',
    price: 179.9,
    description: 'Microfibra premium e renda floral em uma combinação versátil.',
    colors: ['Preto', 'Branco'],
  },
];
const colorCode: Record<string, string> = {
  Preto: 'PRE',
  Nude: 'NUD',
  Branco: 'BRA',
  Rosa: 'ROS',
  Vermelho: 'VER',
};

async function seed() {
  await prisma.$connect();
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lingeriflow.local' },
    update: {},
    create: {
      name: 'Marina Oliveira',
      email: 'admin@lingeriflow.local',
      passwordHash: await bcrypt.hash('Admin123!', 12),
      role: Role.ADMIN,
    },
  });
  const seller = await prisma.user.upsert({
    where: { email: 'vendedor@lingeriflow.local' },
    update: {},
    create: {
      name: 'Camila Santos',
      email: 'vendedor@lingeriflow.local',
      passwordHash: await bcrypt.hash('Seller123!', 12),
      role: Role.SELLER,
    },
  });
  for (const name of ['Sutiãs', 'Calcinhas', 'Bodies', 'Camisolas', 'Conjuntos'])
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  for (const [index, product] of catalog.entries()) {
    if (
      await prisma.productVariant.findUnique({
        where: { sku: `${product.prefix}-${colorCode[product.colors[0]]}-P` },
      })
    )
      continue;
    const category = await prisma.category.findUniqueOrThrow({ where: { name: product.category } });
    await products.create(
      {
        name: product.name,
        description: product.description,
        categoryId: category.id,
        variants: product.colors.flatMap((color, c) =>
          ['P', 'M', 'G', 'GG'].map((size, s) => ({
            sku: `${product.prefix}-${colorCode[color]}-${size}`,
            color,
            size,
            price: product.price,
            initialStock:
              (index + c + s) % 9 === 0
                ? 0
                : (index + c + s) % 7 === 0
                  ? 2
                  : 22 + ((index * 3 + c + s) % 18),
            minimumStock: 5 + (index % 3),
          })),
        ),
      },
      admin.id,
    );
  }
  const clientNames = [
    'Ana Paula Ribeiro',
    'Juliana Costa',
    'Fernanda Almeida',
    'Beatriz Lima',
    'Larissa Fernandes',
    'Renata Souza',
    'Patrícia Mendes',
    'Carolina Martins',
  ];
  const clients = [];
  for (const [index, name] of clientNames.entries()) {
    const email = `${name
      .split(' ')[0]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')}@example.com`;
    const existing = await prisma.customer.findFirst({ where: { email } });
    clients.push(
      existing ??
        (await prisma.customer.create({
          data: { name, email, phone: `(11) 99${String(870000 + index).padStart(6, '0')}` },
        })),
    );
  }
  // Orders are seeded once; re-running never resets a real stock balance or duplicates sales.
  if ((await prisma.order.count()) === 0) {
    const variants = await prisma.productVariant.findMany({
      where: { currentStock: { gte: 20 } },
      orderBy: { sku: 'asc' },
    });
    const month = currentMonth();
    const today = Number(
      new Intl.DateTimeFormat('en', { day: 'numeric', timeZone: 'America/Sao_Paulo' }).format(
        new Date(),
      ),
    );
    for (let index = 0; index < 36; index++) {
      const a = variants[(index * 3) % variants.length];
      const b = variants[(index * 3 + 7) % variants.length];
      const order = await orders.create(
        {
          customerId: clients[index % clients.length].id,
          items: [
            { productVariantId: a.id, quantity: 1 + (index % 2) },
            { productVariantId: b.id, quantity: 1 },
          ],
          payImmediately: index % 9 !== 0,
        },
        index % 3 === 0 ? admin.id : seller.id,
      );
      if (index % 9 === 1) await orders.cancel(order.id, admin.id);
      else if (index % 9 !== 0) {
        await orders.updateStatus(order.id, OrderStatus.PREPARING, seller.id);
        if (index % 4 >= 1) await orders.updateStatus(order.id, OrderStatus.SHIPPED, seller.id);
        if (index % 4 >= 2) await orders.updateStatus(order.id, OrderStatus.DELIVERED, seller.id);
      }
      const day = 1 + (index % today);
      const timestamp = new Date(
        `${month}-${String(day).padStart(2, '0')}T${String(9 + (index % 9)).padStart(2, '0')}:15:00-03:00`,
      );
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: { createdAt: timestamp, ...(order.paidAt ? { paidAt: timestamp } : {}) },
        }),
        prisma.inventoryMovement.updateMany({
          where: { orderId: order.id },
          data: { createdAt: timestamp },
        }),
      ]);
    }
  }
  console.log(
    `Seed concluído: ${await prisma.product.count()} produtos, ${await prisma.productVariant.count()} variantes e ${await prisma.order.count()} pedidos.`,
  );
}
seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
