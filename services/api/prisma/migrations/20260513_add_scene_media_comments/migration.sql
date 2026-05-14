-- CreateTable
CREATE TABLE "scene_media_comments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sceneMediaId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scene_media_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scene_media_comments_sceneMediaId_idx" ON "scene_media_comments"("sceneMediaId");

-- CreateIndex
CREATE INDEX "scene_media_comments_userId_idx" ON "scene_media_comments"("userId");

-- CreateIndex
CREATE INDEX "scene_media_comments_createdAt_idx" ON "scene_media_comments"("createdAt");

-- AddForeignKey
ALTER TABLE "scene_media_comments" ADD CONSTRAINT "scene_media_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_media_comments" ADD CONSTRAINT "scene_media_comments_sceneMediaId_fkey" FOREIGN KEY ("sceneMediaId") REFERENCES "scene_media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
