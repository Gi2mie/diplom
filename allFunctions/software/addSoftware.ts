"use server"

import { prisma } from "@/lib/db"
import { normalizeLicenseDateForDb } from "@/lib/software-dates"
import { createSoftwareSchema, type CreateSoftwareInput } from "@/lib/validators"
import type { Software } from "@/lib/types"

export type AddSoftwareResult = {
  success: boolean
  data?: Software
  error?: string
}

export async function addSoftware(input: CreateSoftwareInput): Promise<AddSoftwareResult> {
  try {
    // Валидация входных данных
    const validationResult = createSoftwareSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data
    const name = data.name.trim()
    const version = (data.version ?? "").trim()

    const existing = await prisma.software.findUnique({
      where: { name_version: { name, version } },
    })

    if (existing) {
      return {
        success: false,
        error: `ПО «${name}» с такой версией уже есть в каталоге`,
      }
    }

    const software = await prisma.software.create({
      data: {
        name,
        version,
        vendor: data.vendor?.trim() || null,
        category: data.category,
        licenseKind: data.licenseKind,
        defaultLicenseKey: data.defaultLicenseKey?.trim() || null,
        licenseExpiresAt: normalizeLicenseDateForDb(data.licenseExpiresAt ?? null),
        description: data.description?.trim() || null,
      },
    })

    return {
      success: true,
      data: software,
    }
  } catch (error) {
    console.error("addSoftware error:", error)
    return {
      success: false,
      error: "Ошибка при добавлении ПО",
    }
  }
}
