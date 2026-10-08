import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationDto } from '../common/pagination.dto';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './customers.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}
  @Get()
  @ApiOperation({ summary: 'Listar clientes com busca e paginação' })
  list(@Query() query: PaginationDto) {
    return this.service.list(query);
  }
  @Post()
  @ApiOperation({ summary: 'Cadastrar cliente' })
  create(@Body() dto: CreateCustomerDto) {
    return this.service.create(dto);
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Editar cliente' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto) {
    return this.service.update(id, dto);
  }
}
