import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../auth/auth.decorators';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dashboard.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get('summary')
  @ApiOperation({
    summary: 'Consultar indicadores do mês; faturamento disponível somente para ADMIN',
  })
  summary(@CurrentUser() user: AuthUser, @Query() query: DashboardQueryDto) {
    return this.service.summary(user.role, query.month);
  }
}
