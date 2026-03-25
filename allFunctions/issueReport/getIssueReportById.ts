"use server"

import { prisma } from "@/lib/db"
import type { IssueReportWithRelations } from "@/lib/types"

export type GetIssueReportByIdResult = {
  success: boolean
  data?: IssueReportWithRelations
  error?: string
}

export async function getIssueReportById(id: string): Promise<GetIssueReportByIdResult> {
  try {
    const issueReport = await prisma.issueReport.findUnique({
      where: { id },
      include: {
        equipment: {
          include: {
            workstation: {
              include: {
                classroom: true,
              },
            },
          },
        },
        reporter: true,
        repairs: {
          include: {
            assignedTo: true,
            createdBy: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!issueReport) {
      return {
        success: false,
        error: "Обращение не найдено",
      }
    }

    return {
      success: true,
      data: issueReport as IssueReportWithRelations,
    }
  } catch (error) {
    console.error("getIssueReportById error:", error)
    return {
      success: false,
      error: "Ошибка при получении обращения",
    }
  }
}
