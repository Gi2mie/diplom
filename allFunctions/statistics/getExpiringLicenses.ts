"use server"

import { prisma } from "@/lib/db"
import type { InstalledSoftwareWithRelations } from "@/lib/types"

export type GetExpiringLicensesResult = {
  success: boolean
  data?: InstalledSoftwareWithRelations[]
  error?: string
}

export async function getExpiringLicenses(
  daysAhead: number = 30
): Promise<GetExpiringLicensesResult> {
  try {
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)

    const installedSoftware = await prisma.installedSoftware.findMany({
      where: {
        expiresAt: {
          gte: now,
          lte: futureDate,
        },
      },
      include: {
        software: true,
        equipment: {
          include: {
            workstation: {
              include: {
                classroom: true,
              },
            },
          },
        },
      },
      orderBy: { expiresAt: "asc" },
    })

    return {
      success: true,
      data: installedSoftware as InstalledSoftwareWithRelations[],
    }
  } catch (error) {
    console.error("getExpiringLicenses error:", error)
    return {
      success: false,
      error: "Ошибка при получении ПО с истекающими лицензиями",
    }
  }
}
