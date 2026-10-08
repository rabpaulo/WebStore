import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';
export class DashboardQueryDto {
  @ApiPropertyOptional({
    example: '2026-10',
    description: 'Mês de referência em America/Sao_Paulo',
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month?: string;
}
