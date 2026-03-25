"use server"

import { prisma } from "@/lib/db"
import { updateClassroomSchema, type UpdateClassroomInput } from "@/lib/validators"
import type { Classroom } from "@/lib/types"

export type UpdateClassroomResult = {
  success: boolean
  data?: Classroom
  error?: string
}

export async function updateClassroom(
  id: string,
  input: UpdateClassroomInput
): Promise<UpdateClassroomResult> {
  try {
    // Проверка существования
    const existing = await prisma.classroom.findUnique({
      where: { id },
    })

    if (!existing) {
      return {
        success: false,
        error: "Кабинет не найден",
      }
    }

    // Валидация входных данных
    const validationResult = updateClassroomSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data

    // Проверка уникальности номера кабинета (если изменяется)
    if (data.number && data.number !== existing.number) {
      const duplicate = await prisma.classroom.findUnique({
        where: { number: data.number },
      })
      if (duplicate) {
        return {
          success: false,
          error: `Кабинет с номером ${data.number} уже существует`,
        }
      }
    }

    // Проверка существования ответственного (если указан)
    if (data.responsibleId) {
      const user = await prisma.user.findUnique({
        where: { id: data.responsibleId },
      })
      if (!user) {
        return {
          success: false,
          error: "Указанный ответственный не найден",
        }
      }
    }

    // Обновление кабинета
    const classroom = await prisma.classroom.update({
      where: { id },
      data,
    })

    return {
      success: true,
      data: classroom,
    }
  } catch (error) {
    console.error("updateClassroom error:", error)
    return {
      success: false,
      error: "Ошибка при обновлении кабинета",
    }
  }
}
