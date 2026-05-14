import { Test, TestingModule } from '@nestjs/testing';
import { StoryGenerationController } from '../story-generation.controller';
import { StoryGenerationService } from '../story-generation.service';
import { CreateStoryGenerationDto } from '../dto/create-story-generation.dto';

describe('StoryGenerationController', () => {
  let controller: StoryGenerationController;
  let service: jest.Mocked<StoryGenerationService>;

  beforeEach(async () => {
    const mockService = {
      generateStory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoryGenerationController],
      providers: [
        {
          provide: StoryGenerationService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<StoryGenerationController>(StoryGenerationController);
    service = module.get(StoryGenerationService);
  });

  it('should use user.id from @CurrentUser decorator (not req.user.sub)', async () => {
    const userId = 'user-123';
    const dto: CreateStoryGenerationDto = { keywords: ['test'] };

    service.generateStory.mockResolvedValue({} as any);

    await controller.generateStory(userId, dto);

    expect(service.generateStory).toHaveBeenCalledWith(userId, dto);
    expect(service.generateStory).toHaveBeenCalledWith('user-123', expect.any(Object));
  });
});
