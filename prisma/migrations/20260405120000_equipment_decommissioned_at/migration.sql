-- AlterTable
ALTER TABLE "equipment" ADD COLUMN "decommissioned_at" TIMESTAMP(3);

-- Уже списанное: приблизительно фиксируем дату списания по последнему обновлению записи
UPDATE "equipment" SET "decommissioned_at" = "updated_at" WHERE "status" = 'DECOMMISSIONED';
