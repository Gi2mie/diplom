"use server"

import { prisma } from "@/lib/db"
import type { ChangeHistoryWithRelations, PaginatedResponse } from "@/lib/types"

export type GetChangeHistoryByEquipmentResult = {
  success: boolean
  data?: PaginatedResponse<ChangeHistoryWithRelations>
  error?: string
}

export async function getChangeHistoryByEquipment(
  equipmentId: string,
  page: number = 1,
  limit: number = 20
): Promise<GetChangeHistoryByEquipmentResult> {
  try {
    // Проверка существования оборудования
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    })

    if (!equipment) {
      return {
        success: false,
        error: "Оборудование не найдено",
      }
    }

    // Подсчёт общего количества
    const total = await prisma.changeHistory.count({
      where: { equipmentId },
    })

    // Получение данных с пагинацией
    const history = await prisma.changeHistory.findMany({
      where: { equipmentId },
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
    console.error("getChangeHistoryByEquipment error:", error)
    return {
      success: false,
      error: "Ошибка при получении истории изменений",
    }
  }
}
