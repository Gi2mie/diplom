import bcrypt from "bcryptjs"
import { UserRole, UserStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { normalizeNhtkEmail } from "@/lib/user-validation"

function toUserRole(role?: string): UserRole {
  return role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.TEACHER
}

export async function getUserByEmail(email: string) {
  try {
    const user = await db.user.findUnique({
      where: { email: normalizeNhtkEmail(email) },
    })
    return user
  } catch (error) {
    console.error("Error fetching user:", error)
    return null
  }
}

/** При JWT-сессии id в токене может остаться после сброса/пересидивания БД — тогда FK на users падает. */
export async function userExistsById(userId: string): Promise<boolean> {
  const row = await db.user.findUnique({ where: { id: userId }, select: { id: true } })
  return Boolean(row)
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
        email: normalizeNhtkEmail(email),
        passwordHash,
        firstName,
        lastName,
        role: toUserRole(role),
        status: UserStatus.ACTIVE,
        isActive: true,
      },
    })

    return user
  } catch (error) {
    console.error("Error creating user:", error)
    throw error
  }
}