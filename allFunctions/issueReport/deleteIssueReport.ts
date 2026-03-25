"use server"

import { prisma } from "@/lib/db"

export type DeleteIssueReportResult = {
  success: boolean
  error?: string
}

export async function deleteIssueReport(id: string): Promise<DeleteIssueReportResult> {
  try {
    // Проверка существования
    const existing = await prisma.issueReport.findUnique({
      where: { id },
      include: {
        repairs: { where: { status: { in: ["PLANNED", "IN_PROGRESS"] } } },
      },
    })

    if (!existing) {
      return {
        success: false,
        error: "Обращение не найдено",
      }
    }

    // Проверка на активные ремонты
    if (existing.repairs.length > 0) {
      return {
        success: false,
        error: "Невозможно удалить обращение с активными ремонтами",
      }
    }

    // Удаление обращения
    await prisma.issueReport.delete({
      where: { id },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("deleteIssueReport error:", error)
    return {
      success: false,
      error: "Ошибка при удалении обращения",
    }
  }
}
