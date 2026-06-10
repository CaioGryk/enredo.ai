import { IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RomanceIntensity } from '@prisma/client';

export class UpdateNarrativePreferencesDto {
  @ApiPropertyOptional({ enum: RomanceIntensity })
  @IsOptional()
  @IsEnum(RomanceIntensity)
  romanceIntensity?: RomanceIntensity;

  @ApiPropertyOptional({ description: 'Opt-in to adult narrative content' })
  @IsOptional()
  @IsBoolean()
  adultContentOptIn?: boolean;

  @ApiPropertyOptional({ description: 'Confirm user is 18+ years old' })
  @IsOptional()
  @IsBoolean()
  confirmAdultAge?: boolean;

  @ApiPropertyOptional({ description: 'Accept adult content terms' })
  @IsOptional()
  @IsBoolean()
  acceptAdultTerms?: boolean;
}

export class NarrativePreferencesResponseDto {
  @ApiProperty({ enum: RomanceIntensity })
  romanceIntensity: RomanceIntensity;

  @ApiProperty()
  adultContentOptIn: boolean;

  @ApiPropertyOptional()
  ageVerifiedAt?: Date | null;

  @ApiPropertyOptional()
  adultTermsAcceptedAt?: Date | null;

  @ApiProperty({ enum: RomanceIntensity })
  effectiveRomanceIntensity: RomanceIntensity;

  @ApiProperty()
  adultContentAllowed: boolean;

  @ApiProperty()
  mediaAdultContentAllowed: boolean;

  @ApiProperty()
  userLikenessAdultContentAllowed: boolean;
}
