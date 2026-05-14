import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@common/prisma.service';
import { RegisterDto, LoginDto, SocialLoginDto, AuthResponseDto, UserProfileDto } from './dto/auth.dto';
import { SubscriptionType, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';

type VerifiedSocialProfile = {
  email: string;
  name?: string;
  avatarUrl?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        subscription: {
          create: {
            type: SubscriptionType.FREE,
            status: 'ACTIVE',
          },
        },
        creditWallet: {
          create: {
            balance: 0,
          },
        },
      },
      include: {
        subscription: true,
        creditWallet: true,
      },
    });

    return this.generateTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { subscription: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    return this.generateTokens(user);
  }

  async socialLogin(dto: SocialLoginDto): Promise<AuthResponseDto> {
    const profile = await this.verifySocialToken(dto);

    const user = await this.prisma.user.upsert({
      where: { email: profile.email },
      update: {
        name: profile.name || dto.name || undefined,
        avatarUrl: profile.avatarUrl || undefined,
        lastActiveAt: new Date(),
      },
      create: {
        email: profile.email,
        name: profile.name || dto.name || profile.email.split('@')[0],
        avatarUrl: profile.avatarUrl,
        passwordHash: await bcrypt.hash(`sso:${dto.provider}:${randomUUID()}`, 12),
        subscription: {
          create: {
            type: SubscriptionType.FREE,
            status: 'ACTIVE',
          },
        },
        creditWallet: {
          create: {
            balance: 0,
          },
        },
      },
      include: {
        subscription: true,
        creditWallet: true,
      },
    });

    return this.generateTokens(user);
  }

  async refreshToken(token: string): Promise<AuthResponseDto> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { subscription: true } } },
    });

    if (!storedToken || storedToken.revokedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(storedToken.user);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user as UserProfileDto;
  }

  private async generateTokens(user: { id: string; email: string; name: string; subscription: { type: SubscriptionType } | null; role: UserRole }): Promise<AuthResponseDto> {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      plan: user.subscription?.type || SubscriptionType.FREE,
      role: user.role || UserRole.USER,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRES_IN', '7d'),
    });

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async validateJwtPayload(payload: { sub: string; email: string; name: string; plan: SubscriptionType }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { subscription: true },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.subscription?.type || SubscriptionType.FREE,
      role: user.role || UserRole.USER,
    };
  }

  private async verifySocialToken(dto: SocialLoginDto): Promise<VerifiedSocialProfile> {
    return this.verifyGoogleToken(dto.idToken);
  }

  private async verifyGoogleToken(idToken: string): Promise<VerifiedSocialProfile> {
    const allowedClientIds = this.getCsvConfig('GOOGLE_CLIENT_IDS');
    if (allowedClientIds.length === 0) {
      throw new BadRequestException('GOOGLE_CLIENT_IDS is not configured');
    }

    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const data = await response.json() as {
      aud?: string;
      email?: string;
      email_verified?: string | boolean;
      name?: string;
      picture?: string;
    };

    if (!data.aud || !allowedClientIds.includes(data.aud)) {
      throw new UnauthorizedException('Google token audience is not allowed');
    }

    if (!data.email || data.email_verified === false || data.email_verified === 'false') {
      throw new UnauthorizedException('Google email is not verified');
    }

    return {
      email: data.email,
      name: data.name,
      avatarUrl: data.picture,
    };
  }

  private getCsvConfig(key: string): string[] {
    const value = this.configService.get<string>(key) || '';
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
