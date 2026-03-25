"use server"

import { prisma } from "@/lib/db"
import { createInstalledSoftwareSchema, type CreateInstalledSoftwareInput } from "@/lib/validators"
import type { InstalledSoftware } from "@/lib/types"

export type InstallSoftwareResult = {
  success: boolean
  data?: InstalledSoftware
  error?: string
}

export async function installSoftware(
  input: CreateInstalledSoftwareInput
): Promise<InstallSoftwareResult> {
  try {
    // Валидация входных данных
    const validationResult = createInstalledSoftwareSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data

    // Проверка существования оборудования
    const equipment = await prisma.equipment.findUnique({
      where: { id: data.equipmentId },
    })

    if (!equipment) {
      return {
        success: false,
        error: "Оборудование не найдено",
      }
    }

    // Проверка существования ПО
    const software = await prisma.software.findUnique({
      where: { id: data.softwareId },
    })

    if (!software) {
      return {
        success: false,
        error: "ПО не найдено",
      }
    }

    // Проверка на уже установленное ПО
    const existing = await prisma.installedSoftware.findUnique({
      where: {
        equipmentId_softwareId: {
          equipmentId: data.equipmentId,
          softwareId: data.softwareId,
        },
      },
    })

    if (existing) {
      return {
        success: false,
        error: "Это ПО уже установлено на данном оборудовании",
      }
    }

    // Создание записи об установке
    const installedSoftware = await prisma.installedSoftware.create({
      data: {
        equipmentId: data.equipmentId,
        softwareId: data.softwareId,
        version: data.version,
        licenseKey: data.licenseKey,
        installedAt: data.installedAt || new Date(),
        expiresAt: data.expiresAt,
        notes: data.notes,
      },
    })

    return {
      success: true,
      data: installedSoftware,
    }
  } catch (error) {
    console.error("installSoftware error:", error)
    return {
      success: false,
      error: "Ошибка при установке ПО",
    }
  }
}
