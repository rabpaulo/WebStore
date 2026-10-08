import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { PeriodDto } from '../common/pagination.dto';

export class OrderItemDto {
  @ApiProperty()
  @IsUUID()
  productVariantId!: string;
  @ApiProperty({ minimum: 1, example: 2 })
  @IsInt()
  @Min(1)
  @Max(10000)
  quantity!: number;
}
export class CreateOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
  @ApiPropertyOptional({
    default: false,
    description: 'Confirma pagamento e baixa estoque na mesma transação',
  })
  @IsOptional()
  @IsBoolean()
  payImmediately?: boolean;
}
export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    description: 'Para cancelar use POST /orders/:id/cancel (ADMIN)',
  })
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
export class OrderQueryDto extends PeriodDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
