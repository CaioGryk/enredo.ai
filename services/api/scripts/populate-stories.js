#!/usr/bin/env node

const { NestFactory } = require('@nestjs/core');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  const storyIds = [];
  let force = false;

  // Parse arguments
  for (const arg of args) {
    if (arg.startsWith('--storyId=')) {
      storyIds.push(arg.split('=')[1]);
    } else if (arg.startsWith('--storyIds=')) {
      const ids = arg.split('=')[1].split(',').map(s => s.trim());
      storyIds.push(...ids);
    } else if (arg === '--force' || arg === '-f') {
      force = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (storyIds.length === 0) {
    console.error('Error: No story IDs provided.');
    printHelp();
    process.exit(1);
  }

  console.log(`Starting population for ${storyIds.length} storie(s), force=${force}`);

  // Load the built modules
  const appModulePath = path.join(__dirname, '../dist/src/app.module');
  const { AppModule } = require(appModulePath);

  const { Logger } = require('@nestjs/common');
  const logger = new Logger('PopulateStories');

  // Bootstrap NestJS app
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const prismaService = app.get('PrismaService');
  const storySetupService = app.get('StorySetupService');

  const results = [];

  try {
    for (const storyId of storyIds) {
      const result = await populateStory(storySetupService, storyId, force);
      results.push(result);
    }

    // Print summary
    printSummary(results);

    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('Population failed:', error.message);
    await app.close();
    process.exit(1);
  }

  async function populateStory(storySetupService, storyId, force) {
    const result = {
      storyId,
      storyTitle: '',
      premises: [],
      characters: [],
    };

    try {
      // Get story info
      const story = await storySetupService.prisma.story.findUnique({
        where: { id: storyId },
      });

      if (!story) {
        logger.warn(`Story not found: ${storyId}`);
        result.storyTitle = '(not found)';
        return result;
      }

      result.storyTitle = story.title;
      logger.log(`Processing story: "${story.title}" (${storyId})`);

      // Generate premises
      logger.log(`  Generating premises (force=${force})...`);
      const premises = await storySetupService.generatePremises(storyId, force);

      for (const premise of premises) {
        const premiseResult = {
          id: premise.id,
          title: premise.title,
          textGenerated: true,
          imageGenerated: !!premise.coverUrl,
          imageStatus: premise.coverGenerationStatus || 'UNKNOWN',
          imageError: premise.coverError,
        };
        result.premises.push(premiseResult);

        logger.log(`    Premise: "${premise.title}" - text: yes, image: ${premiseResult.imageGenerated ? 'yes' : 'no'} (${premiseResult.imageStatus})`);

        // Generate characters for this premise
        logger.log(`    Generating characters for premise "${premise.title}"...`);
        const characters = await storySetupService.generateCharacters(premise.id, force);

        const characterResults = [];
        for (const character of characters) {
          const charResult = {
            id: character.id,
            name: character.name,
            textGenerated: true,
            imageGenerated: !!character.imageUrl,
            imageStatus: character.imageGenerationStatus || 'UNKNOWN',
            imageError: character.imageError,
          };
          characterResults.push(charResult);

          logger.log(`      Character: "${character.name}" - text: yes, image: ${charResult.imageGenerated ? 'yes' : 'no'} (${charResult.imageStatus})`);
        }

        result.characters.push({
          premiseId: premise.id,
          premiseTitle: premise.title,
          characters: characterResults,
        });
      }

      logger.log(`  Completed story: "${story.title}"`);
    } catch (error) {
      logger.error(`  Failed to process story ${storyId}:`, error.message);
    }

    return result;
  }

  function printSummary(results) {
    console.log('\n' + '='.repeat(60));
    console.log('POPULATION SUMMARY');
    console.log('='.repeat(60));

    let totalStories = 0;
    let totalPremises = 0;
    let totalCharacters = 0;
    let imageSuccess = 0;
    let imageFailed = 0;

    for (const result of results) {
      totalStories++;
      console.log(`\nStory: "${result.storyTitle}" (${result.storyId})`);
      console.log('-'.repeat(40));

      for (const premise of result.premises) {
        totalPremises++;
        console.log(`  Premise: "${premise.title}"`);
        console.log(`    Text generated: yes`);
        console.log(`    Image generated: ${premise.imageGenerated ? 'yes' : 'no'}`);
        console.log(`    Image status: ${premise.imageStatus}`);
        if (premise.imageError) {
          console.log(`    Image error: ${premise.imageError}`);
        }

        if (premise.imageGenerated) imageSuccess++;
        else if (premise.imageStatus === 'FAILED') imageFailed++;

        const chars = result.characters.find(c => c.premiseId === premise.id);
        if (chars) {
          for (const char of chars.characters) {
            totalCharacters++;
            console.log(`    Character: "${char.name}"`);
            console.log(`      Text generated: yes`);
            console.log(`      Image generated: ${char.imageGenerated ? 'yes' : 'no'}`);
            console.log(`      Image status: ${char.imageStatus}`);
            if (char.imageError) {
              console.log(`      Image error: ${char.imageError}`);
            }

            if (char.imageGenerated) imageSuccess++;
            else if (char.imageStatus === 'FAILED') imageFailed++;
          }
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('TOTALS:');
    console.log(`  Stories processed: ${totalStories}`);
    console.log(`  Premises generated: ${totalPremises}`);
    console.log(`  Characters generated: ${totalCharacters}`);
    console.log(`  Images successful: ${imageSuccess}`);
    console.log(`  Images failed: ${imageFailed}`);
    console.log('='.repeat(60));
  }

  function printHelp() {
    console.log(`
Population Script for Enredo.ai

Usage:
  node scripts/populate-stories.js --storyId=<id>
  node scripts/populate-stories.js --storyIds=<id1>,<id2>,<id3>
  node scripts/populate-stories.js --storyId=<id> --force

Options:
  --storyId=<id>        Populate a single story by ID
  --storyIds=<ids>      Populate multiple stories (comma-separated)
  --force               Force regeneration of existing content
  --help, -h           Show this help message

Examples:
  node scripts/populate-stories.js --storyId=abc-123
  node scripts/populate-stories.js --storyIds=abc-123,def-456
  node scripts/populate-stories.js --storyIds=abc-123,def-456 --force

Notes:
  - Requires OPENROUTER_API_KEY for text generation (free)
  - Requires GOOGLE_AI_API_KEY for image generation
  - Set ENABLE_IMAGE_GENERATION=true to generate images
  - Video generation is disabled (ENABLE_VIDEO_GENERATION=false)
  `);
  }
}

main();
