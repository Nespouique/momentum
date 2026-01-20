-- CreateTable
CREATE TABLE "workouts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_items" (
    "id" TEXT NOT NULL,
    "workout_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "rounds" INTEGER NOT NULL DEFAULT 1,
    "rest_after" INTEGER NOT NULL,

    CONSTRAINT "workout_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_item_exercises" (
    "id" TEXT NOT NULL,
    "workout_item_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "rest_between_sets" INTEGER NOT NULL,

    CONSTRAINT "workout_item_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_sets" (
    "id" TEXT NOT NULL,
    "workout_item_exercise_id" TEXT NOT NULL,
    "set_number" INTEGER NOT NULL,
    "target_reps" INTEGER NOT NULL,
    "target_weight" DOUBLE PRECISION,

    CONSTRAINT "workout_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workout_items_workout_id_position_idx" ON "workout_items"("workout_id", "position");

-- CreateIndex
CREATE INDEX "workout_item_exercises_workout_item_id_position_idx" ON "workout_item_exercises"("workout_item_id", "position");

-- CreateIndex
CREATE INDEX "workout_sets_workout_item_exercise_id_set_number_idx" ON "workout_sets"("workout_item_exercise_id", "set_number");

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_items" ADD CONSTRAINT "workout_items_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_item_exercises" ADD CONSTRAINT "workout_item_exercises_workout_item_id_fkey" FOREIGN KEY ("workout_item_id") REFERENCES "workout_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_item_exercises" ADD CONSTRAINT "workout_item_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_workout_item_exercise_id_fkey" FOREIGN KEY ("workout_item_exercise_id") REFERENCES "workout_item_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
