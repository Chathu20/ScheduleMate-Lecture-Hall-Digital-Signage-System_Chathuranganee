-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "email" TEXT,
ADD COLUMN     "reset_token_hash" TEXT,
ADD COLUMN     "reset_token_expires" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "recurrence_group_id" TEXT;

-- CreateTable
CREATE TABLE "SignageSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "side_duration_seconds" INTEGER NOT NULL DEFAULT 8,
    "poll_interval_seconds" INTEGER NOT NULL DEFAULT 30,
    "upcoming_soon_threshold_min" INTEGER NOT NULL DEFAULT 15,
    "max_upcoming_per_slide" INTEGER NOT NULL DEFAULT 5,
    "institution_name" TEXT NOT NULL DEFAULT 'Sparkline Academy',

    CONSTRAINT "SignageSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
