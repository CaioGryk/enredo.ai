import { Test, TestingModule } from '@nestjs/testing';
import { NarrativePreferencesService } from '../narrative-preferences.service';
import { PrismaService } from '@common/prisma.service';
import { RomanceIntensity } from '@prisma/client';

describe('NarrativePreferencesService', () => {
  let service: NarrativePreferencesService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      userNarrativePreferences: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NarrativePreferencesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NarrativePreferencesService>(NarrativePreferencesService);
    prisma = mockPrisma;
  });

  describe('getPreferences', () => {
    it('returns safe defaults when no preference record exists', async () => {
      prisma.userNarrativePreferences.findUnique.mockResolvedValue(null);

      const result = await service.getPreferences('user-1');

      expect(prisma.userNarrativePreferences.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result.romanceIntensity).toBe(RomanceIntensity.SOFT);
      expect(result.adultContentOptIn).toBe(false);
      expect(result.effectiveRomanceIntensity).toBe(RomanceIntensity.SOFT);
      expect(result.adultContentAllowed).toBe(false);
      expect(result.mediaAdultContentAllowed).toBe(false);
      expect(result.userLikenessAdultContentAllowed).toBe(false);
    });

    it('returns existing preferences with effective policy computed', async () => {
      prisma.userNarrativePreferences.findUnique.mockResolvedValue({
        userId: 'user-1',
        romanceIntensity: RomanceIntensity.SOFT,
        adultContentOptIn: false,
        ageVerifiedAt: null,
        adultTermsAcceptedAt: null,
      });

      const result = await service.getPreferences('user-1');

      expect(result.romanceIntensity).toBe(RomanceIntensity.SOFT);
      expect(result.effectiveRomanceIntensity).toBe(RomanceIntensity.SOFT);
    });
  });

  describe('updatePreferences', () => {
    it('updates SOFT/INTENSE levels without adult gates', async () => {
      prisma.userNarrativePreferences.findUnique.mockResolvedValue({
        userId: 'user-1',
        romanceIntensity: RomanceIntensity.SOFT,
        adultContentOptIn: false,
        ageVerifiedAt: null,
        adultTermsAcceptedAt: null,
      });
      prisma.userNarrativePreferences.upsert.mockResolvedValue({
        userId: 'user-1',
        romanceIntensity: RomanceIntensity.INTENSE,
        adultContentOptIn: false,
        ageVerifiedAt: null,
        adultTermsAcceptedAt: null,
      });

      const result = await service.updatePreferences('user-1', {
        romanceIntensity: RomanceIntensity.INTENSE,
      });

      expect(prisma.userNarrativePreferences.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 'user-1' },
        create: expect.objectContaining({ userId: 'user-1' }),
      }));
      expect(result.romanceIntensity).toBe(RomanceIntensity.INTENSE);
      expect(result.adultContentAllowed).toBe(false);
    });

    it('downgrades ADULT_18 to INTENSE when adult gates are missing', async () => {
      prisma.userNarrativePreferences.findUnique.mockResolvedValue({
        userId: 'user-1',
        romanceIntensity: RomanceIntensity.SOFT,
        adultContentOptIn: false,
        ageVerifiedAt: null,
        adultTermsAcceptedAt: null,
      });
      prisma.userNarrativePreferences.upsert.mockResolvedValue({
        userId: 'user-1',
        romanceIntensity: RomanceIntensity.ADULT_18,
        adultContentOptIn: false,
        ageVerifiedAt: null,
        adultTermsAcceptedAt: null,
      });

      const result = await service.updatePreferences('user-1', {
        romanceIntensity: RomanceIntensity.ADULT_18,
      });

      expect(result.romanceIntensity).toBe(RomanceIntensity.ADULT_18);
      expect(result.effectiveRomanceIntensity).toBe(RomanceIntensity.INTENSE);
      expect(result.adultContentAllowed).toBe(false);
    });

    it('allows ADULT_18 with opt-in + age + terms acceptance', async () => {
      const now = new Date();
      prisma.userNarrativePreferences.findUnique.mockResolvedValue({
        userId: 'user-1',
        romanceIntensity: RomanceIntensity.SOFT,
        adultContentOptIn: false,
        ageVerifiedAt: null,
        adultTermsAcceptedAt: null,
      });
      prisma.userNarrativePreferences.upsert.mockResolvedValue({
        userId: 'user-1',
        romanceIntensity: RomanceIntensity.ADULT_18,
        adultContentOptIn: true,
        ageVerifiedAt: now,
        adultTermsAcceptedAt: now,
      });

      const result = await service.updatePreferences('user-1', {
        romanceIntensity: RomanceIntensity.ADULT_18,
        adultContentOptIn: true,
        confirmAdultAge: true,
        acceptAdultTerms: true,
      });

      expect(result.romanceIntensity).toBe(RomanceIntensity.ADULT_18);
      expect(result.effectiveRomanceIntensity).toBe(RomanceIntensity.ADULT_18);
      expect(result.adultContentAllowed).toBe(true);
    });

    it('mediaAdultContentAllowed and userLikenessAdultContentAllowed are always false', async () => {
      const now = new Date();
      prisma.userNarrativePreferences.findUnique.mockResolvedValue(null);
      prisma.userNarrativePreferences.upsert.mockResolvedValue({
        userId: 'user-1',
        romanceIntensity: RomanceIntensity.ADULT_18,
        adultContentOptIn: true,
        ageVerifiedAt: now,
        adultTermsAcceptedAt: now,
      });

      const result = await service.updatePreferences('user-1', {
        romanceIntensity: RomanceIntensity.ADULT_18,
        adultContentOptIn: true,
        confirmAdultAge: true,
        acceptAdultTerms: true,
      });

      expect(result.adultContentAllowed).toBe(true);
      expect(result.mediaAdultContentAllowed).toBe(false);
      expect(result.userLikenessAdultContentAllowed).toBe(false);
    });

    it('ignores client-supplied timestamp fields and only stores backend timestamps from gate booleans', async () => {
      const clientDate = new Date('2000-01-01T00:00:00.000Z');
      prisma.userNarrativePreferences.findUnique.mockResolvedValue(null);
      prisma.userNarrativePreferences.upsert.mockResolvedValue({
        userId: 'user-1',
        romanceIntensity: RomanceIntensity.ADULT_18,
        adultContentOptIn: true,
        ageVerifiedAt: new Date(),
        adultTermsAcceptedAt: new Date(),
      });

      await service.updatePreferences('user-1', {
        romanceIntensity: RomanceIntensity.ADULT_18,
        adultContentOptIn: true,
        confirmAdultAge: true,
        acceptAdultTerms: true,
        ageVerifiedAt: clientDate,
        adultTermsAcceptedAt: clientDate,
      } as any);

      const upsertArgs = prisma.userNarrativePreferences.upsert.mock.calls[0][0];
      expect(upsertArgs.create.ageVerifiedAt).not.toBe(clientDate);
      expect(upsertArgs.create.adultTermsAcceptedAt).not.toBe(clientDate);
      expect(upsertArgs.update).not.toHaveProperty('ageVerifiedAt', clientDate);
      expect(upsertArgs.update).not.toHaveProperty('adultTermsAcceptedAt', clientDate);
    });
  });

  describe('getEffectivePolicy', () => {
    it('delegates to getPreferences', async () => {
      prisma.userNarrativePreferences.findUnique.mockResolvedValue(null);
      const result = await service.getEffectivePolicy('user-1');
      expect(result.romanceIntensity).toBe(RomanceIntensity.SOFT);
    });
  });
});
