"use server"

import { prisma } from "@/lib/db"
import { updateSoftwareSchema, type UpdateSoftwareInput } from "@/lib/validators"
import type { Software } from "@/lib/types"

export type UpdateSoftwareResult = {
  success: boolean
  data?: Software
  error?: string
}

export async function updateSoftware(
  id: string,
  input: UpdateSoftwareInput
): Promise<UpdateSoftwareResult> {
  try {
    // Проверка существования
    const existing = await prisma.software.findUnique({
      where: { id },
    })

    if (!existing) {
      return {
        success: false,
        error: "ПО не найдено",
      }
    }

    // Валидация входных данных
    const validationResult = updateSoftwareSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data

    // Проверка уникальности названия (если изменяется)
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.software.findUnique({
        where: { name: data.name },
      })
      if (duplicate) {
        return {
          success: false,
          error: `ПО с названием "${data.name}" уже существует`,
        }
      }
    }

    // Обновление ПО
    const software = await prisma.software.update({
      where: { id },
      data,
    })

    return {
      success: true,
      data: software,
    }
  } catch (error) {
    console.error("updateSoftware error:", error)
    return {
      success: false,
      error: "Ошибка при обновлении ПО",
    }
  }
}
