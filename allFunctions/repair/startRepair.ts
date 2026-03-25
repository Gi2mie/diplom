"use server"

import { prisma } from "@/lib/db"
import type { Repair } from "@/lib/types"

export type StartRepairResult = {
  success: boolean
  data?: Repair
  error?: string
}

export async function startRepair(id: string): Promise<StartRepairResult> {
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

    if (existing.status !== "PLANNED") {
      return {
        success: false,
        error: "Можно начать только запланированный ремонт",
      }
    }

    // Начало ремонта
    const repair = await prisma.repair.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    })

    return {
      success: true,
      data: repair,
    }
  } catch (error) {
    console.error("startRepair error:", error)
    return {
      success: false,
      error: "Ошибка при начале ремонта",
    }
  }
}
