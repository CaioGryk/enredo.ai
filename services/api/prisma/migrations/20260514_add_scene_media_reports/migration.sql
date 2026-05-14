-- CreateEnum
CREATE TYPE "SceneMediaReportTargetType" AS ENUM ('SCENE_MEDIA', 'COMMENT');

-- CreateEnum
CREATE TYPE "SceneMediaReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- CreateTable
CREATE TABLE "scene_media_reports" (
    "id" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "targetType" "SceneMediaReportTargetType" NOT NULL,
    "sceneMediaId" TEXT,
    "commentId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "SceneMediaReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scene_media_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scene_media_reports_reporterUserId_sceneMediaId_key" ON "scene_media_reports"("reporterUserId", "sceneMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "scene_media_reports_reporterUserId_commentId_key" ON "scene_media_reports"("reporterUserId", "commentId");

-- CreateIndex
CREATE INDEX "scene_media_reports_reporterUserId_idx" ON "scene_media_reports"("reporterUserId");
CREATE INDEX "scene_media_reports_targetType_idx" ON "scene_media_reports"("targetType");
CREATE INDEX "scene_media_reports_status_idx" ON "scene_media_reports"("status");
CREATE INDEX "scene_media_reports_sceneMediaId_idx" ON "scene_media_reports"("sceneMediaId");
CREATE INDEX "scene_media_reports_commentId_idx" ON "scene_media_reports"("commentId");
CREATE INDEX "scene_media_reports_createdAt_idx" ON "scene_media_reports"("createdAt");

-- AddForeignKey
ALTER TABLE "scene_media_reports" ADD CONSTRAINT "scene_media_reports_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "scene_media_reports" ADD CONSTRAINT "scene_media_reports_sceneMediaId_fkey" FOREIGN KEY ("sceneMediaId") REFERENCES "scene_media"("id") ON DELETE CASCADE;
ALTER TABLE "scene_media_reports" ADD CONSTRAINT "scene_media_reports_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "scene_media_comments"("id") ON DELETE CASCADE;
