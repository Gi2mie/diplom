"use server"

import { prisma } from "@/lib/db"

export type DeleteNotificationResult = {
  success: boolean
  error?: string
}

export async function deleteNotification(id: string): Promise<DeleteNotificationResult> {
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

    // Удаление уведомления
    await prisma.notification.delete({
      where: { id },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("deleteNotification error:", error)
    return {
      success: false,
      error: "Ошибка при удалении уведомления",
    }
  }
}
