-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TEACHER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ClassroomListingStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "WorkstationStatus" AS ENUM ('ACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('OPERATIONAL', 'NEEDS_CHECK', 'IN_REPAIR', 'DECOMMISSIONED', 'NOT_IN_USE');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('COMPUTER', 'MONITOR', 'PRINTER', 'PROJECTOR', 'INTERACTIVE_BOARD', 'SCANNER', 'NETWORK_DEVICE', 'PERIPHERAL', 'OTHER');

-- CreateEnum
CREATE TYPE "RelocationKind" AS ENUM ('EQUIPMENT', 'WORKSTATION');

-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('CPU', 'RAM', 'HDD', 'SSD', 'GPU', 'MOTHERBOARD', 'PSU', 'CASE', 'COOLING', 'NETWORK_CARD', 'SOUND_CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "SoftwareCatalogCategory" AS ENUM ('OFFICE', 'DEVELOPMENT', 'GRAPHICS', 'UTILITIES', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "SoftwareLicenseKind" AS ENUM ('FREE', 'PAID', 'EDUCATIONAL');

-- CreateEnum
CREATE TYPE "SoftwareRequestKind" AS ENUM ('INSTALL', 'UPDATE', 'UNINSTALL');

-- CreateEnum
CREATE TYPE "SoftwareRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "IssuePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ISSUE_CREATED', 'ISSUE_UPDATED', 'ISSUE_RESOLVED', 'REPAIR_ASSIGNED', 'REPAIR_COMPLETED', 'WARRANTY_EXPIRING', 'LICENSE_EXPIRING', 'EQUIPMENT_STATUS', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('EQUIPMENT', 'WORKSTATION', 'CLASSROOM', 'COMPONENT', 'SOFTWARE', 'ISSUE_REPORT', 'REPAIR', 'USER');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "department" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'TEACHER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "floors_count" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classroom_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "classroom_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classrooms" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT,
    "building_id" TEXT,
    "floor" INTEGER,
    "capacity" INTEGER,
    "description" TEXT,
    "listing_status" "ClassroomListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "classroom_type_id" TEXT,
    "responsible_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workstations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "classroom_id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "pc_name" TEXT,
    "status" "WorkstationStatus" NOT NULL DEFAULT 'ACTIVE',
    "has_monitor" BOOLEAN NOT NULL DEFAULT false,
    "has_keyboard" BOOLEAN NOT NULL DEFAULT false,
    "has_mouse" BOOLEAN NOT NULL DEFAULT false,
    "has_headphones" BOOLEAN NOT NULL DEFAULT false,
    "has_other_equipment" BOOLEAN NOT NULL DEFAULT false,
    "other_equipment_note" TEXT,
    "last_maintenance" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workstations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#64748b',

    CONSTRAINT "equipment_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_kinds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maps_to_enum" "EquipmentType" NOT NULL DEFAULT 'OTHER',
    "code" TEXT,

    CONSTRAINT "equipment_kinds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "inventory_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EquipmentType" NOT NULL,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "category_id" TEXT,
    "equipment_kind_id" TEXT,
    "workstation_id" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "purchase_date" TIMESTAMP(3),
    "warranty_until" TIMESTAMP(3),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "decommissioned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "components" (
    "id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "type" "ComponentType" NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "specifications" JSONB,
    "description" TEXT,

    CONSTRAINT "components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '',
    "vendor" TEXT,
    "catalog_category" "SoftwareCatalogCategory" NOT NULL DEFAULT 'OTHER',
    "license_kind" "SoftwareLicenseKind" NOT NULL DEFAULT 'FREE',
    "default_license_key" TEXT,
    "license_expires_at" TIMESTAMP(3),
    "license_type" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "software_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installed_software" (
    "id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "version" TEXT,
    "license_key" TEXT,
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "installed_software_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software_requests" (
    "id" TEXT NOT NULL,
    "kind" "SoftwareRequestKind" NOT NULL,
    "software_name" TEXT NOT NULL,
    "software_version" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "classroom_id" TEXT NOT NULL,
    "workstation_id" TEXT,
    "whole_classroom" BOOLEAN NOT NULL DEFAULT false,
    "priority" "IssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "SoftwareRequestStatus" NOT NULL DEFAULT 'PENDING',
    "admin_comment" TEXT,
    "requester_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "software_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_reports" (
    "id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'NEW',
    "priority" "IssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issue_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repairs" (
    "id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "issue_report_id" TEXT,
    "assigned_to_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "status" "RepairStatus" NOT NULL DEFAULT 'PLANNED',
    "description" TEXT NOT NULL,
    "diagnosis" TEXT,
    "work_performed" TEXT,
    "parts_used" TEXT,
    "cost" DECIMAL(10,2),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_history" (
    "id" TEXT NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "equipment_id" TEXT,
    "user_id" TEXT NOT NULL,
    "action" "ActionType" NOT NULL,
    "field_name" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "field_key" TEXT NOT NULL,
    "field_type" "CustomFieldType" NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "options" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "default_value" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_values" (
    "id" TEXT NOT NULL,
    "definition_id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "classroom_types_code_key" ON "classroom_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_number_key" ON "classrooms"("number");

-- CreateIndex
CREATE UNIQUE INDEX "workstations_classroom_id_code_key" ON "workstations"("classroom_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_kinds_code_key" ON "equipment_kinds"("code");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_inventory_number_key" ON "equipment"("inventory_number");

-- CreateIndex
CREATE INDEX "relocation_logs_created_at_idx" ON "relocation_logs"("created_at");

-- CreateIndex
CREATE INDEX "relocation_logs_reverted_at_idx" ON "relocation_logs"("reverted_at");

-- CreateIndex
CREATE UNIQUE INDEX "software_name_version_key" ON "software"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "installed_software_equipment_id_software_id_key" ON "installed_software"("equipment_id", "software_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "change_history_entity_type_entity_id_idx" ON "change_history"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "change_history_equipment_id_idx" ON "change_history"("equipment_id");

-- CreateIndex
CREATE INDEX "change_history_created_at_idx" ON "change_history"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_definitions_field_key_key" ON "custom_field_definitions"("field_key");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_definition_id_equipment_id_key" ON "custom_field_values"("definition_id", "equipment_id");

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_classroom_type_id_fkey" FOREIGN KEY ("classroom_type_id") REFERENCES "classroom_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workstations" ADD CONSTRAINT "workstations_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "equipment_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_equipment_kind_id_fkey" FOREIGN KEY ("equipment_kind_id") REFERENCES "equipment_kinds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_workstation_id_fkey" FOREIGN KEY ("workstation_id") REFERENCES "workstations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relocation_logs" ADD CONSTRAINT "relocation_logs_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relocation_logs" ADD CONSTRAINT "relocation_logs_from_workstation_id_fkey" FOREIGN KEY ("from_workstation_id") REFERENCES "workstations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relocation_logs" ADD CONSTRAINT "relocation_logs_to_workstation_id_fkey" FOREIGN KEY ("to_workstation_id") REFERENCES "workstations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relocation_logs" ADD CONSTRAINT "relocation_logs_from_classroom_id_fkey" FOREIGN KEY ("from_classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relocation_logs" ADD CONSTRAINT "relocation_logs_to_classroom_id_fkey" FOREIGN KEY ("to_classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relocation_logs" ADD CONSTRAINT "relocation_logs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "components" ADD CONSTRAINT "components_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installed_software" ADD CONSTRAINT "installed_software_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installed_software" ADD CONSTRAINT "installed_software_software_id_fkey" FOREIGN KEY ("software_id") REFERENCES "software"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_requests" ADD CONSTRAINT "software_requests_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_requests" ADD CONSTRAINT "software_requests_workstation_id_fkey" FOREIGN KEY ("workstation_id") REFERENCES "workstations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_requests" ADD CONSTRAINT "software_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_reports" ADD CONSTRAINT "issue_reports_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_reports" ADD CONSTRAINT "issue_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_issue_report_id_fkey" FOREIGN KEY ("issue_report_id") REFERENCES "issue_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_history" ADD CONSTRAINT "change_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_history" ADD CONSTRAINT "change_history_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "custom_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

