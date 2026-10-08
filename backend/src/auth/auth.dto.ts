import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
export class LoginDto {
  @ApiProperty({ example: 'admin@lingeriflow.local' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;
  @ApiProperty({ minLength: 8, maxLength: 72, example: 'Admin123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
