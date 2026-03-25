"use server"

import { prisma } from "@/lib/db"
import { updateEquipmentSchema, type UpdateEquipmentInput } from "@/lib/validators"
import type { Equipment } from "@/lib/types"

export type UpdateEquipmentResult = {
  success: boolean
  data?: Equipment
  error?: string
}

export async function updateEquipment(
  id: string,
  input: UpdateEquipmentInput
): Promise<UpdateEquipmentResult> {
  try {
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

    // Валидация входных данных
    const validationResult = updateEquipmentSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data

    // Проверка уникальности инвентарного номера (если изменяется)
    if (data.inventoryNumber && data.inventoryNumber !== existing.inventoryNumber) {
      const duplicate = await prisma.equipment.findUnique({
        where: { inventoryNumber: data.inventoryNumber },
      })
      if (duplicate) {
        return {
          success: false,
          error: `Оборудование с инвентарным номером ${data.inventoryNumber} уже существует`,
        }
      }
    }

    // Проверка существования рабочего места (если указано)
    if (data.workstationId) {
      const workstation = await prisma.workstation.findUnique({
        where: { id: data.workstationId },
      })
      if (!workstation) {
        return {
          success: false,
          error: "Указанное рабочее место не найдено",
        }
      }
    }

    // Обновление оборудования
    const equipment = await prisma.equipment.update({
      where: { id },
      data,
    })

    return {
      success: true,
      data: equipment,
    }
  } catch (error) {
    console.error("updateEquipment error:", error)
    return {
      success: false,
      error: "Ошибка при обновлении оборудования",
    }
  }
}
