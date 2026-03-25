"use server"

import { prisma } from "@/lib/db"

export type DeleteUserResult = {
  success: boolean
  error?: string
}

export async function deleteUser(id: string): Promise<DeleteUserResult> {
  try {
    // Проверка существования
    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        issueReports: { where: { status: { in: ["NEW", "IN_PROGRESS"] } } },
        assignedRepairs: { where: { status: { in: ["PLANNED", "IN_PROGRESS"] } } },
      },
    })

    if (!existing) {
      return {
        success: false,
        error: "Пользователь не найден",
      }
    }

    // Проверка на активные обращения
    if (existing.issueReports.length > 0) {
      return {
        success: false,
        error: "Невозможно удалить пользователя с активными обращениями",
      }
    }

    // Проверка на активные ремонты
    if (existing.assignedRepairs.length > 0) {
      return {
        success: false,
        error: "Невозможно удалить пользователя с назначенными ремонтами",
      }
    }

    // Удаление пользователя
    await prisma.user.delete({
      where: { id },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("deleteUser error:", error)
    return {
      success: false,
      error: "Ошибка при удалении пользователя",
    }
  }
}
