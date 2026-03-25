"use server"

import { prisma } from "@/lib/db"

export type DeleteComponentResult = {
  success: boolean
  error?: string
}

export async function deleteComponent(id: string): Promise<DeleteComponentResult> {
  try {
    // Проверка существования
    const existing = await prisma.component.findUnique({
      where: { id },
    })

    if (!existing) {
      return {
        success: false,
        error: "Компонент не найден",
      }
    }

    // Удаление компонента
    await prisma.component.delete({
      where: { id },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("deleteComponent error:", error)
    return {
      success: false,
      error: "Ошибка при удалении компонента",
    }
  }
}
