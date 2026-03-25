"use server"

import { prisma } from "@/lib/db"

export type DeleteEquipmentResult = {
  success: boolean
  error?: string
}

export async function deleteEquipment(id: string): Promise<DeleteEquipmentResult> {
  try {
    // Проверка существования
    const existing = await prisma.equipment.findUnique({
      where: { id },
      include: {
        issueReports: { where: { status: { in: ["NEW", "IN_PROGRESS"] } } },
        repairs: { where: { status: { in: ["PLANNED", "IN_PROGRESS"] } } },
      },
    })

    if (!existing) {
      return {
        success: false,
        error: "Оборудование не найдено",
      }
    }

    // Проверка на активные обращения/ремонты
    if (existing.issueReports.length > 0) {
      return {
        success: false,
        error: "Невозможно удалить оборудование с активными обращениями",
      }
    }

    if (existing.repairs.length > 0) {
      return {
        success: false,
        error: "Невозможно удалить оборудование с активными ремонтами",
      }
    }

    // Удаление оборудования (каскадно удалит компоненты, установленное ПО и т.д.)
    await prisma.equipment.delete({
      where: { id },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("deleteEquipment error:", error)
    return {
      success: false,
      error: "Ошибка при удалении оборудования",
    }
  }
}
