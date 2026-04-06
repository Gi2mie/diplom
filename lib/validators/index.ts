import { z } from "zod"
import {
  UserRole,
  EquipmentStatus,
  EquipmentType,
  ComponentType,
  IssueStatus,
  IssuePriority,
  RepairStatus,
  NotificationType,
  EntityType,
  CustomFieldType,
  ClassroomListingStatus,
} from "@prisma/client"
import { ALLOWED_CLASSROOM_TYPE_COLORS } from "@/lib/classroom-colors"

// ==========================================
// ПОЛЬЗОВАТЕЛИ
// ==========================================

export const createUserSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(8, "Пароль должен быть не менее 8 символов"),
  firstName: z.string().min(1, "Имя обязательно"),
  lastName: z.string().min(1, "Фамилия обязательна"),
  middleName: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
})

export const updateUserSchema = createUserSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export const loginSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(1, "Пароль обязателен"),
})

// ==========================================
// КАБИНЕТЫ
// ==========================================

/** Пустая строка, плейсхолдер селекта и null → null; иначе строка id из БД (Prisma cuid и др.). */
const optionalRelationId = z.preprocess((v) => {
  if (v === "" || v === "__none__" || v === null || v === undefined) return null
  return v
}, z.union([z.null(), z.string().min(1, "Некорректный идентификатор").max(128)]))

export const createClassroomSchema = z.object({
  number: z.string().min(1, "Номер кабинета обязателен"),
  name: z.string().optional().nullable(),
  buildingId: optionalRelationId,
  classroomTypeId: optionalRelationId,
  floor: z.coerce.number().int().optional().nullable(),
  capacity: z.coerce.number().int().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
  responsibleId: optionalRelationId,
  listingStatus: z.nativeEnum(ClassroomListingStatus).optional(),
})

export const updateClassroomSchema = createClassroomSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export const createBuildingSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  address: z.string().optional().default(""),
  floors: z.number().int().min(0, "Этажи не могут быть отрицательными"),
  description: z.string().optional().nullable(),
})

export const updateBuildingSchema = createBuildingSchema.partial()

const classroomTypeCodeSchema = z
  .string()
  .min(1, "Код обязателен")
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, "Код: латиница, с нижнего регистра, цифры и _")

export const createClassroomTypeSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  code: classroomTypeCodeSchema,
  color: z
    .string()
    .refine((c) => (ALLOWED_CLASSROOM_TYPE_COLORS as readonly string[]).includes(c), "Выберите цвет из списка"),
  description: z.string().optional().default(""),
})

export const updateClassroomTypeSchema = z.object({
  name: z.string().min(1).optional(),
  code: classroomTypeCodeSchema.optional(),
  color: z
    .string()
    .optional()
    .refine(
      (c) => c === undefined || (ALLOWED_CLASSROOM_TYPE_COLORS as readonly string[]).includes(c),
      "Выберите цвет из списка"
    ),
  description: z.string().optional().nullable(),
})

// ==========================================
// РАБОЧИЕ МЕСТА
// ==========================================

const workstationBaseSchema = z.object({
  code: z.string().min(1, "Номер рабочего места обязателен"),
  classroomId: z.string().cuid("Некорректный ID кабинета"),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  pcName: z.string().optional().nullable(),
  hasMonitor: z.boolean().optional(),
  hasKeyboard: z.boolean().optional(),
  hasMouse: z.boolean().optional(),
  hasHeadphones: z.boolean().optional(),
  hasOtherEquipment: z.boolean().optional(),
  otherEquipmentNote: z.string().optional().nullable(),
  lastMaintenance: z.string().optional().nullable(),
})

export const createWorkstationSchema = workstationBaseSchema.superRefine((data, ctx) => {
  if (data.hasOtherEquipment && !String(data.otherEquipmentNote ?? "").trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Укажите примечание для комплектации «Другое»",
      path: ["otherEquipmentNote"],
    })
  }
})

export const updateWorkstationSchema = workstationBaseSchema
  .partial()
  .extend({
    classroomId: z.string().cuid().optional(),
    isActive: z.boolean().optional(),
  })

// ==========================================
// ОБОРУДОВАНИЕ
// ==========================================

export const createEquipmentCategorySchema = z.object({
  name: z.string().min(1, "Название категории обязательно"),
  description: z.string().optional().nullable(),
  color: z.string().min(1).default("#64748b"),
})

export const updateEquipmentCategorySchema = createEquipmentCategorySchema.partial()

export const createEquipmentKindSchema = z.object({
  name: z.string().min(1, "Название типа обязательно"),
  description: z.string().optional().nullable(),
  mapsToEnum: z.nativeEnum(EquipmentType),
})

export const updateEquipmentKindSchema = createEquipmentKindSchema.partial()

export const createEquipmentSchema = z.object({
  inventoryNumber: z.string().min(1, "Инвентарный номер обязателен"),
  name: z.string().min(1, "Наименование обязательно"),
  // Категории из seed используют произвольные id (например seed-ecat-monitors), не только cuid
  categoryId: z.string().min(1, "Выберите категорию"),
  equipmentKindId: z.string().cuid("Выберите тип оборудования"),
  status: z.nativeEnum(EquipmentStatus).optional(),
  workstationId: z.string().cuid().optional().nullable(),
  manufacturer: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  serialNumber: z.string().trim().min(1, "Серийный номер обязателен"),
  purchaseDate: z.coerce.date().optional().nullable(),
  warrantyUntil: z.coerce.date().optional().nullable(),
  description: z.string().nullable().optional(),
})

export const updateEquipmentSchema = createEquipmentSchema
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (!Object.prototype.hasOwnProperty.call(data, "serialNumber")) return
    const raw = data.serialNumber
    const s = typeof raw === "string" ? raw.trim() : ""
    if (!s) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Серийный номер обязателен",
        path: ["serialNumber"],
      })
    }
  })

export const updateEquipmentStatusSchema = z.object({
  status: z.nativeEnum(EquipmentStatus),
})

export const createRelocationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("EQUIPMENT"),
    equipmentId: z.string().cuid(),
    toWorkstationId: z.string().cuid(),
  }),
  z.object({
    kind: z.literal("WORKSTATION"),
    fromWorkstationId: z.string().cuid(),
    toWorkstationId: z.string().cuid(),
  }),
])

// ==========================================
// КОМПОНЕНТЫ
// ==========================================

export const createComponentSchema = z.object({
  equipmentId: z.string().cuid("Некорректный ID оборудования"),
  type: z.nativeEnum(ComponentType),
  name: z.string().min(1, "Наименование обязательно"),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  specifications: z.record(z.unknown()).optional(),
  description: z.string().optional(),
})

export const updateComponentSchema = createComponentSchema
  .omit({ equipmentId: true })
  .partial()

// ==========================================
// ПРОГРАММНОЕ ОБЕСПЕЧЕНИЕ
// ==========================================

export const createSoftwareSchema = z.object({
  name: z.string().min(1, "Название ПО обязательно"),
  version: z.preprocess((v) => (v === null ? "" : v), z.string().optional().default("")),
  vendor: z.string().optional().nullable(),
  category: z.enum([
    "OFFICE",
    "DEVELOPMENT",
    "GRAPHICS",
    "UTILITIES",
    "SECURITY",
    "OTHER",
  ]),
  licenseKind: z.enum(["FREE", "PAID", "EDUCATIONAL"]),
  licenseType: z.string().optional().nullable(),
  defaultLicenseKey: z.string().optional().nullable(),
  // null / "" не прогоняем через coerce.date — иначе new Date(null) → 1970-01-01
  licenseExpiresAt: z.preprocess(
    (v) => {
      if (v === undefined) return undefined
      if (v === null || v === "") return null
      return v
    },
    z.union([z.null(), z.coerce.date()]).optional()
  ),
  description: z.string().optional().nullable(),
})

export const updateSoftwareSchema = createSoftwareSchema.partial()

export const assignSoftwareWorkstationsSchema = z.object({
  workstationIds: z.array(z.string().cuid()).min(1, "Выберите хотя бы одно рабочее место"),
})

export const createInstalledSoftwareSchema = z.object({
  equipmentId: z.string().cuid("Некорректный ID оборудования"),
  softwareId: z.string().cuid("Некорректный ID ПО"),
  version: z.string().optional(),
  licenseKey: z.string().optional(),
  installedAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  notes: z.string().optional(),
})

export const updateInstalledSoftwareSchema = createInstalledSoftwareSchema
  .omit({ equipmentId: true, softwareId: true })
  .partial()

// ==========================================
// ОБРАЩЕНИЯ
// ==========================================

export const createIssueReportSchema = z.object({
  equipmentId: z.string().cuid("Некорректный ID оборудования"),
  title: z.string().min(1, "Заголовок обязателен"),
  description: z.string().min(1, "Описание обязательно"),
  priority: z.nativeEnum(IssuePriority).optional(),
})

/** Заявка преподавателя: аудитория + одно РМ или весь кабинет (несколько записей в БД по ПК). */
export const teacherProblemEquipmentKindSchema = z.enum([
  "monitor",
  "keyboard",
  "mouse",
  "system_unit",
  "printer",
  "projector",
  "network",
  "software",
  "other",
])

export const createTeacherIssueReportSchema = z
  .object({
    title: z.string().min(1, "Краткое описание обязательно"),
    description: z.string().optional().default(""),
    priority: z.nativeEnum(IssuePriority),
    classroomId: z.string().cuid("Некорректный ID аудитории"),
    workstationId: z.string().cuid().optional().nullable(),
    wholeClassroom: z.boolean(),
    problemEquipmentKind: teacherProblemEquipmentKindSchema.default("other"),
  })
  .refine((d) => d.wholeClassroom || Boolean(d.workstationId), {
    message: "Выберите рабочее место или отметьте «Все рабочие места»",
    path: ["workstationId"],
  })

export type TeacherProblemEquipmentKind = z.infer<typeof teacherProblemEquipmentKindSchema>

export const createSoftwareRequestSchema = z
  .object({
    kind: z.enum(["INSTALL", "UPDATE", "UNINSTALL"]),
    softwareName: z.string().min(1, "Укажите название ПО"),
    softwareVersion: z.string().optional().default(""),
    description: z.string().optional().default(""),
    classroomId: z.string().cuid("Некорректный ID аудитории"),
    workstationId: z.string().cuid().optional().nullable(),
    wholeClassroom: z.boolean(),
    priority: z.nativeEnum(IssuePriority),
  })
  .refine((d) => d.wholeClassroom || Boolean(d.workstationId), {
    message: "Выберите рабочее место или отметьте «Вся аудитория»",
    path: ["workstationId"],
  })

export const updateSoftwareRequestSchema = z
  .object({
    status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"]).optional(),
    adminComment: z.string().optional().nullable(),
    priority: z.nativeEnum(IssuePriority).optional(),
  })
  .refine(
    (d) =>
      d.status !== undefined ||
      d.adminComment !== undefined ||
      d.priority !== undefined,
    {
      message: "Укажите статус, комментарий или важность (приоритет)",
    }
  )

export const updateIssueReportSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  status: z.nativeEnum(IssueStatus).optional(),
  priority: z.nativeEnum(IssuePriority).optional(),
  resolution: z.string().optional(),
})

/** Создание обращения администратором (произвольное оборудование). */
export const adminCreateIssueReportSchema = z.object({
  equipmentId: z.string().cuid("Некорректный ID оборудования"),
  reporterId: z.string().cuid("Выберите заявителя"),
  title: z.string().min(1, "Заголовок обязателен"),
  description: z.string().optional().default(""),
  priority: z.nativeEnum(IssuePriority).optional(),
})

export const adminUpdateIssueReportSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.nativeEnum(IssueStatus).optional(),
    priority: z.nativeEnum(IssuePriority).optional(),
    resolution: z.string().optional().nullable(),
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.description !== undefined ||
      d.status !== undefined ||
      d.priority !== undefined ||
      d.resolution !== undefined,
    { message: "Укажите хотя бы одно поле для изменения" }
  )

/** Постановка на ремонт по обращению: одна или несколько единиц в той же аудитории, что и оборудование в обращении. */
export const batchRepairsFromIssueSchema = z.object({
  classroomId: z.string().cuid("Некорректный ID аудитории"),
  equipmentIds: z
    .array(z.string().cuid())
    .min(1, "Выберите хотя бы одну единицу оборудования"),
})

// ==========================================
// РЕМОНТЫ
// ==========================================

export const createRepairSchema = z.object({
  equipmentId: z.string().cuid("Некорректный ID оборудования"),
  issueReportId: z.string().cuid().optional(),
  assignedToId: z.string().cuid().optional(),
  description: z.string().min(1, "Описание обязательно"),
  diagnosis: z.string().optional(),
})

export const updateRepairSchema = z.object({
  status: z.nativeEnum(RepairStatus).optional(),
  description: z.string().optional(),
  diagnosis: z.string().optional(),
  workPerformed: z.string().optional(),
  partsUsed: z.string().optional(),
  cost: z.number().positive().optional(),
  assignedToId: z.string().cuid().optional().nullable(),
})

/** Смена статуса ремонта (админ, одно поле). */
export const patchRepairStatusSchema = z.object({
  status: z.nativeEnum(RepairStatus),
})

export const completeRepairSchema = z.object({
  workPerformed: z.string().min(1, "Описание выполненных работ обязательно"),
  partsUsed: z.string().optional(),
  cost: z.number().positive().optional(),
})

// ==========================================
// ПОЛЬЗОВАТЕЛЬСКИЕ ПОЛЯ
// ==========================================

export const createCustomFieldDefinitionSchema = z.object({
  name: z.string().min(1, "Название поля обязательно"),
  fieldKey: z
    .string()
    .min(1)
    .regex(/^[a-z_][a-z0-9_]*$/, "Ключ должен содержать только латинские буквы, цифры и подчёркивания"),
  fieldType: z.nativeEnum(CustomFieldType),
  entityType: z.nativeEnum(EntityType),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().optional(),
  defaultValue: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
})

export const updateCustomFieldDefinitionSchema = createCustomFieldDefinitionSchema
  .omit({ fieldKey: true, entityType: true })
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  })

export const setCustomFieldValueSchema = z.object({
  definitionId: z.string().cuid("Некорректный ID определения"),
  value: z.string(),
})

// ==========================================
// ПАГИНАЦИЯ И ФИЛЬТРЫ
// ==========================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
})

export const equipmentFiltersSchema = paginationSchema.extend({
  status: z.union([z.nativeEnum(EquipmentStatus), z.array(z.nativeEnum(EquipmentStatus))]).optional(),
  type: z.union([z.nativeEnum(EquipmentType), z.array(z.nativeEnum(EquipmentType))]).optional(),
  categoryId: z.string().cuid().optional(),
  equipmentKindId: z.string().cuid().optional(),
  buildingId: z.string().cuid().optional(),
  workstationId: z.string().cuid().optional(),
  classroomId: z.string().cuid().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

export const issueReportFiltersSchema = paginationSchema.extend({
  status: z.union([z.nativeEnum(IssueStatus), z.array(z.nativeEnum(IssueStatus))]).optional(),
  priority: z.union([z.nativeEnum(IssuePriority), z.array(z.nativeEnum(IssuePriority))]).optional(),
  equipmentId: z.string().cuid().optional(),
  reporterId: z.string().cuid().optional(),
  search: z.string().optional(),
})

export const repairFiltersSchema = paginationSchema.extend({
  status: z.union([z.nativeEnum(RepairStatus), z.array(z.nativeEnum(RepairStatus))]).optional(),
  equipmentId: z.string().cuid().optional(),
  assignedToId: z.string().cuid().optional(),
  createdById: z.string().cuid().optional(),
})

export const changeHistoryFiltersSchema = paginationSchema.extend({
  entityType: z.nativeEnum(EntityType).optional(),
  entityId: z.string().optional(),
  equipmentId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

// ==========================================
// ID ПАРАМЕТР
// ==========================================

export const idParamSchema = z.object({
  id: z.string().cuid("Некорректный ID"),
})

// ==========================================
// ТИПЫ
// ==========================================

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateClassroomInput = z.infer<typeof createClassroomSchema>
export type UpdateClassroomInput = z.infer<typeof updateClassroomSchema>
export type CreateBuildingInput = z.infer<typeof createBuildingSchema>
export type UpdateBuildingInput = z.infer<typeof updateBuildingSchema>
export type CreateClassroomTypeInput = z.infer<typeof createClassroomTypeSchema>
export type UpdateClassroomTypeInput = z.infer<typeof updateClassroomTypeSchema>
export type CreateWorkstationInput = z.infer<typeof createWorkstationSchema>
export type UpdateWorkstationInput = z.infer<typeof updateWorkstationSchema>
export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>
export type CreateRelocationInput = z.infer<typeof createRelocationSchema>
export type CreateComponentInput = z.infer<typeof createComponentSchema>
export type UpdateComponentInput = z.infer<typeof updateComponentSchema>
export type CreateSoftwareInput = z.infer<typeof createSoftwareSchema>
export type UpdateSoftwareInput = z.infer<typeof updateSoftwareSchema>
export type CreateInstalledSoftwareInput = z.infer<typeof createInstalledSoftwareSchema>
export type UpdateInstalledSoftwareInput = z.infer<typeof updateInstalledSoftwareSchema>
export type CreateIssueReportInput = z.infer<typeof createIssueReportSchema>
export type UpdateIssueReportInput = z.infer<typeof updateIssueReportSchema>
export type CreateRepairInput = z.infer<typeof createRepairSchema>
export type UpdateRepairInput = z.infer<typeof updateRepairSchema>
export type CompleteRepairInput = z.infer<typeof completeRepairSchema>
export type CreateCustomFieldDefinitionInput = z.infer<typeof createCustomFieldDefinitionSchema>
export type UpdateCustomFieldDefinitionInput = z.infer<typeof updateCustomFieldDefinitionSchema>
export type SetCustomFieldValueInput = z.infer<typeof setCustomFieldValueSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type EquipmentFiltersInput = z.infer<typeof equipmentFiltersSchema>
export type IssueReportFiltersInput = z.infer<typeof issueReportFiltersSchema>
export type RepairFiltersInput = z.infer<typeof repairFiltersSchema>
export type ChangeHistoryFiltersInput = z.infer<typeof changeHistoryFiltersSchema>
