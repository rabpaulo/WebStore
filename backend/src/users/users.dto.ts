import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { normalizeEmail } from '../auth/auth.dto';
import { trim } from '../common/pagination.dto';

export class CreateUserDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;
  @ApiProperty()
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;
  @ApiProperty({ minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;
}
