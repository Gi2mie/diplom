"use server"

import { prisma } from "@/lib/db"
import { createWorkstationSchema, type CreateWorkstationInput } from "@/lib/validators"
import type { Workstation } from "@/lib/types"

export type AddWorkstationResult = {
  success: boolean
  data?: Workstation
  error?: string
}

export async function addWorkstation(input: CreateWorkstationInput): Promise<AddWorkstationResult> {
  try {
    // Валидация входных данных
    const validationResult = createWorkstationSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data

    // Проверка существования кабинета
    const classroom = await prisma.classroom.findUnique({
      where: { id: data.classroomId },
    })

    if (!classroom) {
      return {
        success: false,
        error: "Кабинет не найден",
      }
    }

    // Проверка уникальности номера рабочего места в кабинете
    const existing = await prisma.workstation.findUnique({
      where: {
        classroomId_number: {
          classroomId: data.classroomId,
          number: data.number,
        },
      },
    })

    if (existing) {
      return {
        success: false,
        error: `Рабочее место №${data.number} уже существует в этом кабинете`,
      }
    }

    // Создание рабочего места
    const workstation = await prisma.workstation.create({
      data: {
        number: data.number,
        classroomId: data.classroomId,
        name: data.name,
        description: data.description,
      },
    })

    return {
      success: true,
      data: workstation,
    }
  } catch (error) {
    console.error("addWorkstation error:", error)
    return {
      success: false,
      error: "Ошибка при добавлении рабочего места",
    }
  }
}
