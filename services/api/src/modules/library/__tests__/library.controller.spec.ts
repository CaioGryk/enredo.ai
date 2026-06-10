import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { LibraryController } from '../library.controller';
import { LibraryService } from '../library.service';

describe('LibraryController', () => {
  let controller: LibraryController;
  let service: { getStoryById: jest.Mock; getStoryCharacters: jest.Mock };

  beforeEach(async () => {
    service = {
      getStoryById: jest.fn().mockResolvedValue({ id: 'story-1' }),
      getStoryCharacters: jest.fn().mockResolvedValue({ storyId: 'story-1', characters: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LibraryController],
      providers: [{ provide: LibraryService, useValue: service }],
    }).compile();

    controller = module.get<LibraryController>(LibraryController);
  });

  describe('getStoryById', () => {
    it('passes user id when authenticated', async () => {
      const req = { user: { id: 'user-1' } } as any;
      await controller.getStoryById('story-1', req);
      expect(service.getStoryById).toHaveBeenCalledWith('story-1', 'user-1');
    });

    it('passes undefined when not authenticated', async () => {
      const req = {} as any;
      await controller.getStoryById('story-1', req);
      expect(service.getStoryById).toHaveBeenCalledWith('story-1', undefined);
    });
  });

  describe('getStoryCharacters', () => {
    it('passes user id when authenticated', async () => {
      const req = { user: { id: 'user-1' } } as any;
      await controller.getStoryCharacters('story-1', req);
      expect(service.getStoryCharacters).toHaveBeenCalledWith('story-1', 'user-1');
    });

    it('passes undefined when not authenticated', async () => {
      const req = {} as any;
      await controller.getStoryCharacters('story-1', req);
      expect(service.getStoryCharacters).toHaveBeenCalledWith('story-1', undefined);
    });
  });
});
