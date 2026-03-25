"use server"

import { prisma } from "@/lib/db"
import type { Repair } from "@/lib/types"

export type CancelRepairResult = {
  success: boolean
  data?: Repair
  error?: string
}

export async function cancelRepair(id: string, reason?: string): Promise<CancelRepairResult> {
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

    if (existing.status === "COMPLETED") {
      return {
        success: false,
        error: "Невозможно отменить завершённый ремонт",
      }
    }

    if (existing.status === "CANCELLED") {
      return {
        success: false,
        error: "Ремонт уже отменён",
      }
    }

    // Отмена ремонта
    const repair = await prisma.repair.update({
      where: { id },
      data: {
        status: "CANCELLED",
        workPerformed: reason ? `Отменён: ${reason}` : "Отменён",
      },
    })

    // Обновление статуса оборудования на "Требует проверки"
    await prisma.equipment.update({
      where: { id: existing.equipmentId },
      data: { status: "NEEDS_CHECK" },
    })

    return {
      success: true,
      data: repair,
    }
  } catch (error) {
    console.error("cancelRepair error:", error)
    return {
      success: false,
      error: "Ошибка при отмене ремонта",
    }
  }
}
