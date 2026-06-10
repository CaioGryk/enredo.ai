import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { LibraryService } from './library.service';
import { GetStoriesDto, StoryResponseDto, StoryWithCharactersDto, StoryListResponseDto, CharacterResponseDto } from './dto/library.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { Request } from 'express';
import { User } from '@prisma/client';

@ApiTags('library')
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get('stories')
  @ApiOperation({ summary: 'List all stories with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of stories', type: StoryListResponseDto })
  async getStories(@Query() query: GetStoriesDto): Promise<StoryListResponseDto> {
    return this.libraryService.getStories(query);
  }

  @Get('stories/:id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get story details with characters' })
  @ApiParam({ name: 'id', description: 'Story ID' })
  @ApiResponse({ status: 200, description: 'Story details', type: StoryWithCharactersDto })
  @ApiResponse({ status: 404, description: 'Story not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getStoryById(
    @Param('id') id: string,
    @Req() req: Request & { user?: User },
  ): Promise<StoryWithCharactersDto> {
    const userId = req.user?.id;
    return this.libraryService.getStoryById(id, userId);
  }

  @Get('stories/:id/characters')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get characters of a story' })
  @ApiParam({ name: 'id', description: 'Story ID' })
  @ApiResponse({ status: 200, description: 'Story characters', type: CharacterResponseDto, isArray: true })
  @ApiResponse({ status: 404, description: 'Story not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getStoryCharacters(
    @Param('id') id: string,
    @Req() req: Request & { user?: User },
  ) {
    const userId = req.user?.id;
    return this.libraryService.getStoryCharacters(id, userId);
  }

  @Get('genres')
  @ApiOperation({ summary: 'Get all available genres' })
  @ApiResponse({ status: 200, description: 'List of genres', type: String, isArray: true })
  async getGenres(): Promise<string[]> {
    return this.libraryService.getGenres();
  }
}