"use server"

import { prisma } from "@/lib/db"
import type { InstalledSoftwareWithRelations } from "@/lib/types"

export type GetSoftwareByEquipmentResult = {
  success: boolean
  data?: InstalledSoftwareWithRelations[]
  error?: string
}

export async function getSoftwareByEquipment(
  equipmentId: string
): Promise<GetSoftwareByEquipmentResult> {
  try {
    // Проверка существования оборудования
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    })

    if (!equipment) {
      return {
        success: false,
        error: "Оборудование не найдено",
      }
    }

    const installedSoftware = await prisma.installedSoftware.findMany({
      where: { equipmentId },
      include: {
        software: true,
      },
      orderBy: { installedAt: "desc" },
    })

    return {
      success: true,
      data: installedSoftware as InstalledSoftwareWithRelations[],
    }
  } catch (error) {
    console.error("getSoftwareByEquipment error:", error)
    return {
      success: false,
      error: "Ошибка при получении ПО",
    }
  }
}
