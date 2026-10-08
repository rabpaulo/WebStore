import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './auth.dto';
import { AuthUser, CurrentUser, Public } from './auth.decorators';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}
  @Public()
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Entrar e receber JWT (válido por 2 horas)' })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas' })
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar usuário da sessão' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
