import { Body, Controller, Get, Injectable, Module, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { Roles } from '../auth/auth.decorators';
import { PrismaService } from '../common/prisma.service';
import { trim } from '../common/pagination.dto';

class CreateCategoryDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}
@Injectable()
class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}
  list() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }
  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }
}
@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
class CategoriesController {
  constructor(private readonly service: CategoriesService) {}
  @Get()
  @ApiOperation({ summary: 'Listar categorias' })
  list() {
    return this.service.list();
  }
  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cadastrar categoria (ADMIN)' })
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }
}
@Module({ controllers: [CategoriesController], providers: [CategoriesService] })
export class CategoriesModule {}
