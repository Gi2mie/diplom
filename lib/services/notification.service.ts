import { db } from "@/lib/db"
import type {
  CreateNotificationDTO,
  PaginationParams,
  PaginatedResponse,
  NotificationWithRelations,
  NotificationFilters,
} from "@/lib/types"
import { NotificationType, Prisma } from "@prisma/client"

export class NotificationService {
  /**
   * Получить уведомления пользователя с фильтрами и пагинацией
   */
  static async getByUser(
    userId: string,
    params: PaginationParams & NotificationFilters = {}
  ): Promise<PaginatedResponse<NotificationWithRelations>> {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      type,
      isRead,
    } = params

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(type && {
        type: Array.isArray(type) ? { in: type } : type,
      }),
      ...(isRead !== undefined && { isRead }),
    }

    const [data, total] = await Promise.all([
      db.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      db.notification.count({ where }),
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
   * Получить количество непрочитанных уведомлений
   */
  static async getUnreadCount(userId: string) {
    return db.notification.count({
      where: { userId, isRead: false },
    })
  }

  /**
   * Создать уведомление
   */
  static async create(data: CreateNotificationDTO) {
    return db.notification.create({ data })
  }

  /**
   * Создать уведомления для нескольких пользователей
   */
  static async createMany(
    userIds: string[],
    data: Omit<CreateNotificationDTO, "userId">
  ) {
    const notifications = userIds.map((userId) => ({
      ...data,
      userId,
    }))

    return db.notification.createMany({
      data: notifications,
    })
  }

  /**
   * Отметить уведомление как прочитанное
   */
  static async markAsRead(id: string) {
    return db.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })
  }

  /**
   * Отметить все уведомления пользователя как прочитанные
   */
  static async markAllAsRead(userId: string) {
    return db.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })
  }

  /**
   * Удалить уведомление
   */
  static async delete(id: string) {
    return db.notification.delete({
      where: { id },
    })
  }

  /**
   * Удалить старые прочитанные уведомления
   */
  static async deleteOldRead(daysOld: number = 30) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)

    return db.notification.deleteMany({
      where: {
        isRead: true,
        readAt: { lt: cutoffDate },
      },
    })
  }

  // ==========================================
  // Хелперы для создания типовых уведомлений
  // ==========================================

  /**
   * Уведомление о новом обращении
   */
  static async notifyIssueCreated(
    adminIds: string[],
    issueTitle: string,
    equipmentName: string,
    issueId: string
  ) {
    return this.createMany(adminIds, {
      type: NotificationType.ISSUE_CREATED,
      title: "Новое обращение о неисправности",
      message: `Создано обращение "${issueTitle}" для оборудования "${equipmentName}"`,
      link: `/issues/${issueId}`,
    })
  }

  /**
   * Уведомление о назначении ремонта
   */
  static async notifyRepairAssigned(
    userId: string,
    equipmentName: string,
    repairId: string
  ) {
    return this.create({
      userId,
      type: NotificationType.REPAIR_ASSIGNED,
      title: "Вам назначен ремонт",
      message: `Вам назначен ремонт оборудования "${equipmentName}"`,
      link: `/repairs/${repairId}`,
    })
  }

  /**
   * Уведомление о завершении ремонта
   */
  static async notifyRepairCompleted(
    userId: string,
    equipmentName: string,
    repairId: string
  ) {
    return this.create({
      userId,
      type: NotificationType.REPAIR_COMPLETED,
      title: "Ремонт завершён",
      message: `Ремонт оборудования "${equipmentName}" успешно завершён`,
      link: `/repairs/${repairId}`,
    })
  }

  /**
   * Уведомление об истекающей гарантии
   */
  static async notifyWarrantyExpiring(
    adminIds: string[],
    equipmentName: string,
    expiryDate: Date,
    equipmentId: string
  ) {
    const daysLeft = Math.ceil(
      (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    return this.createMany(adminIds, {
      type: NotificationType.WARRANTY_EXPIRING,
      title: "Истекает гарантия",
      message: `Гарантия на "${equipmentName}" истекает через ${daysLeft} дней`,
      link: `/equipment/${equipmentId}`,
    })
  }

  /**
   * Уведомление об истекающей лицензии
   */
  static async notifyLicenseExpiring(
    adminIds: string[],
    softwareName: string,
    expiryDate: Date,
    equipmentId: string
  ) {
    const daysLeft = Math.ceil(
      (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    return this.createMany(adminIds, {
      type: NotificationType.LICENSE_EXPIRING,
      title: "Истекает лицензия",
      message: `Лицензия на ПО "${softwareName}" истекает через ${daysLeft} дней`,
      link: `/equipment/${equipmentId}`,
    })
  }
}
