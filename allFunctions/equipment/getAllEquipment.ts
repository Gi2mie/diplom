"use server"

import { prisma } from "@/lib/db"
import { equipmentFiltersSchema, type EquipmentFiltersInput } from "@/lib/validators"
import type { EquipmentWithRelations, PaginatedResponse } from "@/lib/types"
import type { Prisma } from "@prisma/client"

export type GetAllEquipmentResult = {
  success: boolean
  data?: PaginatedResponse<EquipmentWithRelations>
  error?: string
}

export async function getAllEquipment(
  filters?: EquipmentFiltersInput
): Promise<GetAllEquipmentResult> {
  try {
    // Валидация фильтров
    const validationResult = equipmentFiltersSchema.safeParse(filters || {})
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
      type,
      categoryId,
      equipmentKindId,
      buildingId,
      workstationId,
      classroomId,
      search,
      isActive,
    } = validationResult.data

    // Построение условий фильтрации
    const where: Prisma.EquipmentWhereInput = {}

    if (status) {
      where.status = Array.isArray(status) ? { in: status } : status
    }

    if (type) {
      where.type = Array.isArray(type) ? { in: type } : type
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (equipmentKindId) {
      where.equipmentKindId = equipmentKindId
    }

    if (workstationId) {
      where.workstationId = workstationId
    }

    const wsFilter: Prisma.WorkstationWhereInput = {}
    if (classroomId) {
      wsFilter.classroomId = classroomId
    }
    if (buildingId) {
      wsFilter.classroom = { buildingId }
    }
    if (Object.keys(wsFilter).length > 0) {
      where.workstation = wsFilter
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { inventoryNumber: { contains: search, mode: "insensitive" } },
        { serialNumber: { contains: search, mode: "insensitive" } },
        { manufacturer: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
      ]
    }

    // Подсчёт общего количества
    const total = await prisma.equipment.count({ where })

    // Получение данных с пагинацией
    const equipment = await prisma.equipment.findMany({
      where,
      include: {
        category: true,
        equipmentKind: true,
        workstation: {
          include: {
            classroom: true,
          },
        },
        components: true,
        _count: {
          select: {
            issueReports: true,
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
        data: equipment as EquipmentWithRelations[],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    }
  } catch (error) {
    console.error("getAllEquipment error:", error)
    return {
      success: false,
      error: "Ошибка при получении списка оборудования",
    }
  }
}
