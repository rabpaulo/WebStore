import { Module } from '@nestjs/common';
import { ProductsController, VariantsController } from './products.controller';
import { ProductsService } from './products.service';
@Module({ controllers: [ProductsController, VariantsController], providers: [ProductsService] })
export class ProductsModule {}
