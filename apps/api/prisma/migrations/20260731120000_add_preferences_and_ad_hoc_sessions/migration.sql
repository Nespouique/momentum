ALTER TABLE "users"
ADD COLUMN "accent_color" TEXT NOT NULL DEFAULT '#FAFAFA';

CREATE TYPE "SessionType" AS ENUM ('planned', 'ad_hoc');

ALTER TABLE "workout_sessions"
ADD COLUMN "type" "SessionType" NOT NULL DEFAULT 'planned',
ALTER COLUMN "workout_id" DROP NOT NULL;

ALTER TABLE "workout_sessions"
ADD CONSTRAINT "workout_sessions_type_workout_check"
CHECK (
  ("type" = 'planned' AND "workout_id" IS NOT NULL)
  OR ("type" = 'ad_hoc' AND "workout_id" IS NULL)
);

-- Keep the most recently started session active if historical concurrent starts created duplicates.
WITH ranked_active_sessions AS (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "user_id"
           ORDER BY "started_at" DESC, "id" DESC
         ) AS rank
  FROM "workout_sessions"
  WHERE "status" = 'in_progress'
)
UPDATE "workout_sessions"
SET "status" = 'abandoned',
    "completed_at" = COALESCE("completed_at", NOW())
WHERE "id" IN (
  SELECT "id"
  FROM ranked_active_sessions
  WHERE rank > 1
);

CREATE UNIQUE INDEX "workout_sessions_one_in_progress_per_user"
ON "workout_sessions" ("user_id")
WHERE "status" = 'in_progress';
