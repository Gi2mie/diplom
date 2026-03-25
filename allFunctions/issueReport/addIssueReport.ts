"use server"

import { prisma } from "@/lib/db"
import { createIssueReportSchema, type CreateIssueReportInput } from "@/lib/validators"
import type { IssueReport } from "@/lib/types"

export type AddIssueReportResult = {
  success: boolean
  data?: IssueReport
  error?: string
}

export async function addIssueReport(
  input: CreateIssueReportInput,
  reporterId: string
): Promise<AddIssueReportResult> {
  try {
    // Валидация входных данных
    const validationResult = createIssueReportSchema.safeParse(input)
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

    // Проверка существования пользователя
    const reporter = await prisma.user.findUnique({
      where: { id: reporterId },
    })

    if (!reporter) {
      return {
        success: false,
        error: "Пользователь не найден",
      }
    }

    // Создание обращения
    const issueReport = await prisma.issueReport.create({
      data: {
        equipmentId: data.equipmentId,
        reporterId: reporterId,
        title: data.title,
        description: data.description,
        priority: data.priority,
      },
    })

    // Обновление статуса оборудования на "Требует проверки"
    await prisma.equipment.update({
      where: { id: data.equipmentId },
      data: { status: "NEEDS_CHECK" },
    })

    return {
      success: true,
      data: issueReport,
    }
  } catch (error) {
    console.error("addIssueReport error:", error)
    return {
      success: false,
      error: "Ошибка при создании обращения",
    }
  }
}
