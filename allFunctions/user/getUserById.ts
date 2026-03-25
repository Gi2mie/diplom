"use server"

import { prisma } from "@/lib/db"
import type { User } from "@/lib/types"

export type GetUserByIdResult = {
  success: boolean
  data?: Omit<User, "passwordHash">
  error?: string
}

export async function getUserById(id: string): Promise<GetUserByIdResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        responsibleRooms: true,
        _count: {
          select: {
            issueReports: true,
            assignedRepairs: true,
            createdRepairs: true,
          },
        },
      },
    })

    if (!user) {
      return {
        success: false,
        error: "Пользователь не найден",
      }
    }

    // Возвращаем без passwordHash
    const { passwordHash: _, ...userWithoutPassword } = user

    return {
      success: true,
      data: userWithoutPassword,
    }
  } catch (error) {
    console.error("getUserById error:", error)
    return {
      success: false,
      error: "Ошибка при получении пользователя",
    }
  }
}
