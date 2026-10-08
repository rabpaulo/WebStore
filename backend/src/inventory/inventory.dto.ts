import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { InventoryMovementType } from '@prisma/client';
import { PeriodDto, PaginationDto, trim } from '../common/pagination.dto';

export class InventoryQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['true'] })
  @IsOptional()
  @IsIn(['true'])
  replenishment?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;
  @ApiPropertyOptional({ enum: ['OK', 'LOW', 'OUT'] })
  @IsOptional()
  @IsIn(['OK', 'LOW', 'OUT'])
  stockStatus?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  sku?: string;
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  active?: string;
}
export class MovementQueryDto extends PeriodDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  sku?: string;
  @ApiPropertyOptional({ enum: InventoryMovementType })
  @IsOptional()
  @IsEnum(InventoryMovementType)
  type?: InventoryMovementType;
}
export class InventoryEntryDto {
  @ApiProperty()
  @IsUUID()
  productVariantId!: string;
  @ApiProperty({ minimum: 1, example: 20 })
  @IsInt()
  @Min(1)
  @Max(1000000)
  quantity!: number;
  @ApiProperty({ example: 'Reposição do fornecedor' })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
export class InventoryAdjustmentDto {
  @ApiProperty()
  @IsUUID()
  productVariantId!: string;
  @ApiProperty({
    minimum: 0,
    example: 15,
    description: 'Saldo físico contado; diferença fica registrada no histórico',
  })
  @IsInt()
  @Min(0)
  @Max(1000000)
  targetStock!: number;
  @ApiProperty({ example: 'Contagem física do inventário' })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
