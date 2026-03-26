import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"
import { db } from "@/lib/db"

function toUserRole(role?: string): UserRole {
  return role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.TEACHER
}

export async function getUserByEmail(email: string) {
  try {
    const user = await db.user.findUnique({
      where: { email },
    })
    return user
  } catch (error) {
    console.error("Error fetching user:", error)
    return null
  }
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, passwordHash)
  } catch (error) {
    console.error("Error verifying password:", error)
    return false
  }
}

export async function markUserLastLogin(userId: string) {
  try {
    await db.user.update({
      where: { id: userId },
      // Prisma Client types may lag behind schema during dev; keep runtime correct.
      data: { lastLoginAt: new Date() } as any,
    })
  } catch (error) {
    console.error("Error updating last login:", error)
  }
}

export async function createUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: string = "TEACHER"
) {
  try {
    const passwordHash = await bcrypt.hash(password, 10)

    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: toUserRole(role),
        isActive: true,
      },
    })

    return user
  } catch (error) {
    console.error("Error creating user:", error)
    throw error
  }
}