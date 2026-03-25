"use server"

import { prisma } from "@/lib/db"
import { paginationSchema, type PaginationInput } from "@/lib/validators"
import type { User, PaginatedResponse, UserRole } from "@/lib/types"
import type { Prisma } from "@prisma/client"

export type GetAllUsersFilters = PaginationInput & {
  role?: UserRole
  search?: string
  isActive?: boolean
}

export type GetAllUsersResult = {
  success: boolean
  data?: PaginatedResponse<Omit<User, "passwordHash">>
  error?: string
}

export async function getAllUsers(
  filters?: GetAllUsersFilters
): Promise<GetAllUsersResult> {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "lastName",
      sortOrder = "asc",
      role,
      search,
      isActive,
    } = filters || {}

    // Построение условий фильтрации
    const where: Prisma.UserWhereInput = {}

    if (role) {
      where.role = role
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { middleName: { contains: search, mode: "insensitive" } },
      ]
    }

    // Подсчёт общего количества
    const total = await prisma.user.count({ where })

    // Получение данных с пагинацией
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            issueReports: true,
            responsibleRooms: true,
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
        data: users as Omit<User, "passwordHash">[],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    }
  } catch (error) {
    console.error("getAllUsers error:", error)
    return {
      success: false,
      error: "Ошибка при получении списка пользователей",
    }
  }
}
