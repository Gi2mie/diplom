-- Однократно: для уже списанных единиц без даты — берём updated_at как приближение даты списания
UPDATE "equipment"
SET "decommissioned_at" = "updated_at"
WHERE "status" = 'DECOMMISSIONED' AND "decommissioned_at" IS NULL;
