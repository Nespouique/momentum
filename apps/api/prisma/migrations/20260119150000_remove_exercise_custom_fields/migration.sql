-- AlterTable - Remove custom exercise columns
ALTER TABLE "exercises" DROP COLUMN "is_custom";
ALTER TABLE "exercises" DROP COLUMN "user_id";
