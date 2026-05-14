import { Test, TestingModule } from '@nestjs/testing';
import { StoryLifecycleController } from '../story-lifecycle.controller';
import { StoryLifecycleService } from '../story-lifecycle.service';
import { CreateStoryDto } from '../dto/create-story.dto';

describe('StoryLifecycleController', () => {
  let controller: StoryLifecycleController;
  let service: jest.Mocked<StoryLifecycleService>;

  beforeEach(async () => {
    const mockService = {
      getMyStories: jest.fn(),
      getStoryStatus: jest.fn(),
      createStory: jest.fn(),
      updateStory: jest.fn(),
      submitStory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoryLifecycleController],
      providers: [
        {
          provide: StoryLifecycleService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<StoryLifecycleController>(StoryLifecycleController);
    service = module.get(StoryLifecycleService);
  });

  it('should use user.id from @CurrentUser decorator (not req.user.userId)', async () => {
    const userId = 'user-456';

    await controller.getMyStories(userId);
    expect(service.getMyStories).toHaveBeenCalledWith(userId);

    await controller.getStoryStatus(userId, 'story-1');
    expect(service.getStoryStatus).toHaveBeenCalledWith(userId, 'story-1');

    const createDto: CreateStoryDto = { title: 'Test', synopsis: 'Test', genres: ['Adventure'] };
    await controller.createStory(userId, createDto);
    expect(service.createStory).toHaveBeenCalledWith(userId, createDto);

    const updateDto: any = { title: 'Updated' };
    await controller.updateStory(userId, 'story-1', updateDto);
    expect(service.updateStory).toHaveBeenCalledWith(userId, 'story-1', updateDto);

    await controller.submitStory(userId, 'story-1', { note: 'Ready' });
    expect(service.submitStory).toHaveBeenCalledWith(userId, 'story-1', 'Ready');
  });
});
