import { db } from "@/lib/db"
import type {
  CreateChangeHistoryDTO,
  PaginationParams,
  PaginatedResponse,
  ChangeHistoryWithRelations,
  ChangeHistoryFilters,
} from "@/lib/types"
import { Prisma } from "@prisma/client"

export class ChangeHistoryService {
  /**
   * Получить историю изменений с фильтрами и пагинацией
   */
  static async getAll(
    params: PaginationParams & ChangeHistoryFilters = {}
  ): Promise<PaginatedResponse<ChangeHistoryWithRelations>> {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      entityType,
      entityId,
      equipmentId,
      userId,
      action,
      dateFrom,
      dateTo,
    } = params

    const where: Prisma.ChangeHistoryWhereInput = {
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(equipmentId && { equipmentId }),
      ...(userId && { userId }),
      ...(action && { action }),
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: dateFrom }),
          ...(dateTo && { lte: dateTo }),
        },
      }),
    }

    const [data, total] = await Promise.all([
      db.changeHistory.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: true,
          equipment: true,
        },
      }),
      db.changeHistory.count({ where }),
    ])

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Получить историю конкретной сущности
   */
  static async getByEntity(
    entityType: string,
    entityId: string,
    params: PaginationParams = {}
  ) {
    return this.getAll({
      ...params,
      entityType: entityType as any,
      entityId,
    })
  }

  /**
   * Получить историю оборудования
   */
  static async getByEquipment(equipmentId: string, params: PaginationParams = {}) {
    return this.getAll({
      ...params,
      equipmentId,
    })
  }

  /**
   * Создать запись истории
   */
  static async create(data: CreateChangeHistoryDTO) {
    return db.changeHistory.create({
      data,
      include: {
        user: true,
      },
    })
  }

  /**
   * Записать создание сущности
   */
  static async logCreate(
    entityType: CreateChangeHistoryDTO["entityType"],
    entityId: string,
    userId: string,
    equipmentId?: string,
    metadata?: Record<string, unknown>
  ) {
    return this.create({
      entityType,
      entityId,
      userId,
      equipmentId,
      action: "CREATE",
      metadata,
    })
  }

  /**
   * Записать обновление сущности
   */
  static async logUpdate(
    entityType: CreateChangeHistoryDTO["entityType"],
    entityId: string,
    userId: string,
    fieldName: string,
    oldValue: string | null,
    newValue: string | null,
    equipmentId?: string
  ) {
    return this.create({
      entityType,
      entityId,
      userId,
      equipmentId,
      action: "UPDATE",
      fieldName,
      oldValue: oldValue ?? undefined,
      newValue: newValue ?? undefined,
    })
  }

  /**
   * Записать изменение статуса
   */
  static async logStatusChange(
    entityType: CreateChangeHistoryDTO["entityType"],
    entityId: string,
    userId: string,
    oldStatus: string,
    newStatus: string,
    equipmentId?: string
  ) {
    return this.create({
      entityType,
      entityId,
      userId,
      equipmentId,
      action: "STATUS_CHANGE",
      fieldName: "status",
      oldValue: oldStatus,
      newValue: newStatus,
    })
  }

  /**
   * Записать удаление сущности
   */
  static async logDelete(
    entityType: CreateChangeHistoryDTO["entityType"],
    entityId: string,
    userId: string,
    equipmentId?: string,
    metadata?: Record<string, unknown>
  ) {
    return this.create({
      entityType,
      entityId,
      userId,
      equipmentId,
      action: "DELETE",
      metadata,
    })
  }

  /**
   * Удалить старые записи истории
   */
  static async deleteOld(daysOld: number = 365) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)

    return db.changeHistory.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })
  }
}
