"use server"

import { prisma } from "@/lib/db"
import { updateComponentSchema, type UpdateComponentInput } from "@/lib/validators"
import type { Component } from "@/lib/types"

export type UpdateComponentResult = {
  success: boolean
  data?: Component
  error?: string
}

export async function updateComponent(
  id: string,
  input: UpdateComponentInput
): Promise<UpdateComponentResult> {
  try {
    // Проверка существования
    const existing = await prisma.component.findUnique({
      where: { id },
    })

    if (!existing) {
      return {
        success: false,
        error: "Компонент не найден",
      }
    }

    // Валидация входных данных
    const validationResult = updateComponentSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data

    // Обновление компонента
    const component = await prisma.component.update({
      where: { id },
      data,
    })

    return {
      success: true,
      data: component,
    }
  } catch (error) {
    console.error("updateComponent error:", error)
    return {
      success: false,
      error: "Ошибка при обновлении компонента",
    }
  }
}
