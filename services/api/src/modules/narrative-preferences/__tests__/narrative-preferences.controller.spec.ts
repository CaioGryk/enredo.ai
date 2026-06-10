import { Test, TestingModule } from '@nestjs/testing';
import { NarrativePreferencesController } from '../narrative-preferences.controller';
import { NarrativePreferencesService } from '../narrative-preferences.service';
import { RomanceIntensity } from '@prisma/client';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

describe('NarrativePreferencesController', () => {
  let controller: NarrativePreferencesController;
  let service: any;

  beforeEach(async () => {
    service = {
      getPreferences: jest.fn().mockResolvedValue({ romanceIntensity: 'SOFT' }),
      updatePreferences: jest.fn().mockResolvedValue({ romanceIntensity: 'INTENSE' }),
      getEffectivePolicy: jest.fn().mockResolvedValue({ adultContentAllowed: false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NarrativePreferencesController],
      providers: [{ provide: NarrativePreferencesService, useValue: service }],
    }).compile();

    controller = module.get<NarrativePreferencesController>(NarrativePreferencesController);
  });

  it('GET me delegates to service', async () => {
    await controller.getMyPreferences('user-1');
    expect(service.getPreferences).toHaveBeenCalledWith('user-1');
  });

  it('PATCH me delegates to service with userId and dto', async () => {
    const dto = { romanceIntensity: RomanceIntensity.INTENSE };
    await controller.updatePreferences('user-1', dto);
    expect(service.updatePreferences).toHaveBeenCalledWith('user-1', dto);
  });

  it('GET me/effective-policy delegates to service', async () => {
    await controller.getEffectivePolicy('user-1');
    expect(service.getEffectivePolicy).toHaveBeenCalledWith('user-1');
  });

  it('applies JwtAuthGuard at controller level', () => {
    const guards = Reflect.getMetadata('__guards__', NarrativePreferencesController);
    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard]));
  });
});
