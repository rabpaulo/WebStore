import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { normalizeEmail } from '../auth/auth.dto';
import { trim } from '../common/pagination.dto';

export class CreateCustomerDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email?: string | null;
  @ApiPropertyOptional({ example: '(11) 99876-5432' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30)
  @Matches(/^[+()\d\s-]{8,30}$/, { message: 'Informe um telefone válido.' })
  phone?: string | null;
}
export class UpdateCustomerDto extends PartialType(CreateCustomerDto, {
  skipNullProperties: false,
}) {}
