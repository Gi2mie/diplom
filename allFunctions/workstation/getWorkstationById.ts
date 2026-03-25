"use server"

import { prisma } from "@/lib/db"
import type { WorkstationWithRelations } from "@/lib/types"

export type GetWorkstationByIdResult = {
  success: boolean
  data?: WorkstationWithRelations
  error?: string
}

export async function getWorkstationById(id: string): Promise<GetWorkstationByIdResult> {
  try {
    const workstation = await prisma.workstation.findUnique({
      where: { id },
      include: {
        classroom: true,
        equipment: {
          include: {
            components: true,
            software: {
              include: {
                software: true,
              },
            },
          },
        },
      },
    })

    if (!workstation) {
      return {
        success: false,
        error: "Рабочее место не найдено",
      }
    }

    return {
      success: true,
      data: workstation as WorkstationWithRelations,
    }
  } catch (error) {
    console.error("getWorkstationById error:", error)
    return {
      success: false,
      error: "Ошибка при получении рабочего места",
    }
  }
}
