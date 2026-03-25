"use server"

import { prisma } from "@/lib/db"
import type { Notification } from "@/lib/types"

export type MarkNotificationAsReadResult = {
  success: boolean
  data?: Notification
  error?: string
}

export async function markNotificationAsRead(
  id: string
): Promise<MarkNotificationAsReadResult> {
  try {
    // Проверка существования
    const existing = await prisma.notification.findUnique({
      where: { id },
    })

    if (!existing) {
      return {
        success: false,
        error: "Уведомление не найдено",
      }
    }

    if (existing.isRead) {
      return {
        success: true,
        data: existing,
      }
    }

    // Отметка как прочитанное
    const notification = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return {
      success: true,
      data: notification,
    }
  } catch (error) {
    console.error("markNotificationAsRead error:", error)
    return {
      success: false,
      error: "Ошибка при обновлении уведомления",
    }
  }
}
