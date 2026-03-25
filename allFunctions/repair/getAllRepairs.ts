"use server"

import { prisma } from "@/lib/db"
import { repairFiltersSchema, type RepairFiltersInput } from "@/lib/validators"
import type { RepairWithRelations, PaginatedResponse } from "@/lib/types"
import type { Prisma } from "@prisma/client"

export type GetAllRepairsResult = {
  success: boolean
  data?: PaginatedResponse<RepairWithRelations>
  error?: string
}

export async function getAllRepairs(
  filters?: RepairFiltersInput
): Promise<GetAllRepairsResult> {
  try {
    // Валидация фильтров
    const validationResult = repairFiltersSchema.safeParse(filters || {})
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
      equipmentId,
      assignedToId,
      createdById,
    } = validationResult.data

    // Построение условий фильтрации
    const where: Prisma.RepairWhereInput = {}

    if (status) {
      where.status = Array.isArray(status) ? { in: status } : status
    }

    if (equipmentId) {
      where.equipmentId = equipmentId
    }

    if (assignedToId) {
      where.assignedToId = assignedToId
    }

    if (createdById) {
      where.createdById = createdById
    }

    // Подсчёт общего количества
    const total = await prisma.repair.count({ where })

    // Получение данных с пагинацией
    const repairs = await prisma.repair.findMany({
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
        issueReport: true,
        assignedTo: true,
        createdBy: true,
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    })

    return {
      success: true,
      data: {
        data: repairs as RepairWithRelations[],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    }
  } catch (error) {
    console.error("getAllRepairs error:", error)
    return {
      success: false,
      error: "Ошибка при получении списка ремонтов",
    }
  }
}
