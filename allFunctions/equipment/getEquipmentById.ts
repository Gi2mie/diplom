"use server"

import { prisma } from "@/lib/db"
import type { EquipmentWithRelations } from "@/lib/types"

export type GetEquipmentByIdResult = {
  success: boolean
  data?: EquipmentWithRelations
  error?: string
}

export async function getEquipmentById(id: string): Promise<GetEquipmentByIdResult> {
  try {
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        workstation: {
          include: {
            classroom: true,
          },
        },
        components: true,
        software: {
          include: {
            software: true,
          },
        },
        issueReports: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        repairs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        customFields: {
          include: {
            definition: true,
          },
        },
      },
    })

    if (!equipment) {
      return {
        success: false,
        error: "Оборудование не найдено",
      }
    }

    return {
      success: true,
      data: equipment as EquipmentWithRelations,
    }
  } catch (error) {
    console.error("getEquipmentById error:", error)
    return {
      success: false,
      error: "Ошибка при получении оборудования",
    }
  }
}
