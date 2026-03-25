"use server"

import { prisma } from "@/lib/db"
import { updateRepairSchema, type UpdateRepairInput } from "@/lib/validators"
import type { Repair } from "@/lib/types"

export type UpdateRepairResult = {
  success: boolean
  data?: Repair
  error?: string
}

export async function updateRepair(
  id: string,
  input: UpdateRepairInput
): Promise<UpdateRepairResult> {
  try {
    // Проверка существования
    const existing = await prisma.repair.findUnique({
      where: { id },
    })

    if (!existing) {
      return {
        success: false,
        error: "Ремонт не найден",
      }
    }

    // Валидация входных данных
    const validationResult = updateRepairSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data

    // Проверка существования исполнителя (если указан)
    if (data.assignedToId) {
      const assignee = await prisma.user.findUnique({
        where: { id: data.assignedToId },
      })
      if (!assignee) {
        return {
          success: false,
          error: "Исполнитель не найден",
        }
      }
    }

    // Определяем startedAt, если статус меняется на IN_PROGRESS
    const updateData: Record<string, unknown> = { ...data }
    if (data.status === "IN_PROGRESS" && !existing.startedAt) {
      updateData.startedAt = new Date()
    }

    // Обновление ремонта
    const repair = await prisma.repair.update({
      where: { id },
      data: updateData,
    })

    return {
      success: true,
      data: repair,
    }
  } catch (error) {
    console.error("updateRepair error:", error)
    return {
      success: false,
      error: "Ошибка при обновлении ремонта",
    }
  }
}
