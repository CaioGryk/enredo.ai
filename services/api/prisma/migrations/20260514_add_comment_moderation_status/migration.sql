-- CreateEnum
CREATE TYPE "CommentModerationStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'REMOVED');

-- AlterTable
ALTER TABLE "scene_media_comments" ADD COLUMN "status" "CommentModerationStatus" NOT NULL DEFAULT 'VISIBLE';

-- CreateIndex
CREATE INDEX "scene_media_comments_status_idx" ON "scene_media_comments"("status");
