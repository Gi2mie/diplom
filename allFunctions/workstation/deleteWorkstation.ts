"use server"

import { prisma } from "@/lib/db"
import { isClassroomPoolWorkstation } from "@/lib/classroom-pool-workstation"

export type DeleteWorkstationResult = {
  success: boolean
  error?: string
}

export async function deleteWorkstation(id: string): Promise<DeleteWorkstationResult> {
  try {
    // Проверка существования
    const existing = await prisma.workstation.findUnique({
      where: { id },
      include: {
        equipment: true,
        classroom: { select: { number: true } },
      },
    })

    if (!existing) {
      return {
        success: false,
        error: "Рабочее место не найдено",
      }
    }

    if (isClassroomPoolWorkstation(existing.code, existing.classroom.number)) {
      return {
        success: false,
        error:
          "Служебное рабочее место кабинета (KAB-…) нельзя удалить. Удалите аудиторию, если она больше не нужна.",
      }
    }

    // Проверка на наличие оборудования
    if (existing.equipment.length > 0) {
      return {
        success: false,
        error: "Невозможно удалить рабочее место с оборудованием. Сначала переместите или удалите оборудование.",
      }
    }

    // Удаление рабочего места
    await prisma.workstation.delete({
      where: { id },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("deleteWorkstation error:", error)
    return {
      success: false,
      error: "Ошибка при удалении рабочего места",
    }
  }
}
