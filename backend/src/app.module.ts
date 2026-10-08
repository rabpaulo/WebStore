import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthModule } from './auth/auth.module';
import { Public } from './auth/auth.decorators';
import { DashboardModule } from './dashboard/dashboard.module';
import { CustomersModule } from './customers/customers.module';
import { OrdersModule } from './orders/orders.module';
import { InventoryModule } from './inventory/inventory.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { UsersModule } from './users/users.module';
import { PrismaModule, PrismaService } from './common/prisma.service';

@ApiTags('Health')
@Controller('health')
class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Public()
  @Get()
  @ApiOperation({ summary: 'Verificar disponibilidade da API e do banco' })
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    InventoryModule,
    OrdersModule,
    CustomersModule,
    DashboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
