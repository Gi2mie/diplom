"use server"

import { prisma } from "@/lib/db"
import type { IssueReport } from "@/lib/types"

export type ResolveIssueReportResult = {
  success: boolean
  data?: IssueReport
  error?: string
}

export async function resolveIssueReport(
  id: string,
  resolution: string
): Promise<ResolveIssueReportResult> {
  try {
    // Проверка существования
    const existing = await prisma.issueReport.findUnique({
      where: { id },
    })

    if (!existing) {
      return {
        success: false,
        error: "Обращение не найдено",
      }
    }

    if (existing.status === "RESOLVED" || existing.status === "CLOSED") {
      return {
        success: false,
        error: "Обращение уже решено или закрыто",
      }
    }

    if (!resolution || resolution.trim().length === 0) {
      return {
        success: false,
        error: "Описание решения обязательно",
      }
    }

    // Обновление обращения
    const issueReport = await prisma.issueReport.update({
      where: { id },
      data: {
        status: "RESOLVED",
        resolution: resolution,
        resolvedAt: new Date(),
      },
    })

    // Обновление статуса оборудования на "Исправно"
    await prisma.equipment.update({
      where: { id: existing.equipmentId },
      data: { status: "OPERATIONAL" },
    })

    return {
      success: true,
      data: issueReport,
    }
  } catch (error) {
    console.error("resolveIssueReport error:", error)
    return {
      success: false,
      error: "Ошибка при решении обращения",
    }
  }
}
