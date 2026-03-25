"use server"

import { prisma } from "@/lib/db"

export type DeleteRepairResult = {
  success: boolean
  error?: string
}

export async function deleteRepair(id: string): Promise<DeleteRepairResult> {
  try {
    // Проверка существования
    const existing = await prisma.repair.findUnique({
      where: { id },
    })

    if (!existing) {
      return {
        success: false,
        error: "Ремонт не найден",
      }
    }

    // Нельзя удалить активный ремонт
    if (existing.status === "IN_PROGRESS") {
      return {
        success: false,
        error: "Невозможно удалить ремонт в процессе выполнения",
      }
    }

    // Удаление ремонта
    await prisma.repair.delete({
      where: { id },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("deleteRepair error:", error)
    return {
      success: false,
      error: "Ошибка при удалении ремонта",
    }
  }
}
