import { db } from "@/lib/db"
import type {
  CreateCustomFieldDefinitionDTO,
  UpdateCustomFieldDefinitionDTO,
  SetCustomFieldValueDTO,
} from "@/lib/types"
import { EntityType } from "@prisma/client"

export class CustomFieldService {
  // ==========================================
  // Определения полей
  // ==========================================

  /**
   * Получить все определения полей
   */
  static async getAllDefinitions(entityType?: EntityType) {
    return db.customFieldDefinition.findMany({
      where: {
        isActive: true,
        ...(entityType && { entityType }),
      },
      orderBy: [{ entityType: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    })
  }

  /**
   * Получить определение по ID
   */
  static async getDefinitionById(id: string) {
    return db.customFieldDefinition.findUnique({
      where: { id },
    })
  }

  /**
   * Получить определение по ключу
   */
  static async getDefinitionByKey(fieldKey: string) {
    return db.customFieldDefinition.findUnique({
      where: { fieldKey },
    })
  }

  /**
   * Создать определение поля
   */
  static async createDefinition(data: CreateCustomFieldDefinitionDTO) {
    return db.customFieldDefinition.create({
      data: {
        ...data,
        options: data.options ? JSON.stringify(data.options) : null,
      },
    })
  }

  /**
   * Обновить определение поля
   */
  static async updateDefinition(id: string, data: UpdateCustomFieldDefinitionDTO) {
    return db.customFieldDefinition.update({
      where: { id },
      data: {
        ...data,
        options: data.options ? JSON.stringify(data.options) : undefined,
      },
    })
  }

  /**
   * Удалить определение поля (мягкое удаление)
   */
  static async deleteDefinition(id: string) {
    return db.customFieldDefinition.update({
      where: { id },
      data: { isActive: false },
    })
  }

  // ==========================================
  // Значения полей
  // ==========================================

  /**
   * Получить значения полей для оборудования
   */
  static async getValuesByEquipment(equipmentId: string) {
    return db.customFieldValue.findMany({
      where: { equipmentId },
      include: { definition: true },
      orderBy: { definition: { sortOrder: "asc" } },
    })
  }

  /**
   * Установить значение поля
   */
  static async setValue(data: SetCustomFieldValueDTO) {
    return db.customFieldValue.upsert({
      where: {
        definitionId_equipmentId: {
          definitionId: data.definitionId,
          equipmentId: data.equipmentId,
        },
      },
      create: data,
      update: { value: data.value },
      include: { definition: true },
    })
  }

  /**
   * Установить несколько значений полей
   */
  static async setValues(equipmentId: string, values: { definitionId: string; value: string }[]) {
    const operations = values.map((v) =>
      db.customFieldValue.upsert({
        where: {
          definitionId_equipmentId: {
            definitionId: v.definitionId,
            equipmentId,
          },
        },
        create: {
          definitionId: v.definitionId,
          equipmentId,
          value: v.value,
        },
        update: { value: v.value },
      })
    )

    return db.$transaction(operations)
  }

  /**
   * Удалить значение поля
   */
  static async deleteValue(definitionId: string, equipmentId: string) {
    return db.customFieldValue.delete({
      where: {
        definitionId_equipmentId: {
          definitionId,
          equipmentId,
        },
      },
    })
  }

  /**
   * Удалить все значения для оборудования
   */
  static async deleteValuesByEquipment(equipmentId: string) {
    return db.customFieldValue.deleteMany({
      where: { equipmentId },
    })
  }

  // ==========================================
  // Утилиты
  // ==========================================

  /**
   * Валидация значения поля по типу
   */
  static validateValue(definition: { fieldType: string; options?: unknown }, value: string): boolean {
    switch (definition.fieldType) {
      case "NUMBER":
        return !isNaN(Number(value))
      case "DATE":
        return !isNaN(Date.parse(value))
      case "BOOLEAN":
        return value === "true" || value === "false"
      case "SELECT":
        if (!definition.options) return true
        const options = typeof definition.options === "string"
          ? JSON.parse(definition.options)
          : definition.options
        return Array.isArray(options) && options.includes(value)
      case "TEXT":
      default:
        return true
    }
  }

  /**
   * Парсинг значения поля
   */
  static parseValue(fieldType: string, value: string): unknown {
    switch (fieldType) {
      case "NUMBER":
        return Number(value)
      case "DATE":
        return new Date(value)
      case "BOOLEAN":
        return value === "true"
      case "TEXT":
      case "SELECT":
      default:
        return value
    }
  }
}
