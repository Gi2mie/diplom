"use server"

import { prisma } from "@/lib/db"
import type { RepairWithRelations } from "@/lib/types"

export type GetRepairByIdResult = {
  success: boolean
  data?: RepairWithRelations
  error?: string
}

export async function getRepairById(id: string): Promise<GetRepairByIdResult> {
  try {
    const repair = await prisma.repair.findUnique({
      where: { id },
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
    })

    if (!repair) {
      return {
        success: false,
        error: "Ремонт не найден",
      }
    }

    return {
      success: true,
      data: repair as RepairWithRelations,
    }
  } catch (error) {
    console.error("getRepairById error:", error)
    return {
      success: false,
      error: "Ошибка при получении ремонта",
    }
  }
}
