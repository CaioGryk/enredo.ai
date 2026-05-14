-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'SUCCESS', 'FAILED');

-- Add visual generation status fields to StoryPremise
ALTER TABLE "story_premises" ADD COLUMN "coverGenerationStatus" "GenerationStatus" NOT NULL DEFAULT 'NOT_REQUESTED';
ALTER TABLE "story_premises" ADD COLUMN "coverError" TEXT;

-- Add visual generation status fields to StoryPlayableCharacter
ALTER TABLE "story_playable_characters" ADD COLUMN "imageGenerationStatus" "GenerationStatus" NOT NULL DEFAULT 'NOT_REQUESTED';
ALTER TABLE "story_playable_characters" ADD COLUMN "imageError" TEXT;
