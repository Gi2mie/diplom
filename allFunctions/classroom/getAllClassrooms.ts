"use server"

import { prisma } from "@/lib/db"
import { paginationSchema, type PaginationInput } from "@/lib/validators"
import type { ClassroomWithRelations, PaginatedResponse } from "@/lib/types"
import type { Prisma } from "@prisma/client"

export type GetAllClassroomsFilters = PaginationInput & {
  building?: string
  floor?: number
  responsibleId?: string
  search?: string
  isActive?: boolean
}

export type GetAllClassroomsResult = {
  success: boolean
  data?: PaginatedResponse<ClassroomWithRelations>
  error?: string
}

export async function getAllClassrooms(
  filters?: GetAllClassroomsFilters
): Promise<GetAllClassroomsResult> {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "number",
      sortOrder = "asc",
      building,
      floor,
      responsibleId,
      search,
      isActive,
    } = filters || {}

    // Построение условий фильтрации
    const where: Prisma.ClassroomWhereInput = {}

    if (building) {
      where.building = building
    }

    if (floor !== undefined) {
      where.floor = floor
    }

    if (responsibleId) {
      where.responsibleId = responsibleId
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    if (search) {
      where.OR = [
        { number: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    // Подсчёт общего количества
    const total = await prisma.classroom.count({ where })

    // Получение данных с пагинацией
    const classrooms = await prisma.classroom.findMany({
      where,
      include: {
        responsible: true,
        _count: {
          select: {
            workstations: true,
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
        data: classrooms as ClassroomWithRelations[],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    }
  } catch (error) {
    console.error("getAllClassrooms error:", error)
    return {
      success: false,
      error: "Ошибка при получении списка кабинетов",
    }
  }
}
