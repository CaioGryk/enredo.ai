import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import { SubscriptionType, UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;

  const mockUser = {
    id: 'u-1', email: 'test@test.com', name: 'Tester', passwordHash: 'hashed-pass',
    role: UserRole.USER, subscription: { type: SubscriptionType.FREE },
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), upsert: jest.fn() },
      refreshToken: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt'),
      verify: jest.fn().mockReturnValue({ sub: 'u-1' }),
    };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'jwt-secret';
        if (key === 'REFRESH_TOKEN_SECRET') return 'refresh-secret';
        if (key === 'JWT_EXPIRES_IN') return '15m';
        if (key === 'REFRESH_TOKEN_EXPIRES_IN') return '7d';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('refresh token hashing', () => {
    it('login should store hashed refresh token, not raw', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: await bcrypt.hash('pass', 1) });
      await service.login({ email: 'test@test.com', password: 'pass' });

      const createCall = prisma.refreshToken.create.mock.calls[0][0];
      const storedToken = createCall.data.token;
      // Should be a 64-char hex string (SHA-256), not the JWT
      expect(storedToken).toMatch(/^[a-f0-9]{64}$/);
      expect(storedToken).not.toBe('mock-jwt');
      expect(jwtService.sign.mock.calls[0][0].jti).toBeUndefined();
      expect(jwtService.sign.mock.calls[1][0].jti).toEqual(expect.any(String));
    });

    it('register should store hashed refresh token, not raw', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      await service.register({ email: 'new@test.com', name: 'New', password: 'pass123456' });

      const createCall = prisma.refreshToken.create.mock.calls[0][0];
      expect(createCall.data.token).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('refresh token flow', () => {
    it('should accept valid raw refresh token by hashing and matching digest', async () => {
      const rawToken = 'raw-refresh-token';
      jwtService.sign.mockReturnValue(rawToken);

      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: await bcrypt.hash('pass', 1) });
      await service.login({ email: 'test@test.com', password: 'pass' });

      // Now simulate refresh with the raw token
      const digest = crypto.createHash('sha256').update(rawToken).digest('hex');
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1', token: digest, userId: 'u-1', expiresAt: new Date(Date.now() + 3600000), revokedAt: null,
        user: mockUser,
      });

      const result = await service.refreshToken(rawToken);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should revoke old token and issue new one on refresh', async () => {
      const rawToken = 'old-refresh-token';
      const newRefreshToken = 'new-refresh-token';
      jwtService.sign
        .mockReturnValueOnce('old-access-token')
        .mockReturnValueOnce(rawToken)
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce(newRefreshToken);

      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: await bcrypt.hash('pass', 1) });
      await service.login({ email: 'test@test.com', password: 'pass' });

      const digest = crypto.createHash('sha256').update(rawToken).digest('hex');
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1', token: digest, userId: 'u-1', expiresAt: new Date(Date.now() + 3600000), revokedAt: null,
        user: mockUser,
      });

      await service.refreshToken(rawToken);

      // Old token should be revoked
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt-1' }, data: { revokedAt: expect.any(Date) } }),
      );
      const createCalls = prisma.refreshToken.create.mock.calls;
      const oldStoredDigest = createCalls[0][0].data.token;
      const newStoredDigest = createCalls[1][0].data.token;
      const oldDigest = crypto.createHash('sha256').update(rawToken).digest('hex');
      const newDigest = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

      expect(newRefreshToken).not.toBe(rawToken);
      expect(oldStoredDigest).toBe(oldDigest);
      expect(newStoredDigest).toBe(newDigest);
      expect(newStoredDigest).not.toBe(oldStoredDigest);
    });

    it('should reject revoked tokens', async () => {
      jwtService.verify.mockReturnValue({ sub: 'u-1' });
      const digest = crypto.createHash('sha256').update('revoked-token').digest('hex');
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1', token: digest, userId: 'u-1', expiresAt: new Date(Date.now() + 3600000),
        revokedAt: new Date(), user: mockUser,
      });

      await expect(service.refreshToken('revoked-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject expired tokens', async () => {
      jwtService.verify.mockReturnValue({ sub: 'u-1' });
      const digest = crypto.createHash('sha256').update('expired-token').digest('hex');
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1', token: digest, userId: 'u-1', expiresAt: new Date(Date.now() - 1000),
        revokedAt: null, user: mockUser,
      });

      await expect(service.refreshToken('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject malformed/wrong-secret tokens', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('invalid signature'); });
      await expect(service.refreshToken('bad-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('expiration config', () => {
    it('should use REFRESH_TOKEN_EXPIRES_IN for DB expiresAt', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'REFRESH_TOKEN_EXPIRES_IN') return '1h';
        if (key === 'JWT_SECRET') return 'jwt-secret';
        if (key === 'REFRESH_TOKEN_SECRET') return 'refresh-secret';
        if (key === 'JWT_EXPIRES_IN') return '15m';
        return undefined;
      });

      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: await bcrypt.hash('pass', 1) });
      await service.login({ email: 'test@test.com', password: 'pass' });

      const createCall = prisma.refreshToken.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt.getTime();
      const now = Date.now();
      // Should be roughly 1 hour from now (within 61 minutes)
      expect(expiresAt - now).toBeGreaterThan(59 * 60 * 1000);
      expect(expiresAt - now).toBeLessThan(61 * 60 * 1000);
    });
  });

  describe('validateJwtPayload', () => {
    it('should return DB-backed role and subscription', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser, role: UserRole.ADMIN, subscription: { type: SubscriptionType.PREMIUM },
      });
      const result = await service.validateJwtPayload({ sub: 'u-1', email: 'test@test.com', name: 'Tester', plan: SubscriptionType.FREE });
      expect(result).toBeDefined();
      expect(result!.role).toBe(UserRole.ADMIN);
      expect(result!.plan).toBe(SubscriptionType.PREMIUM);
    });
  });

  describe('auth responses', () => {
    it('should not expose passwordHash or stored refresh token fields', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: await bcrypt.hash('pass', 1) });
      const result = await service.login({ email: 'test@test.com', password: 'pass' });
      expect((result.user as any).passwordHash).toBeUndefined();
      expect((result.user as any).refreshTokens).toBeUndefined();
    });
  });
});
