"use server"

import { prisma } from "@/lib/db"

export type MarkAllNotificationsAsReadResult = {
  success: boolean
  count?: number
  error?: string
}

export async function markAllNotificationsAsRead(
  userId: string
): Promise<MarkAllNotificationsAsReadResult> {
  try {
    // Отметка всех непрочитанных как прочитанные
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return {
      success: true,
      count: result.count,
    }
  } catch (error) {
    console.error("markAllNotificationsAsRead error:", error)
    return {
      success: false,
      error: "Ошибка при обновлении уведомлений",
    }
  }
}
