"use server"

import { prisma } from "@/lib/db"
import { completeRepairSchema, type CompleteRepairInput } from "@/lib/validators"
import type { Repair } from "@/lib/types"

export type CompleteRepairResult = {
  success: boolean
  data?: Repair
  error?: string
}

export async function completeRepair(
  id: string,
  input: CompleteRepairInput
): Promise<CompleteRepairResult> {
  try {
    // Проверка существования
    const existing = await prisma.repair.findUnique({
      where: { id },
      include: {
        issueReport: true,
      },
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
        error: "Ремонт уже завершён",
      }
    }

    if (existing.status === "CANCELLED") {
      return {
        success: false,
        error: "Ремонт был отменён",
      }
    }

    // Валидация входных данных
    const validationResult = completeRepairSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data

    // Завершение ремонта
    const repair = await prisma.repair.update({
      where: { id },
      data: {
        status: "COMPLETED",
        workPerformed: data.workPerformed,
        partsUsed: data.partsUsed,
        cost: data.cost,
        completedAt: new Date(),
      },
    })

    // Обновление статуса оборудования на "Исправно"
    await prisma.equipment.update({
      where: { id: existing.equipmentId },
      data: { status: "OPERATIONAL" },
    })

    // Обновление статуса обращения на "Решено" (если связано)
    if (existing.issueReportId && existing.issueReport) {
      await prisma.issueReport.update({
        where: { id: existing.issueReportId },
        data: {
          status: "RESOLVED",
          resolution: `Ремонт завершён: ${data.workPerformed}`,
          resolvedAt: new Date(),
        },
      })
    }

    return {
      success: true,
      data: repair,
    }
  } catch (error) {
    console.error("completeRepair error:", error)
    return {
      success: false,
      error: "Ошибка при завершении ремонта",
    }
  }
}
