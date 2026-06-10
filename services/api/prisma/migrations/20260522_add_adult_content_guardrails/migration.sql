ALTER TABLE "narrative_events"
ADD COLUMN IF NOT EXISTS "adultContentGenerated" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "scene_media"
ADD COLUMN IF NOT EXISTS "adultContentGenerated" BOOLEAN NOT NULL DEFAULT false;
