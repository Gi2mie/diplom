"use server"

import { prisma } from "@/lib/db"

export type GetUnreadNotificationsCountResult = {
  success: boolean
  count?: number
  error?: string
}

export async function getUnreadNotificationsCount(
  userId: string
): Promise<GetUnreadNotificationsCountResult> {
  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    })

    return {
      success: true,
      count,
    }
  } catch (error) {
    console.error("getUnreadNotificationsCount error:", error)
    return {
      success: false,
      error: "Ошибка при подсчёте уведомлений",
    }
  }
}
