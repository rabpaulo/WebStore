import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser, Roles } from '../auth/auth.decorators';
import { InventoryService } from './inventory.service';
import {
  InventoryAdjustmentDto,
  InventoryEntryDto,
  InventoryQueryDto,
  MovementQueryDto,
} from './inventory.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}
  @Get()
  @ApiOperation({ summary: 'Listar estoque por produto, categoria, SKU, status e paginação' })
  list(@Query() query: InventoryQueryDto) {
    return this.service.list(query);
  }
  @Get('movements')
  @ApiOperation({ summary: 'Consultar movimentações por período, produto, SKU e tipo' })
  movements(@Query() query: MovementQueryDto) {
    return this.service.movements(query);
  }
  @Post('entry')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Registrar entrada e auditoria na mesma transação (ADMIN)' })
  entry(@Body() dto: InventoryEntryDto, @CurrentUser() user: AuthUser) {
    return this.service.entry(dto, user.id);
  }
  @Post('adjustment')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Ajustar saldo após contagem física, com motivo e auditoria (ADMIN)' })
  adjustment(@Body() dto: InventoryAdjustmentDto, @CurrentUser() user: AuthUser) {
    return this.service.adjustment(dto, user.id);
  }
}
