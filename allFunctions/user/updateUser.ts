"use server"

import { prisma } from "@/lib/db"
import { updateUserSchema, type UpdateUserInput } from "@/lib/validators"
import type { User } from "@/lib/types"
import bcrypt from "bcryptjs"

export type UpdateUserResult = {
  success: boolean
  data?: Omit<User, "passwordHash">
  error?: string
}

export async function updateUser(
  id: string,
  input: UpdateUserInput
): Promise<UpdateUserResult> {
  try {
    // Проверка существования
    const existing = await prisma.user.findUnique({
      where: { id },
    })

    if (!existing) {
      return {
        success: false,
        error: "Пользователь не найден",
      }
    }

    // Валидация входных данных
    const validationResult = updateUserSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data

    // Проверка уникальности email (если изменяется)
    if (data.email && data.email !== existing.email) {
      const duplicate = await prisma.user.findUnique({
        where: { email: data.email },
      })
      if (duplicate) {
        return {
          success: false,
          error: "Пользователь с таким email уже существует",
        }
      }
    }

    // Подготовка данных для обновления
    const updateData: Record<string, unknown> = { ...data }

    // Хеширование пароля если он передан
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12)
      delete updateData.password
    }

    // Обновление пользователя
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    })

    // Возвращаем без passwordHash
    const { passwordHash: _, ...userWithoutPassword } = user

    return {
      success: true,
      data: userWithoutPassword,
    }
  } catch (error) {
    console.error("updateUser error:", error)
    return {
      success: false,
      error: "Ошибка при обновлении пользователя",
    }
  }
}
