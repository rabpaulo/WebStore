import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  it('rejeita e-mail desconhecido', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
    const service = new AuthService(prisma as unknown as PrismaService, new JwtService());
    await expect(
      service.login({ email: 'inexistente@example.com', password: 'Password123!' }),
    ).rejects.toThrow(UnauthorizedException);
  });
  it('rejeita senha errada', async () => {
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ passwordHash: await bcrypt.hash('Correta123!', 4) }),
      },
    };
    const service = new AuthService(prisma as unknown as PrismaService, new JwtService());
    await expect(
      service.login({ email: 'admin@example.com', password: 'Errada123!' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
