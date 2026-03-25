"use server"

import { prisma } from "@/lib/db"
import { updateWorkstationSchema, type UpdateWorkstationInput } from "@/lib/validators"
import type { Workstation } from "@/lib/types"

export type UpdateWorkstationResult = {
  success: boolean
  data?: Workstation
  error?: string
}

export async function updateWorkstation(
  id: string,
  input: UpdateWorkstationInput
): Promise<UpdateWorkstationResult> {
  try {
    // Проверка существования
    const existing = await prisma.workstation.findUnique({
      where: { id },
    })

    if (!existing) {
      return {
        success: false,
        error: "Рабочее место не найдено",
      }
    }

    // Валидация входных данных
    const validationResult = updateWorkstationSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data

    // Проверка уникальности номера (если изменяется)
    if (data.number && data.number !== existing.number) {
      const duplicate = await prisma.workstation.findUnique({
        where: {
          classroomId_number: {
            classroomId: existing.classroomId,
            number: data.number,
          },
        },
      })
      if (duplicate) {
        return {
          success: false,
          error: `Рабочее место №${data.number} уже существует в этом кабинете`,
        }
      }
    }

    // Обновление рабочего места
    const workstation = await prisma.workstation.update({
      where: { id },
      data,
    })

    return {
      success: true,
      data: workstation,
    }
  } catch (error) {
    console.error("updateWorkstation error:", error)
    return {
      success: false,
      error: "Ошибка при обновлении рабочего места",
    }
  }
}
