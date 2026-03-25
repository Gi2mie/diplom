"use server"

import { prisma } from "@/lib/db"
import { loginSchema, type LoginInput } from "@/lib/validators"
import type { User } from "@/lib/types"
import bcrypt from "bcryptjs"

export type AuthenticateUserResult = {
  success: boolean
  data?: Omit<User, "passwordHash">
  error?: string
}

export async function authenticateUser(
  input: LoginInput
): Promise<AuthenticateUserResult> {
  try {
    // Валидация входных данных
    const validationResult = loginSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const { email, password } = validationResult.data

    // Поиск пользователя
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return {
        success: false,
        error: "Неверный email или пароль",
      }
    }

    // Проверка активности
    if (!user.isActive) {
      return {
        success: false,
        error: "Аккаунт деактивирован",
      }
    }

    // Проверка пароля
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)

    if (!isValidPassword) {
      return {
        success: false,
        error: "Неверный email или пароль",
      }
    }

    // Возвращаем без passwordHash
    const { passwordHash: _, ...userWithoutPassword } = user

    return {
      success: true,
      data: userWithoutPassword,
    }
  } catch (error) {
    console.error("authenticateUser error:", error)
    return {
      success: false,
      error: "Ошибка аутентификации",
    }
  }
}
