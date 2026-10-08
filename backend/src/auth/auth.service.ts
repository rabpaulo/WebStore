import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma.service';
import { LoginDto } from './auth.dto';
import { USER_SELECT } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash)))
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    const accessToken = await this.jwt.signAsync({ sub: user.id });
    const profile = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: USER_SELECT,
    });
    return { accessToken, user: profile };
  }
}
