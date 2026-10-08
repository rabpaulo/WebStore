import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser, Roles } from '../auth/auth.decorators';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  CreateVariantDto,
  ProductQueryDto,
  UpdateProductDto,
  UpdateVariantDto,
} from './products.dto';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}
  @Get()
  @ApiOperation({ summary: 'Listar produtos com busca, categoria, status e paginação' })
  list(@Query() query: ProductQueryDto) {
    return this.service.list(query);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Consultar produto e todas as variantes' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.detail(id);
  }
  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Criar produto com variantes e estoque inicial auditado (ADMIN)' })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }
  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Editar ou ativar/desativar produto (ADMIN)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }
  @Roles(Role.ADMIN)
  @Post(':id/variants')
  @ApiOperation({ summary: 'Adicionar variante (ADMIN)' })
  addVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVariantDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addVariant(id, dto, user.id);
  }
}
@ApiTags('Products')
@ApiBearerAuth()
@Controller('variants')
export class VariantsController {
  constructor(private readonly service: ProductsService) {}
  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({
    summary: 'Editar variante; estoque só é alterado pelo módulo de estoque (ADMIN)',
  })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVariantDto) {
    return this.service.updateVariant(id, dto);
  }
}
