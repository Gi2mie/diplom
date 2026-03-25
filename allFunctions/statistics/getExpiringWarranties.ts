"use server"

import { prisma } from "@/lib/db"
import type { Equipment } from "@/lib/types"

export type GetExpiringWarrantiesResult = {
  success: boolean
  data?: Equipment[]
  error?: string
}

export async function getExpiringWarranties(
  daysAhead: number = 30
): Promise<GetExpiringWarrantiesResult> {
  try {
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)

    const equipment = await prisma.equipment.findMany({
      where: {
        warrantyUntil: {
          gte: now,
          lte: futureDate,
        },
        isActive: true,
        status: { not: "DECOMMISSIONED" },
      },
      include: {
        workstation: {
          include: {
            classroom: true,
          },
        },
      },
      orderBy: { warrantyUntil: "asc" },
    })

    return {
      success: true,
      data: equipment,
    }
  } catch (error) {
    console.error("getExpiringWarranties error:", error)
    return {
      success: false,
      error: "Ошибка при получении оборудования с истекающей гарантией",
    }
  }
}
