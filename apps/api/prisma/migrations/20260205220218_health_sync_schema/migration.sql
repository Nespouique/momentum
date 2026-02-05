-- CreateEnum
CREATE TYPE "TrackingType" AS ENUM ('boolean', 'number', 'duration');

-- CreateEnum
CREATE TYPE "GoalFrequency" AS ENUM ('daily', 'weekly', 'monthly');

-- CreateTable
CREATE TABLE "trackable_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "tracking_type" "TrackingType" NOT NULL,
    "unit" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trackable_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trackable_goals" (
    "id" TEXT NOT NULL,
    "trackable_id" TEXT NOT NULL,
    "target_value" DOUBLE PRECISION NOT NULL,
    "frequency" "GoalFrequency" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trackable_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_entries" (
    "id" TEXT NOT NULL,
    "trackable_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_activities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "activity_type" TEXT NOT NULL,
    "title" TEXT,
    "duration_minutes" DOUBLE PRECISION NOT NULL,
    "calories" DOUBLE PRECISION,
    "distance" DOUBLE PRECISION,
    "heart_rate_avg" INTEGER,
    "source_app" TEXT,
    "hc_record_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_name" TEXT NOT NULL,
    "last_sync_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trackable_items_user_id_idx" ON "trackable_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_entries_trackable_id_date_key" ON "daily_entries"("trackable_id", "date");

-- CreateIndex
CREATE INDEX "health_activities_user_id_date_idx" ON "health_activities"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "health_activities_user_id_hc_record_id_key" ON "health_activities"("user_id", "hc_record_id");

-- CreateIndex
CREATE INDEX "sync_devices_user_id_idx" ON "sync_devices"("user_id");

-- AddForeignKey
ALTER TABLE "trackable_items" ADD CONSTRAINT "trackable_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trackable_goals" ADD CONSTRAINT "trackable_goals_trackable_id_fkey" FOREIGN KEY ("trackable_id") REFERENCES "trackable_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_entries" ADD CONSTRAINT "daily_entries_trackable_id_fkey" FOREIGN KEY ("trackable_id") REFERENCES "trackable_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_activities" ADD CONSTRAINT "health_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_devices" ADD CONSTRAINT "sync_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
