import type {
  User,
  Classroom,
  Building,
  ClassroomType,
  Workstation,
  Equipment,
  Component,
  Software,
  InstalledSoftware,
  IssueReport,
  Repair,
  Notification,
  ChangeHistory,
  CustomFieldDefinition,
  CustomFieldValue,
  UserRole,
  EquipmentStatus,
  EquipmentType,
  ComponentType,
  IssueStatus,
  IssuePriority,
  RepairStatus,
  NotificationType,
  EntityType,
  ActionType,
  CustomFieldType,
} from "@prisma/client"

// Re-export all Prisma types
export type {
  User,
  Classroom,
  Building,
  ClassroomType,
  Workstation,
  Equipment,
  Component,
  Software,
  InstalledSoftware,
  IssueReport,
  Repair,
  Notification,
  ChangeHistory,
  CustomFieldDefinition,
  CustomFieldValue,
}

// Re-export all enums
export {
  UserRole,
  EquipmentStatus,
  EquipmentType,
  ComponentType,
  IssueStatus,
  IssuePriority,
  RepairStatus,
  NotificationType,
  EntityType,
  ActionType,
  CustomFieldType,
  WorkstationStatus,
} from "@prisma/client"

// ==========================================
// РАСШИРЕННЫЕ ТИПЫ С СВЯЗЯМИ
// ==========================================

export type UserWithRelations = User & {
  responsibleRooms?: Classroom[]
  issueReports?: IssueReport[]
  notifications?: Notification[]
}

export type ClassroomWithRelations = Classroom & {
  responsible?: User | null
  building?: Building | null
  classroomType?: ClassroomType | null
  workstations?: WorkstationWithRelations[]
}

export type WorkstationWithRelations = Workstation & {
  classroom?: Classroom
  equipment?: EquipmentWithRelations[]
}

export type EquipmentWithRelations = Equipment & {
  category?: import("@prisma/client").EquipmentCategory | null
  equipmentKind?: import("@prisma/client").EquipmentKind | null
  workstation?: WorkstationWithRelations | null
  components?: Component[]
  software?: InstalledSoftwareWithRelations[]
  issueReports?: IssueReport[]
  repairs?: Repair[]
  customFields?: CustomFieldValueWithDefinition[]
}

export type InstalledSoftwareWithRelations = InstalledSoftware & {
  software?: Software
  equipment?: Equipment
}

export type IssueReportWithRelations = IssueReport & {
  equipment?: EquipmentWithRelations
  reporter?: User
  repairs?: Repair[]
}

export type RepairWithRelations = Repair & {
  equipment?: Equipment
  issueReport?: IssueReport | null
  assignedTo?: User | null
  createdBy?: User
}

export type NotificationWithRelations = Notification & {
  user?: User
}

export type ChangeHistoryWithRelations = ChangeHistory & {
  user?: User
  equipment?: Equipment | null
}

export type CustomFieldValueWithDefinition = CustomFieldValue & {
  definition?: CustomFieldDefinition
}

// ==========================================
// DTO ТИПЫ ДЛЯ API
// ==========================================

export type CreateUserDTO = {
  email: string
  password: string
  firstName: string
  lastName: string
  middleName?: string
  role?: UserRole
}

export type UpdateUserDTO = Partial<Omit<CreateUserDTO, "password">> & {
  password?: string
  isActive?: boolean
}

export type CreateClassroomDTO = {
  number: string
  name?: string | null
  buildingId?: string | null
  classroomTypeId?: string | null
  floor?: number | null
  capacity?: number | null
  description?: string | null
  responsibleId?: string | null
  listingStatus?: import("@prisma/client").ClassroomListingStatus
}

export type UpdateClassroomDTO = Partial<CreateClassroomDTO> & {
  isActive?: boolean
}

export type CreateWorkstationDTO = {
  code: string
  classroomId: string
  name?: string | null
  description?: string | null
  pcName?: string | null
  status?: import("@prisma/client").WorkstationStatus
  hasMonitor?: boolean
  hasKeyboard?: boolean
  hasMouse?: boolean
  hasHeadphones?: boolean
  hasOtherEquipment?: boolean
  otherEquipmentNote?: string | null
  lastMaintenance?: Date | null
}

export type UpdateWorkstationDTO = Partial<CreateWorkstationDTO> & {
  classroomId?: string
  isActive?: boolean
}

export type CreateEquipmentDTO = {
  inventoryNumber: string
  name: string
  categoryId: string
  equipmentKindId: string
  status?: EquipmentStatus
  workstationId?: string | null
  manufacturer?: string
  model?: string
  serialNumber?: string
  purchaseDate?: Date
  warrantyUntil?: Date
  description?: string
}

export type UpdateEquipmentDTO = Partial<CreateEquipmentDTO> & {
  isActive?: boolean
}

export type CreateComponentDTO = {
  equipmentId: string
  type: ComponentType
  name: string
  manufacturer?: string
  model?: string
  serialNumber?: string
  specifications?: Record<string, unknown>
  description?: string
}

export type UpdateComponentDTO = Partial<Omit<CreateComponentDTO, "equipmentId">>

export type CreateSoftwareDTO = {
  name: string
  version?: string
  vendor?: string
  category?: import("@prisma/client").SoftwareCatalogCategory
  licenseKind?: import("@prisma/client").SoftwareLicenseKind
  defaultLicenseKey?: string | null
  licenseExpiresAt?: Date | null
  licenseType?: string
  description?: string
}

export type UpdateSoftwareDTO = Partial<CreateSoftwareDTO>

export type CreateInstalledSoftwareDTO = {
  equipmentId: string
  softwareId: string
  version?: string
  licenseKey?: string
  installedAt?: Date
  expiresAt?: Date
  notes?: string
}

export type UpdateInstalledSoftwareDTO = Partial<Omit<CreateInstalledSoftwareDTO, "equipmentId" | "softwareId">>

export type CreateIssueReportDTO = {
  equipmentId: string
  reporterId: string
  title: string
  description: string
  priority?: IssuePriority
}

export type UpdateIssueReportDTO = {
  title?: string
  description?: string
  status?: IssueStatus
  priority?: IssuePriority
  resolution?: string
}

export type CreateRepairDTO = {
  equipmentId: string
  issueReportId?: string
  assignedToId?: string
  createdById: string
  description: string
  diagnosis?: string
}

export type UpdateRepairDTO = {
  status?: RepairStatus
  description?: string
  diagnosis?: string
  workPerformed?: string
  partsUsed?: string
  cost?: number
  assignedToId?: string
}

export type CreateNotificationDTO = {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
}

export type CreateChangeHistoryDTO = {
  entityType: EntityType
  entityId: string
  equipmentId?: string
  userId: string
  action: ActionType
  fieldName?: string
  oldValue?: string
  newValue?: string
  metadata?: Record<string, unknown>
}

export type CreateCustomFieldDefinitionDTO = {
  name: string
  fieldKey: string
  fieldType: CustomFieldType
  entityType: EntityType
  options?: string[]
  isRequired?: boolean
  defaultValue?: string
  description?: string
  sortOrder?: number
}

export type UpdateCustomFieldDefinitionDTO = Partial<Omit<CreateCustomFieldDefinitionDTO, "fieldKey" | "entityType">> & {
  isActive?: boolean
}

export type SetCustomFieldValueDTO = {
  definitionId: string
  equipmentId: string
  value: string
}

// ==========================================
// ФИЛЬТРЫ И ПАГИНАЦИЯ
// ==========================================

export type PaginationParams = {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export type PaginatedResponse<T> = {
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export type EquipmentFilters = {
  status?: EquipmentStatus | EquipmentStatus[]
  type?: EquipmentType | EquipmentType[]
  workstationId?: string
  classroomId?: string
  search?: string
  isActive?: boolean
}

export type IssueReportFilters = {
  status?: IssueStatus | IssueStatus[]
  priority?: IssuePriority | IssuePriority[]
  equipmentId?: string
  reporterId?: string
  search?: string
}

export type RepairFilters = {
  status?: RepairStatus | RepairStatus[]
  equipmentId?: string
  assignedToId?: string
  createdById?: string
}

export type NotificationFilters = {
  type?: NotificationType | NotificationType[]
  isRead?: boolean
}

export type ChangeHistoryFilters = {
  entityType?: EntityType
  entityId?: string
  equipmentId?: string
  userId?: string
  action?: ActionType
  dateFrom?: Date
  dateTo?: Date
}
