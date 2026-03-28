"use server"

import { prisma } from "@/lib/db"
import type { WorkstationWithRelations } from "@/lib/types"

export type GetWorkstationsByClassroomResult = {
  success: boolean
  data?: WorkstationWithRelations[]
  error?: string
}

export async function getWorkstationsByClassroom(
  classroomId: string
): Promise<GetWorkstationsByClassroomResult> {
  try {
    // Проверка существования кабинета
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    })

    if (!classroom) {
      return {
        success: false,
        error: "Кабинет не найден",
      }
    }

    const workstations = await prisma.workstation.findMany({
      where: { classroomId },
      include: {
        classroom: true,
        equipment: {
          include: {
            components: true,
          },
        },
      },
      orderBy: { code: "asc" },
    })

    return {
      success: true,
      data: workstations as WorkstationWithRelations[],
    }
  } catch (error) {
    console.error("getWorkstationsByClassroom error:", error)
    return {
      success: false,
      error: "Ошибка при получении рабочих мест",
    }
  }
}
