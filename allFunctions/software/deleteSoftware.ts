"use server"

import { prisma } from "@/lib/db"

export type DeleteSoftwareResult = {
  success: boolean
  error?: string
}

export async function deleteSoftware(id: string): Promise<DeleteSoftwareResult> {
  try {
    // Проверка существования
    const existing = await prisma.software.findUnique({
      where: { id },
      include: {
        installations: true,
      },
    })

    if (!existing) {
      return {
        success: false,
        error: "ПО не найдено",
      }
    }

    // Проверка на установки
    if (existing.installations.length > 0) {
      return {
        success: false,
        error: "Невозможно удалить ПО, установленное на оборудовании",
      }
    }

    // Удаление ПО
    await prisma.software.delete({
      where: { id },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("deleteSoftware error:", error)
    return {
      success: false,
      error: "Ошибка при удалении ПО",
    }
  }
}
