import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET')!,
    });
  }

  async validate(payload: { sub: string; email: string; name: string; plan: string }) {
    const user = await this.authService.validateJwtPayload({
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      plan: payload.plan as 'FREE' | 'PREMIUM',
    });

    return user;
  }
}