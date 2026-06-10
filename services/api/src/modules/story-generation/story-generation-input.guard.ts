import { BadRequestException } from '@nestjs/common';
import { CreateStoryGenerationDto } from './dto/create-story-generation.dto';
import { INJECTION_PATTERNS } from '../moderation/moderation.service';

export type SafeStoryGenerationInput = {
  keywords: string[];
  genre?: string;
  tone?: string;
  targetAudience?: string;
  constraints?: string;
};

const MAX_KEYWORDS = 8;
const MIN_KEYWORD_LENGTH = 2;
const MAX_KEYWORD_LENGTH = 50;
const MAX_FIELD_LENGTH = 50;
const MAX_CONSTRAINTS_LENGTH = 500;

export class StoryGenerationInputGuard {
  validate(dto: CreateStoryGenerationDto): SafeStoryGenerationInput {
    // 1. Normalize keywords
    const normalizedKeywords = this.normalizeKeywords(dto.keywords);

    // 2. Validate keywords
    this.validateKeywords(normalizedKeywords);

    // 3. Normalize optional fields
    const genre = dto.genre?.trim();
    const tone = dto.tone?.trim();
    const targetAudience = dto.targetAudience?.trim();
    const constraints = dto.constraints?.trim();

    // 4. Validate optional fields
    this.validateOptionalField('genre', genre, MAX_FIELD_LENGTH);
    this.validateOptionalField('tone', tone, MAX_FIELD_LENGTH);
    this.validateOptionalField('targetAudience', targetAudience, MAX_FIELD_LENGTH);
    this.validateOptionalField('constraints', constraints, MAX_CONSTRAINTS_LENGTH);

    // 5. Check prompt injection
    this.checkInjection('keywords', normalizedKeywords.join(' '));
    this.checkInjection('genre', genre);
    this.checkInjection('tone', tone);
    this.checkInjection('targetAudience', targetAudience);
    this.checkInjection('constraints', constraints);

    // 6. Return safe input
    return {
      keywords: normalizedKeywords,
      ...(genre && { genre }),
      ...(tone && { tone }),
      ...(targetAudience && { targetAudience }),
      ...(constraints && { constraints }),
    };
  }

  private normalizeKeywords(keywords: string[]): string[] {
    // Trim, remove empty, deduplicate (case-insensitive)
    const trimmed = keywords
      .map(k => k.trim())
      .filter(k => k.length > 0);

    // Deduplicate case-insensitively
    const seen = new Set<string>();
    const result: string[] = [];
    
    for (const kw of trimmed) {
      const lower = kw.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(kw);
      }
    }

    return result;
  }

  private validateKeywords(keywords: string[]): void {
    if (keywords.length === 0) {
      throw new BadRequestException({
        message: 'No valid keywords provided',
        issues: ['At least one valid keyword is required'],
      });
    }

    if (keywords.length > MAX_KEYWORDS) {
      throw new BadRequestException({
        message: 'Too many keywords',
        issues: [`Maximum ${MAX_KEYWORDS} keywords allowed, got ${keywords.length}`],
      });
    }

    const issues: string[] = [];
    keywords.forEach((kw, index) => {
      if (kw.length < MIN_KEYWORD_LENGTH) {
        issues.push(`Keyword ${index + 1} is too short (min ${MIN_KEYWORD_LENGTH} chars)`);
      }
      if (kw.length > MAX_KEYWORD_LENGTH) {
        issues.push(`Keyword ${index + 1} is too long (max ${MAX_KEYWORD_LENGTH} chars)`);
      }
    });

    if (issues.length > 0) {
      throw new BadRequestException({
        message: 'Invalid keywords',
        issues,
      });
    }
  }

  private validateOptionalField(fieldName: string, value: string | undefined, maxLength: number): void {
    if (value && value.length > maxLength) {
      throw new BadRequestException({
        message: `Field ${fieldName} is too long`,
        issues: [`${fieldName} must be at most ${maxLength} characters`],
      });
    }
  }

  private checkInjection(fieldName: string, value: string | undefined): void {
    if (!value) return;

    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(value)) {
        throw new BadRequestException({
          message: 'Input contains potentially unsafe content',
          issues: [`Prompt injection detected in ${fieldName}`],
        });
      }
    }
  }
}
