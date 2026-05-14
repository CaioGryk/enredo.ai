-- CreateTable
CREATE TABLE "scene_media_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sceneMediaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_media_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_media_saves" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sceneMediaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_media_saves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_media_shares" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sceneMediaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_media_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scene_media_likes_userId_sceneMediaId_key" ON "scene_media_likes"("userId", "sceneMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "scene_media_saves_userId_sceneMediaId_key" ON "scene_media_saves"("userId", "sceneMediaId");

-- CreateIndex
CREATE INDEX "scene_media_likes_userId_idx" ON "scene_media_likes"("userId");

-- CreateIndex
CREATE INDEX "scene_media_likes_sceneMediaId_idx" ON "scene_media_likes"("sceneMediaId");

-- CreateIndex
CREATE INDEX "scene_media_saves_userId_idx" ON "scene_media_saves"("userId");

-- CreateIndex
CREATE INDEX "scene_media_saves_sceneMediaId_idx" ON "scene_media_saves"("sceneMediaId");

-- CreateIndex
CREATE INDEX "scene_media_shares_userId_idx" ON "scene_media_shares"("userId");

-- CreateIndex
CREATE INDEX "scene_media_shares_sceneMediaId_idx" ON "scene_media_shares"("sceneMediaId");

-- AddForeignKey
ALTER TABLE "scene_media_likes" ADD CONSTRAINT "scene_media_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_media_likes" ADD CONSTRAINT "scene_media_likes_sceneMediaId_fkey" FOREIGN KEY ("sceneMediaId") REFERENCES "scene_media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_media_saves" ADD CONSTRAINT "scene_media_saves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_media_saves" ADD CONSTRAINT "scene_media_saves_sceneMediaId_fkey" FOREIGN KEY ("sceneMediaId") REFERENCES "scene_media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_media_shares" ADD CONSTRAINT "scene_media_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_media_shares" ADD CONSTRAINT "scene_media_shares_sceneMediaId_fkey" FOREIGN KEY ("sceneMediaId") REFERENCES "scene_media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
