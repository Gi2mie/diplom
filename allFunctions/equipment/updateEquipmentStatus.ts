"use server"

import { prisma } from "@/lib/db"
import { updateEquipmentStatusSchema } from "@/lib/validators"
import type { Equipment, EquipmentStatus } from "@/lib/types"

export type UpdateEquipmentStatusResult = {
  success: boolean
  data?: Equipment
  error?: string
}

export async function updateEquipmentStatus(
  id: string,
  status: EquipmentStatus
): Promise<UpdateEquipmentStatusResult> {
  try {
    // Валидация статуса
    const validationResult = updateEquipmentStatusSchema.safeParse({ status })
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    // Проверка существования
    const existing = await prisma.equipment.findUnique({
      where: { id },
    })

    if (!existing) {
      return {
        success: false,
        error: "Оборудование не найдено",
      }
    }

    // Обновление статуса
    const equipment = await prisma.equipment.update({
      where: { id },
      data: { status },
    })

    return {
      success: true,
      data: equipment,
    }
  } catch (error) {
    console.error("updateEquipmentStatus error:", error)
    return {
      success: false,
      error: "Ошибка при обновлении статуса оборудования",
    }
  }
}
