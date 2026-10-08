import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/auth.decorators';
import { PaginationDto } from '../common/pagination.dto';
import { UsersService } from './users.service';
import { CreateUserDto } from './users.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}
  @Get()
  @ApiOperation({ summary: 'Listar usuários (ADMIN)' })
  list(@Query() query: PaginationDto) {
    return this.service.list(query);
  }
  @Post()
  @ApiOperation({ summary: 'Cadastrar usuário (ADMIN)' })
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }
}
