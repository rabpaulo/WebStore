import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import { AuthRequest, IS_PUBLIC } from './auth.decorators';
import { USER_SELECT } from '../users/users.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Faça login para continuar.');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        algorithms: ['HS256'],
        issuer: 'lingerieflow',
        audience: 'lingerieflow-web',
      });
      if (!payload.sub) throw new Error('Invalid subject');
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: USER_SELECT,
      });
      if (!user) throw new Error('User unavailable');
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Sua sessão expirou. Entre novamente.');
    }
  }
}
