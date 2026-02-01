-- CreateEnum
CREATE TYPE "SuggestionType" AS ENUM ('increase_weight', 'increase_reps');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('pending', 'accepted', 'dismissed');

-- CreateTable
CREATE TABLE "progression_suggestions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "suggestion_type" "SuggestionType" NOT NULL,
    "current_value" DOUBLE PRECISION NOT NULL,
    "suggested_value" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "progression_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "progression_suggestions_user_id_exercise_id_idx" ON "progression_suggestions"("user_id", "exercise_id");

-- CreateIndex
CREATE UNIQUE INDEX "progression_suggestions_session_id_exercise_id_key" ON "progression_suggestions"("session_id", "exercise_id");

-- AddForeignKey
ALTER TABLE "progression_suggestions" ADD CONSTRAINT "progression_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progression_suggestions" ADD CONSTRAINT "progression_suggestions_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progression_suggestions" ADD CONSTRAINT "progression_suggestions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
