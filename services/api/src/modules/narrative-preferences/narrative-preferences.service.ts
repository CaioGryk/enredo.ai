import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma.service';
import { RomanceIntensity } from '@prisma/client';
import {
  UpdateNarrativePreferencesDto,
  NarrativePreferencesResponseDto,
} from './dto/narrative-preferences.dto';

@Injectable()
export class NarrativePreferencesService {
  private readonly logger = new Logger(NarrativePreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string): Promise<NarrativePreferencesResponseDto> {
    const record = await this.prisma.userNarrativePreferences.findUnique({
      where: { userId },
    });

    if (!record) {
      return this.defaultResponse();
    }

    return this.computeEffectivePolicy(record);
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNarrativePreferencesDto,
  ): Promise<NarrativePreferencesResponseDto> {
    const existing = await this.prisma.userNarrativePreferences.findUnique({
      where: { userId },
    });

    const now = new Date();

    const data: any = {};

    if (dto.romanceIntensity !== undefined) {
      data.romanceIntensity = dto.romanceIntensity;
    }

    if (dto.adultContentOptIn !== undefined) {
      data.adultContentOptIn = dto.adultContentOptIn;
    }

    if (dto.confirmAdultAge === true) {
      data.ageVerifiedAt = now;
    }

    if (dto.acceptAdultTerms === true) {
      data.adultTermsAcceptedAt = now;
    }

    const record = await this.prisma.userNarrativePreferences.upsert({
      where: { userId },
      create: {
        userId,
        romanceIntensity: dto.romanceIntensity ?? RomanceIntensity.SOFT,
        adultContentOptIn: dto.adultContentOptIn ?? false,
        ageVerifiedAt: dto.confirmAdultAge ? now : null,
        adultTermsAcceptedAt: dto.acceptAdultTerms ? now : null,
      },
      update: data,
    });

    return this.computeEffectivePolicy(record);
  }

  async getEffectivePolicy(userId: string): Promise<NarrativePreferencesResponseDto> {
    return this.getPreferences(userId);
  }

  private computeEffectivePolicy(record: any): NarrativePreferencesResponseDto {
    const requestedIntensity = record.romanceIntensity as RomanceIntensity;

    const hasAllGates =
      record.adultContentOptIn === true &&
      record.ageVerifiedAt != null &&
      record.adultTermsAcceptedAt != null;

    let effectiveRomanceIntensity: RomanceIntensity;

    if (requestedIntensity === RomanceIntensity.ADULT_18 && !hasAllGates) {
      effectiveRomanceIntensity = RomanceIntensity.INTENSE;
    } else {
      effectiveRomanceIntensity = requestedIntensity;
    }

    const adultContentAllowed =
      effectiveRomanceIntensity === RomanceIntensity.ADULT_18;

    return {
      romanceIntensity: requestedIntensity,
      adultContentOptIn: record.adultContentOptIn,
      ageVerifiedAt: record.ageVerifiedAt ?? null,
      adultTermsAcceptedAt: record.adultTermsAcceptedAt ?? null,
      effectiveRomanceIntensity,
      adultContentAllowed,
      mediaAdultContentAllowed: false,
      userLikenessAdultContentAllowed: false,
    };
  }

  private defaultResponse(): NarrativePreferencesResponseDto {
    return {
      romanceIntensity: RomanceIntensity.SOFT,
      adultContentOptIn: false,
      ageVerifiedAt: null,
      adultTermsAcceptedAt: null,
      effectiveRomanceIntensity: RomanceIntensity.SOFT,
      adultContentAllowed: false,
      mediaAdultContentAllowed: false,
      userLikenessAdultContentAllowed: false,
    };
  }
}
