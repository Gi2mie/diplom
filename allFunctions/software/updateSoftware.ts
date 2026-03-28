"use server"

import { prisma } from "@/lib/db"
import { normalizeLicenseDateForDb } from "@/lib/software-dates"
import { updateSoftwareSchema, type UpdateSoftwareInput } from "@/lib/validators"
import type { Software } from "@/lib/types"

export type UpdateSoftwareResult = {
  success: boolean
  data?: Software
  error?: string
}

export async function updateSoftware(
  id: string,
  input: UpdateSoftwareInput
): Promise<UpdateSoftwareResult> {
  try {
    // Проверка существования
    const existing = await prisma.software.findUnique({
      where: { id },
    })

    if (!existing) {
      return {
        success: false,
        error: "ПО не найдено",
      }
    }

    // Валидация входных данных
    const validationResult = updateSoftwareSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data

    const nextName = data.name !== undefined ? data.name.trim() : existing.name
    const nextVersion =
      data.version !== undefined ? data.version.trim() : existing.version

    if (nextName !== existing.name || nextVersion !== existing.version) {
      const duplicate = await prisma.software.findUnique({
        where: { name_version: { name: nextName, version: nextVersion } },
      })
      if (duplicate && duplicate.id !== id) {
        return {
          success: false,
          error: `ПО «${nextName}» с версией «${nextVersion || "—"}» уже есть`,
        }
      }
    }

    const software = await prisma.software.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: nextName } : {}),
        ...(data.version !== undefined ? { version: nextVersion } : {}),
        ...(data.vendor !== undefined ? { vendor: data.vendor?.trim() || null } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.licenseKind !== undefined ? { licenseKind: data.licenseKind } : {}),
        ...(data.defaultLicenseKey !== undefined
          ? { defaultLicenseKey: data.defaultLicenseKey?.trim() || null }
          : {}),
        ...(data.licenseExpiresAt !== undefined
          ? { licenseExpiresAt: normalizeLicenseDateForDb(data.licenseExpiresAt) }
          : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
      },
    })

    return {
      success: true,
      data: software,
    }
  } catch (error) {
    console.error("updateSoftware error:", error)
    return {
      success: false,
      error: "Ошибка при обновлении ПО",
    }
  }
}
