-- CreateEnum
CREATE TYPE "RelocationKind" AS ENUM ('EQUIPMENT', 'WORKSTATION');

-- CreateTable
CREATE TABLE "relocation_logs" (
    "id" TEXT NOT NULL,
    "kind" "RelocationKind" NOT NULL,
    "equipment_id" TEXT,
    "moved_equipment_ids" JSONB,
    "from_workstation_id" TEXT NOT NULL,
    "to_workstation_id" TEXT NOT NULL,
    "from_classroom_id" TEXT NOT NULL,
    "to_classroom_id" TEXT NOT NULL,
    "from_classroom_number" TEXT NOT NULL,
    "to_classroom_number" TEXT NOT NULL,
    "from_workstation_code" TEXT NOT NULL,
    "to_workstation_code" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "reverted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relocation_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "relocation_logs" ADD CONSTRAINT "relocation_logs_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "relocation_logs" ADD CONSTRAINT "relocation_logs_from_workstation_id_fkey" FOREIGN KEY ("from_workstation_id") REFERENCES "workstations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "relocation_logs" ADD CONSTRAINT "relocation_logs_to_workstation_id_fkey" FOREIGN KEY ("to_workstation_id") REFERENCES "workstations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "relocation_logs" ADD CONSTRAINT "relocation_logs_from_classroom_id_fkey" FOREIGN KEY ("from_classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "relocation_logs" ADD CONSTRAINT "relocation_logs_to_classroom_id_fkey" FOREIGN KEY ("to_classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "relocation_logs" ADD CONSTRAINT "relocation_logs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "relocation_logs_created_at_idx" ON "relocation_logs"("created_at");

CREATE INDEX "relocation_logs_reverted_at_idx" ON "relocation_logs"("reverted_at");
