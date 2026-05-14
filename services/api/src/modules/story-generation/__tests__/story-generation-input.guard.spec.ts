import { StoryGenerationInputGuard } from '../story-generation-input.guard';
import { BadRequestException } from '@nestjs/common';
import { CreateStoryGenerationDto } from '../dto/create-story-generation.dto';

describe('StoryGenerationInputGuard', () => {
  const guard = new StoryGenerationInputGuard();

  describe('keywords normalization', () => {
    it('should trim keywords', () => {
      const dto: CreateStoryGenerationDto = {
        keywords: [' test1 ', 'test2 ', ' test3'],
      };

      const result = guard.validate(dto);

      expect(result.keywords).toEqual(['test1', 'test2', 'test3']);
    });

    it('should remove empty keywords', () => {
      const dto: CreateStoryGenerationDto = {
        keywords: ['valid', '', '  ', 'also-valid'],
      };

      const result = guard.validate(dto);

      expect(result.keywords).toEqual(['valid', 'also-valid']);
    });

    it('should normalize duplicate keywords case-insensitively', () => {
      const dto: CreateStoryGenerationDto = {
        keywords: ['Fantasy', 'fantasy', 'Adventure', 'adventure'],
      };

      const result = guard.validate(dto);

      expect(result.keywords).toEqual(['Fantasy', 'Adventure']);
    });

    it('should reject if no valid keywords remain', () => {
      const dto: CreateStoryGenerationDto = {
        keywords: ['', '  '],
      };

      expect(() => guard.validate(dto)).toThrow(BadRequestException);
    });

    it('should reject more than 8 keywords', () => {
      const dto: CreateStoryGenerationDto = {
        keywords: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
      };

      expect(() => guard.validate(dto)).toThrow(BadRequestException);
    });

    it('should reject keyword shorter than 2 chars', () => {
      const dto: CreateStoryGenerationDto = {
        keywords: ['a'],
      };

      expect(() => guard.validate(dto)).toThrow(BadRequestException);
    });

    it('should reject keyword longer than 50 chars', () => {
      const dto: CreateStoryGenerationDto = {
        keywords: ['a'.repeat(51)],
      };

      expect(() => guard.validate(dto)).toThrow(BadRequestException);
    });
  });

  describe('optional fields validation', () => {
    it('should trim genre', () => {
      const dto: CreateStoryGenerationDto = {
        keywords: ['test'],
        genre: '  fantasy  ',
      };

      const result = guard.validate(dto);

      expect(result.genre).toBe('fantasy');
    });

    it('should reject genre longer than 50 chars', () => {
      const dto: CreateStoryGenerationDto = {
        keywords: ['test'],
        genre: 'a'.repeat(51),
      };

      expect(() => guard.validate(dto)).toThrow(BadRequestException);
    });

    it('should trim tone', () => {
      const dto: CreateStoryGenerationDto = {
        keywords: ['test'],
        tone: '  cinematic  ',
      };

      const result = guard.validate(dto);

      expect(result.tone).toBe('cinematic');
    });

    it('should reject tone longer than 50 chars', () => {
      const dto: CreateStoryGenerationDto = {
        keywords: ['test'],
        tone: 'a'.repeat(51),
      };

      expect(() => guard.validate(dto)).toThrow(BadRequestException);
    });

    it('should trim targetAudience', () => {
      const dto: CreateStoryGenerationDto = {
        keywords: ['test'],
        targetAudience: '  young adult  ',
      };

      const result = guard.validate(dto);

      expect(result.targetAudience).toBe('young adult');
    });

    it('should reject targetAudience longer than 50 chars', () => {
      const dto: CreateStoryGenerationDto = {
        keywords: ['test'],
        targetAudience: 'a'.repeat(51),
      };

      expect(() => guard.validate(dto)).toThrow(BadRequestException);
    });

    it('should trim constraints', () => {
      const dto: CreateStoryGenerationDto = {
        keywords: ['test'],
        constraints: '  no violence  ',
      };

      const result = guard.validate(dto);

      expect(result.constraints).toBe('no violence');
    });

    it('should reject constraints longer than 500 chars', () => {
      const dto: CreateStoryGenerationDto = {
        keywords: ['test'],
        constraints: 'a'.repeat(501),
      };

      expect(() => guard.validate(dto)).toThrow(BadRequestException);
    });
  });

  describe('prompt injection detection', () => {
    const injectionPatterns = [
      'ignore previous instructions',
      'ignore all instructions',
      'you are now a',
      'pretend you are a',
      'system prompt',
      'developer mode',
      'jailbreak',
      'DAN',
      'bypass safety',
      'disable safety',
    ];

    injectionPatterns.forEach(pattern => {
      it(`should detect injection in keywords: "${pattern}"`, () => {
        const dto: CreateStoryGenerationDto = {
          keywords: ['fantasy', pattern],
        };

        expect(() => guard.validate(dto)).toThrow(BadRequestException);
      });

      it(`should detect injection in constraints: "${pattern}"`, () => {
        const dto: CreateStoryGenerationDto = {
          keywords: ['fantasy'],
          constraints: `write a story but ${pattern}`,
        };

        expect(() => guard.validate(dto)).toThrow(BadRequestException);
      });
    });
  });

  describe('valid input', () => {
    it('should return SafeStoryGenerationInput for valid input', () => {
      const dto: CreateStoryGenerationDto = {
        keywords: ['fantasy', 'magic'],
        genre: 'adventure',
        tone: 'cinematic',
        targetAudience: 'young adult',
        constraints: 'no explicit violence',
      };

      const result = guard.validate(dto);

      expect(result.keywords).toEqual(['fantasy', 'magic']);
      expect(result.genre).toBe('adventure');
      expect(result.tone).toBe('cinematic');
      expect(result.targetAudience).toBe('young adult');
      expect(result.constraints).toBe('no explicit violence');
    });

    it('should work with only keywords', () => {
      const dto: CreateStoryGenerationDto = {
        keywords: ['mystery'],
      };

      const result = guard.validate(dto);

      expect(result.keywords).toEqual(['mystery']);
      expect(result.genre).toBeUndefined();
    });
  });
});
