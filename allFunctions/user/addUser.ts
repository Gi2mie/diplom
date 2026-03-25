"use server"

import { prisma } from "@/lib/db"
import { createUserSchema, type CreateUserInput } from "@/lib/validators"
import type { User } from "@/lib/types"
import bcrypt from "bcryptjs"

export type AddUserResult = {
  success: boolean
  data?: Omit<User, "passwordHash">
  error?: string
}

export async function addUser(input: CreateUserInput): Promise<AddUserResult> {
  try {
    // Валидация входных данных
    const validationResult = createUserSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data

    // Проверка уникальности email
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existing) {
      return {
        success: false,
        error: "Пользователь с таким email уже существует",
      }
    }

    // Хеширование пароля
    const passwordHash = await bcrypt.hash(data.password, 12)

    // Создание пользователя
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        role: data.role,
      },
    })

    // Возвращаем без passwordHash
    const { passwordHash: _, ...userWithoutPassword } = user

    return {
      success: true,
      data: userWithoutPassword,
    }
  } catch (error) {
    console.error("addUser error:", error)
    return {
      success: false,
      error: "Ошибка при создании пользователя",
    }
  }
}
