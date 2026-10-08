import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStockService } from './order-stock.service';
@Module({ controllers: [OrdersController], providers: [OrdersService, OrderStockService] })
export class OrdersModule {}
