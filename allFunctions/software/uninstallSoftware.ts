"use server"

import { prisma } from "@/lib/db"

export type UninstallSoftwareResult = {
  success: boolean
  error?: string
}

export async function uninstallSoftware(
  equipmentId: string,
  softwareId: string
): Promise<UninstallSoftwareResult> {
  try {
    // Проверка существования записи
    const existing = await prisma.installedSoftware.findUnique({
      where: {
        equipmentId_softwareId: {
          equipmentId,
          softwareId,
        },
      },
    })

    if (!existing) {
      return {
        success: false,
        error: "ПО не установлено на данном оборудовании",
      }
    }

    // Удаление записи об установке
    await prisma.installedSoftware.delete({
      where: {
        equipmentId_softwareId: {
          equipmentId,
          softwareId,
        },
      },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("uninstallSoftware error:", error)
    return {
      success: false,
      error: "Ошибка при удалении ПО",
    }
  }
}
