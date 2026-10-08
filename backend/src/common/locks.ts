import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Always acquire variant locks in UUID order to avoid deadlocks in multi-item orders.
export async function lockVariants(tx: Prisma.TransactionClient, ids: string[]) {
  const uniqueIds = [...new Set(ids)].sort();
  if (!uniqueIds.length) return;
  const rows = await tx.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT "id" FROM "ProductVariant" WHERE "id"::text IN (${Prisma.join(uniqueIds)}) ORDER BY "id" FOR UPDATE`,
  );
  if (rows.length !== uniqueIds.length)
    throw new NotFoundException('Uma das variantes não foi encontrada.');
}
