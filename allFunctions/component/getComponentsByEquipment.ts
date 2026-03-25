"use server"

import { prisma } from "@/lib/db"
import type { Component } from "@/lib/types"

export type GetComponentsByEquipmentResult = {
  success: boolean
  data?: Component[]
  error?: string
}

export async function getComponentsByEquipment(
  equipmentId: string
): Promise<GetComponentsByEquipmentResult> {
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

    const components = await prisma.component.findMany({
      where: { equipmentId },
      orderBy: { type: "asc" },
    })

    return {
      success: true,
      data: components,
    }
  } catch (error) {
    console.error("getComponentsByEquipment error:", error)
    return {
      success: false,
      error: "Ошибка при получении компонентов",
    }
  }
}
