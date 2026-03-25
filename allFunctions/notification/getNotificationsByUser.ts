"use server"

import { prisma } from "@/lib/db"
import type { Notification, PaginatedResponse, NotificationType } from "@/lib/types"
import type { Prisma } from "@prisma/client"

export type GetNotificationsFilters = {
  page?: number
  limit?: number
  isRead?: boolean
  type?: NotificationType | NotificationType[]
}

export type GetNotificationsByUserResult = {
  success: boolean
  data?: PaginatedResponse<Notification>
  error?: string
}

export async function getNotificationsByUser(
  userId: string,
  filters?: GetNotificationsFilters
): Promise<GetNotificationsByUserResult> {
  try {
    const { page = 1, limit = 20, isRead, type } = filters || {}

    // Построение условий фильтрации
    const where: Prisma.NotificationWhereInput = {
      userId,
    }

    if (isRead !== undefined) {
      where.isRead = isRead
    }

    if (type) {
      where.type = Array.isArray(type) ? { in: type } : type
    }

    // Подсчёт общего количества
    const total = await prisma.notification.count({ where })

    // Получение данных с пагинацией
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    })

    return {
      success: true,
      data: {
        data: notifications,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    }
  } catch (error) {
    console.error("getNotificationsByUser error:", error)
    return {
      success: false,
      error: "Ошибка при получении уведомлений",
    }
  }
}
