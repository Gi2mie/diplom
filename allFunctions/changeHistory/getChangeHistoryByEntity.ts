"use server"

import { prisma } from "@/lib/db"
import type { ChangeHistoryWithRelations, PaginatedResponse, EntityType } from "@/lib/types"

export type GetChangeHistoryFilters = {
  page?: number
  limit?: number
  dateFrom?: Date
  dateTo?: Date
}

export type GetChangeHistoryByEntityResult = {
  success: boolean
  data?: PaginatedResponse<ChangeHistoryWithRelations>
  error?: string
}

export async function getChangeHistoryByEntity(
  entityType: EntityType,
  entityId: string,
  filters?: GetChangeHistoryFilters
): Promise<GetChangeHistoryByEntityResult> {
  try {
    const { page = 1, limit = 20, dateFrom, dateTo } = filters || {}

    // Построение условий
    const where = {
      entityType,
      entityId,
      ...(dateFrom && { createdAt: { gte: dateFrom } }),
      ...(dateTo && { createdAt: { lte: dateTo } }),
    }

    // Подсчёт общего количества
    const total = await prisma.changeHistory.count({ where })

    // Получение данных с пагинацией
    const history = await prisma.changeHistory.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    })

    return {
      success: true,
      data: {
        data: history as ChangeHistoryWithRelations[],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    }
  } catch (error) {
    console.error("getChangeHistoryByEntity error:", error)
    return {
      success: false,
      error: "Ошибка при получении истории изменений",
    }
  }
}
