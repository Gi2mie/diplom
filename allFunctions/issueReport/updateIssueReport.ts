"use server"

import { prisma } from "@/lib/db"
import { updateIssueReportSchema, type UpdateIssueReportInput } from "@/lib/validators"
import type { IssueReport } from "@/lib/types"

export type UpdateIssueReportResult = {
  success: boolean
  data?: IssueReport
  error?: string
}

export async function updateIssueReport(
  id: string,
  input: UpdateIssueReportInput
): Promise<UpdateIssueReportResult> {
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

    // Валидация входных данных
    const validationResult = updateIssueReportSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data

    // Определяем resolvedAt, если статус меняется на RESOLVED или CLOSED
    const updateData: Record<string, unknown> = { ...data }
    if (data.status === "RESOLVED" || data.status === "CLOSED") {
      if (!existing.resolvedAt) {
        updateData.resolvedAt = new Date()
      }
    }

    // Обновление обращения
    const issueReport = await prisma.issueReport.update({
      where: { id },
      data: updateData,
    })

    return {
      success: true,
      data: issueReport,
    }
  } catch (error) {
    console.error("updateIssueReport error:", error)
    return {
      success: false,
      error: "Ошибка при обновлении обращения",
    }
  }
}
