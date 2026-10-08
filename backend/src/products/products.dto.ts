import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { PaginationDto, trim } from '../common/pagination.dto';

export class CreateVariantDto {
  @ApiProperty({ example: 'SUT-COM-PRE-M' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9-]{2,80}$/, { message: 'SKU deve conter de 2 a 80 letras, números ou hífens.' })
  sku!: string;
  @ApiProperty({ example: 'Preto' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  color!: string;
  @ApiProperty({ example: 'M' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  size!: string;
  @ApiProperty({ example: 89.9, minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999.99)
  price!: number;
  @ApiProperty({ example: 10, minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(1000000)
  initialStock!: number;
  @ApiProperty({ example: 5, minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(1000000)
  minimumStock!: number;
}
export class UpdateVariantDto extends PartialType(
  OmitType(CreateVariantDto, ['initialStock'] as const),
  { skipNullProperties: false },
) {}
export class CreateProductDto {
  @ApiProperty({ example: 'Sutiã Comfort' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  description?: string;
  @ApiProperty()
  @IsUUID()
  categoryId!: string;
  @ApiProperty({ type: [CreateVariantDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(64)
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants!: CreateVariantDto[];
}
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['variants'] as const),
  { skipNullProperties: false },
) {
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  active?: boolean;
}
export class ProductQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  active?: string;
}
