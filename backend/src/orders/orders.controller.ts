import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser, Roles } from '../auth/auth.decorators';
import { OrdersService } from './orders.service';
import { CreateOrderDto, OrderQueryDto, UpdateOrderStatusDto } from './orders.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}
  @Get()
  @ApiOperation({ summary: 'Listar pedidos com busca, status, período e paginação' })
  list(@Query() query: OrderQueryDto) {
    return this.service.list(query);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Consultar pedido, itens e cliente' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.detail(id);
  }
  @Post()
  @ApiOperation({ summary: 'Criar pedido; preços são calculados no servidor' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }
  @Patch(':id/status')
  @ApiOperation({ summary: 'Avançar status; pagamento baixa estoque transacionalmente' })
  status(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateStatus(id, dto.status, user.id);
  }
  @Post(':id/cancel')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cancelar antes do envio e devolver estoque consumido (ADMIN)' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.cancel(id, user.id);
  }
}
