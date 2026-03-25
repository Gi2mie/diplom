"use server"

import { prisma } from "@/lib/db"
import { createClassroomSchema, type CreateClassroomInput } from "@/lib/validators"
import type { Classroom } from "@/lib/types"

export type AddClassroomResult = {
  success: boolean
  data?: Classroom
  error?: string
}

export async function addClassroom(input: CreateClassroomInput): Promise<AddClassroomResult> {
  try {
    // Валидация входных данных
    const validationResult = createClassroomSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data

    // Проверка уникальности номера кабинета
    const existing = await prisma.classroom.findUnique({
      where: { number: data.number },
    })

    if (existing) {
      return {
        success: false,
        error: `Кабинет с номером ${data.number} уже существует`,
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

    // Создание кабинета
    const classroom = await prisma.classroom.create({
      data: {
        number: data.number,
        name: data.name,
        building: data.building,
        floor: data.floor,
        description: data.description,
        responsibleId: data.responsibleId,
      },
    })

    return {
      success: true,
      data: classroom,
    }
  } catch (error) {
    console.error("addClassroom error:", error)
    return {
      success: false,
      error: "Ошибка при добавлении кабинета",
    }
  }
}
