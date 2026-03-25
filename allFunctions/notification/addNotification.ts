"use server"

import { prisma } from "@/lib/db"
import type { Notification, NotificationType } from "@/lib/types"

export type AddNotificationInput = {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
}

export type AddNotificationResult = {
  success: boolean
  data?: Notification
  error?: string
}

export async function addNotification(
  input: AddNotificationInput
): Promise<AddNotificationResult> {
  try {
    // Проверка существования пользователя
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
    })

    if (!user) {
      return {
        success: false,
        error: "Пользователь не найден",
      }
    }

    // Создание уведомления
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
      },
    })

    return {
      success: true,
      data: notification,
    }
  } catch (error) {
    console.error("addNotification error:", error)
    return {
      success: false,
      error: "Ошибка при создании уведомления",
    }
  }
}
