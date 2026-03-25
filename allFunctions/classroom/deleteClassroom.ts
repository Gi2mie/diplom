"use server"

import { prisma } from "@/lib/db"

export type DeleteClassroomResult = {
  success: boolean
  error?: string
}

export async function deleteClassroom(id: string): Promise<DeleteClassroomResult> {
  try {
    // Проверка существования
    const existing = await prisma.classroom.findUnique({
      where: { id },
      include: {
        workstations: {
          include: {
            equipment: true,
          },
        },
      },
    })

    if (!existing) {
      return {
        success: false,
        error: "Кабинет не найден",
      }
    }

    // Проверка на наличие оборудования
    const hasEquipment = existing.workstations.some((ws) => ws.equipment.length > 0)
    if (hasEquipment) {
      return {
        success: false,
        error: "Невозможно удалить кабинет с оборудованием. Сначала переместите или удалите оборудование.",
      }
    }

    // Удаление кабинета (каскадно удалит рабочие места)
    await prisma.classroom.delete({
      where: { id },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("deleteClassroom error:", error)
    return {
      success: false,
      error: "Ошибка при удалении кабинета",
    }
  }
}
