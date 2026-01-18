-- CreateTable
CREATE TABLE "measurements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "weight" DOUBLE PRECISION,
    "neck" DOUBLE PRECISION,
    "shoulders" DOUBLE PRECISION,
    "chest" DOUBLE PRECISION,
    "biceps_left" DOUBLE PRECISION,
    "biceps_right" DOUBLE PRECISION,
    "forearm_left" DOUBLE PRECISION,
    "forearm_right" DOUBLE PRECISION,
    "wrist_left" DOUBLE PRECISION,
    "wrist_right" DOUBLE PRECISION,
    "waist" DOUBLE PRECISION,
    "hips" DOUBLE PRECISION,
    "thigh_left" DOUBLE PRECISION,
    "thigh_right" DOUBLE PRECISION,
    "calf_left" DOUBLE PRECISION,
    "calf_right" DOUBLE PRECISION,
    "ankle_left" DOUBLE PRECISION,
    "ankle_right" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "measurements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "measurements_user_id_date_key" ON "measurements"("user_id", "date");

-- AddForeignKey
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
