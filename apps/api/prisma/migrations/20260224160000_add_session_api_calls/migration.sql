-- CreateTable
CREATE TABLE "session_api_calls" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status_code" INTEGER,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_api_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_api_calls_session_id_idx" ON "session_api_calls"("session_id");

-- AddForeignKey
ALTER TABLE "session_api_calls" ADD CONSTRAINT "session_api_calls_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
