import { IsEmail, IsIn, IsOptional, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase, one lowercase, and one number',
  })
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class SocialLoginDto {
  @ApiProperty({ enum: ['GOOGLE'], example: 'GOOGLE' })
  @IsIn(['GOOGLE'])
  provider: 'GOOGLE';

  @ApiProperty({ description: 'Identity token returned by the native/social provider' })
  @IsString()
  idToken: string;

  @ApiProperty({ required: false, example: 'João Silva' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
  };
}

export class UserProfileDto {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  lastActiveAt: Date;
}
