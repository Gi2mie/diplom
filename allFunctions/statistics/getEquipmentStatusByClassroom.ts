"use server"

import { prisma } from "@/lib/db"
import type { EquipmentStatus } from "@/lib/types"

export type ClassroomEquipmentStats = {
  classroomId: string
  classroomNumber: string
  classroomName: string | null
  total: number
  byStatus: Record<EquipmentStatus, number>
}

export type GetEquipmentStatusByClassroomResult = {
  success: boolean
  data?: ClassroomEquipmentStats[]
  error?: string
}

export async function getEquipmentStatusByClassroom(): Promise<GetEquipmentStatusByClassroomResult> {
  try {
    const classrooms = await prisma.classroom.findMany({
      where: { isActive: true },
      include: {
        workstations: {
          include: {
            equipment: {
              select: {
                status: true,
              },
            },
          },
        },
      },
      orderBy: { number: "asc" },
    })

    const stats: ClassroomEquipmentStats[] = classrooms.map((classroom) => {
      const allEquipment = classroom.workstations.flatMap((ws) => ws.equipment)

      const byStatus: Record<EquipmentStatus, number> = {
        OPERATIONAL: 0,
        NEEDS_CHECK: 0,
        IN_REPAIR: 0,
        DECOMMISSIONED: 0,
        NOT_IN_USE: 0,
      }

      allEquipment.forEach((eq) => {
        byStatus[eq.status as EquipmentStatus]++
      })

      return {
        classroomId: classroom.id,
        classroomNumber: classroom.number,
        classroomName: classroom.name,
        total: allEquipment.length,
        byStatus,
      }
    })

    return {
      success: true,
      data: stats,
    }
  } catch (error) {
    console.error("getEquipmentStatusByClassroom error:", error)
    return {
      success: false,
      error: "Ошибка при получении статистики по кабинетам",
    }
  }
}
