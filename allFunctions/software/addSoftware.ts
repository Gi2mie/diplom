"use server"

import { prisma } from "@/lib/db"
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

    // Проверка уникальности названия
    const existing = await prisma.software.findUnique({
      where: { name: data.name },
    })

    if (existing) {
      return {
        success: false,
        error: `ПО с названием "${data.name}" уже существует`,
      }
    }

    // Создание ПО
    const software = await prisma.software.create({
      data: {
        name: data.name,
        vendor: data.vendor,
        licenseType: data.licenseType,
        description: data.description,
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
