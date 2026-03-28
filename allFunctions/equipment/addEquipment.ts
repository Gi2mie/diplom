"use server"

import { prisma } from "@/lib/db"
import { createEquipmentSchema, type CreateEquipmentInput } from "@/lib/validators"
import type { Equipment } from "@/lib/types"

export type AddEquipmentResult = {
  success: boolean
  data?: Equipment
  error?: string
}

export async function addEquipment(input: CreateEquipmentInput): Promise<AddEquipmentResult> {
  try {
    // Валидация входных данных
    const validationResult = createEquipmentSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data

    const kind = await prisma.equipmentKind.findUnique({
      where: { id: data.equipmentKindId },
    })
    if (!kind) {
      return { success: false, error: "Тип оборудования не найден" }
    }

    const category = await prisma.equipmentCategory.findUnique({
      where: { id: data.categoryId },
    })
    if (!category) {
      return { success: false, error: "Категория не найдена" }
    }

    // Проверка уникальности инвентарного номера
    const existing = await prisma.equipment.findUnique({
      where: { inventoryNumber: data.inventoryNumber },
    })

    if (existing) {
      return {
        success: false,
        error: `Оборудование с инвентарным номером ${data.inventoryNumber} уже существует`,
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

    // Создание оборудования
    const equipment = await prisma.equipment.create({
      data: {
        inventoryNumber: data.inventoryNumber,
        name: data.name,
        type: kind.mapsToEnum,
        status: data.status,
        categoryId: data.categoryId,
        equipmentKindId: data.equipmentKindId,
        workstationId: data.workstationId,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber,
        purchaseDate: data.purchaseDate,
        warrantyUntil: data.warrantyUntil,
        description: data.description,
      },
    })

    return {
      success: true,
      data: equipment,
    }
  } catch (error) {
    console.error("addEquipment error:", error)
    return {
      success: false,
      error: "Ошибка при добавлении оборудования",
    }
  }
}
