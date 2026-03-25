"use server"

import { prisma } from "@/lib/db"
import { paginationSchema, type PaginationInput } from "@/lib/validators"
import type { Software, PaginatedResponse } from "@/lib/types"
import type { Prisma } from "@prisma/client"

export type GetAllSoftwareFilters = PaginationInput & {
  search?: string
  vendor?: string
  licenseType?: string
}

export type GetAllSoftwareResult = {
  success: boolean
  data?: PaginatedResponse<Software>
  error?: string
}

export async function getAllSoftware(
  filters?: GetAllSoftwareFilters
): Promise<GetAllSoftwareResult> {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "name",
      sortOrder = "asc",
      search,
      vendor,
      licenseType,
    } = filters || {}

    // Построение условий фильтрации
    const where: Prisma.SoftwareWhereInput = {}

    if (vendor) {
      where.vendor = vendor
    }

    if (licenseType) {
      where.licenseType = licenseType
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { vendor: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    // Подсчёт общего количества
    const total = await prisma.software.count({ where })

    // Получение данных с пагинацией
    const software = await prisma.software.findMany({
      where,
      include: {
        _count: {
          select: {
            installations: true,
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
        data: software,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    }
  } catch (error) {
    console.error("getAllSoftware error:", error)
    return {
      success: false,
      error: "Ошибка при получении списка ПО",
    }
  }
}
