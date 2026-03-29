-- Переводим старые «Неисправно» в «На обслуживании»
UPDATE "workstations" SET "status" = 'MAINTENANCE' WHERE "status" = 'FAULTY';

-- PostgreSQL: удаление значения enum через новый тип
CREATE TYPE "WorkstationStatus_new" AS ENUM ('ACTIVE', 'MAINTENANCE');

ALTER TABLE "workstations" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "workstations"
  ALTER COLUMN "status" TYPE "WorkstationStatus_new"
  USING ("status"::text::"WorkstationStatus_new");

DROP TYPE "WorkstationStatus";

ALTER TYPE "WorkstationStatus_new" RENAME TO "WorkstationStatus";

ALTER TABLE "workstations" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"WorkstationStatus";
