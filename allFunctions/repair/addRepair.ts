"use server"

import { prisma } from "@/lib/db"
import { createRepairSchema, type CreateRepairInput } from "@/lib/validators"
import type { Repair } from "@/lib/types"

export type AddRepairResult = {
  success: boolean
  data?: Repair
  error?: string
}

export async function addRepair(
  input: CreateRepairInput,
  createdById: string
): Promise<AddRepairResult> {
  try {
    // Валидация входных данных
    const validationResult = createRepairSchema.safeParse(input)
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

    // Проверка существования обращения (если указано)
    if (data.issueReportId) {
      const issueReport = await prisma.issueReport.findUnique({
        where: { id: data.issueReportId },
      })
      if (!issueReport) {
        return {
          success: false,
          error: "Обращение не найдено",
        }
      }
    }

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

    // Создание ремонта
    const repair = await prisma.repair.create({
      data: {
        equipmentId: data.equipmentId,
        issueReportId: data.issueReportId,
        assignedToId: data.assignedToId,
        createdById: createdById,
        description: data.description,
        diagnosis: data.diagnosis,
      },
    })

    // Обновление статуса оборудования на "В ремонте"
    await prisma.equipment.update({
      where: { id: data.equipmentId },
      data: { status: "IN_REPAIR" },
    })

    // Обновление статуса обращения на "В работе" (если указано)
    if (data.issueReportId) {
      await prisma.issueReport.update({
        where: { id: data.issueReportId },
        data: { status: "IN_PROGRESS" },
      })
    }

    return {
      success: true,
      data: repair,
    }
  } catch (error) {
    console.error("addRepair error:", error)
    return {
      success: false,
      error: "Ошибка при создании ремонта",
    }
  }
}
