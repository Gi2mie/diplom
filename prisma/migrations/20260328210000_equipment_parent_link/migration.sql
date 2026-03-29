-- AlterTable
ALTER TABLE "equipment" ADD COLUMN "parent_equipment_id" TEXT;

-- CreateIndex (optional FK performance)
CREATE INDEX "equipment_parent_equipment_id_idx" ON "equipment"("parent_equipment_id");

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_parent_equipment_id_fkey" FOREIGN KEY ("parent_equipment_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
