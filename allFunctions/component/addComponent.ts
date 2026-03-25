"use server"

import { prisma } from "@/lib/db"
import { createComponentSchema, type CreateComponentInput } from "@/lib/validators"
import type { Component } from "@/lib/types"

export type AddComponentResult = {
  success: boolean
  data?: Component
  error?: string
}

export async function addComponent(input: CreateComponentInput): Promise<AddComponentResult> {
  try {
    // Валидация входных данных
    const validationResult = createComponentSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data

    // Проверка существования оборудования
    const equipment = await prisma.equipment.findUnique({
      where: { id: data.equipmentId },
    })

    if (!equipment) {
      return {
        success: false,
        error: "Оборудование не найдено",
      }
    }

    // Создание компонента
    const component = await prisma.component.create({
      data: {
        equipmentId: data.equipmentId,
        type: data.type,
        name: data.name,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber,
        specifications: data.specifications,
        description: data.description,
      },
    })

    return {
      success: true,
      data: component,
    }
  } catch (error) {
    console.error("addComponent error:", error)
    return {
      success: false,
      error: "Ошибка при добавлении компонента",
    }
  }
}
