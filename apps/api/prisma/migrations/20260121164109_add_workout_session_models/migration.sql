-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('in_progress', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "SessionExerciseStatus" AS ENUM ('pending', 'in_progress', 'completed', 'skipped', 'substituted');

-- CreateTable
CREATE TABLE "workout_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workout_id" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'in_progress',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_exercises" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "workout_item_exercise_id" TEXT,
    "exercise_id" TEXT NOT NULL,
    "status" "SessionExerciseStatus" NOT NULL DEFAULT 'pending',
    "position" INTEGER NOT NULL,
    "substituted_from_id" TEXT,
    "workout_item_id" TEXT,

    CONSTRAINT "session_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_sets" (
    "id" TEXT NOT NULL,
    "session_exercise_id" TEXT NOT NULL,
    "set_number" INTEGER NOT NULL,
    "target_reps" INTEGER NOT NULL,
    "target_weight" DOUBLE PRECISION,
    "actual_reps" INTEGER,
    "actual_weight" DOUBLE PRECISION,
    "rpe" INTEGER,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "session_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workout_sessions_user_id_status_idx" ON "workout_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "workout_sessions_workout_id_idx" ON "workout_sessions"("workout_id");

-- CreateIndex
CREATE INDEX "session_exercises_session_id_position_idx" ON "session_exercises"("session_id", "position");

-- CreateIndex
CREATE INDEX "session_sets_session_exercise_id_set_number_idx" ON "session_sets"("session_exercise_id", "set_number");

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_workout_item_exercise_id_fkey" FOREIGN KEY ("workout_item_exercise_id") REFERENCES "workout_item_exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_workout_item_id_fkey" FOREIGN KEY ("workout_item_id") REFERENCES "workout_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_sets" ADD CONSTRAINT "session_sets_session_exercise_id_fkey" FOREIGN KEY ("session_exercise_id") REFERENCES "session_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
