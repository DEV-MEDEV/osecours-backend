/*
  Warnings:

  - You are about to drop the column `location` on the `alerts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `alerts` DROP COLUMN `location`,
    ADD COLUMN `assigned_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `latitude` DECIMAL(10, 8) NULL,
    ADD COLUMN `longitude` DECIMAL(11, 8) NULL;

-- CreateIndex
CREATE INDEX `alerts_latitude_longitude_idx` ON `alerts`(`latitude`, `longitude`);
