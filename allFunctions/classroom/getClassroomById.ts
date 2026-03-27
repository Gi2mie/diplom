"use server"

import { prisma } from "@/lib/db"
import type { ClassroomWithRelations } from "@/lib/types"

export type GetClassroomByIdResult = {
  success: boolean
  data?: ClassroomWithRelations
  error?: string
}

export async function getClassroomById(id: string): Promise<GetClassroomByIdResult> {
  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id },
      include: {
        responsible: true,
        building: true,
        classroomType: true,
        workstations: {
          include: {
            equipment: {
              include: {
                components: true,
              },
            },
          },
          orderBy: { number: "asc" },
        },
      },
    })

    if (!classroom) {
      return {
        success: false,
        error: "Кабинет не найден",
      }
    }

    return {
      success: true,
      data: classroom as ClassroomWithRelations,
    }
  } catch (error) {
    console.error("getClassroomById error:", error)
    return {
      success: false,
      error: "Ошибка при получении кабинета",
    }
  }
}
