"use server"

import { prisma } from "@/lib/db"
import { issueReportFiltersSchema, type IssueReportFiltersInput } from "@/lib/validators"
import type { IssueReportWithRelations, PaginatedResponse } from "@/lib/types"
import type { Prisma } from "@prisma/client"

export type GetAllIssueReportsResult = {
  success: boolean
  data?: PaginatedResponse<IssueReportWithRelations>
  error?: string
}

export async function getAllIssueReports(
  filters?: IssueReportFiltersInput
): Promise<GetAllIssueReportsResult> {
  try {
    // Валидация фильтров
    const validationResult = issueReportFiltersSchema.safeParse(filters || {})
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      status,
      priority,
      equipmentId,
      reporterId,
      search,
    } = validationResult.data

    // Построение условий фильтрации
    const where: Prisma.IssueReportWhereInput = {}

    if (status) {
      where.status = Array.isArray(status) ? { in: status } : status
    }

    if (priority) {
      where.priority = Array.isArray(priority) ? { in: priority } : priority
    }

    if (equipmentId) {
      where.equipmentId = equipmentId
    }

    if (reporterId) {
      where.reporterId = reporterId
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    // Подсчёт общего количества
    const total = await prisma.issueReport.count({ where })

    // Получение данных с пагинацией
    const issueReports = await prisma.issueReport.findMany({
      where,
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
        _count: {
          select: {
            repairs: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    })

    return {
      success: true,
      data: {
        data: issueReports as IssueReportWithRelations[],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    }
  } catch (error) {
    console.error("getAllIssueReports error:", error)
    return {
      success: false,
      error: "Ошибка при получении списка обращений",
    }
  }
}
