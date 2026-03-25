import bcrypt from 'bcryptjs'
import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

function toUserRole(role?: string): UserRole {
  return role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.TEACHER
}

export async function getUserByEmail(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    })
    return user
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, passwordHash)
  } catch (error) {
    console.error('Error verifying password:', error)
    return false
  }
}

export async function createUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: string = 'TEACHER'
) {
  try {
    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
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
    console.error('Error creating user:', error)
    throw error
  }
}