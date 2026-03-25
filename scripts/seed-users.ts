import { PrismaClient, UserRole } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function seedUsers() {
  const adminPasswordHash = await hash("admin123", 12)
  const teacherPasswordHash = await hash("teacher123", 12)

  await prisma.user.upsert({
    where: { email: "admin@edutrack.ru" },
    update: {
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
      firstName: "Администратор",
      lastName: "Системный",
      middleName: "Владимирович",
    },
    create: {
      email: "admin@edutrack.ru",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
      firstName: "Администратор",
      lastName: "Системный",
      middleName: "Владимирович",
    },
  })

  await prisma.user.upsert({
    where: { email: "teacher@edutrack.ru" },
    update: {
      passwordHash: teacherPasswordHash,
      role: UserRole.TEACHER,
      isActive: true,
      firstName: "Иван",
      lastName: "Петров",
      middleName: "Сергеевич",
    },
    create: {
      email: "teacher@edutrack.ru",
      passwordHash: teacherPasswordHash,
      role: UserRole.TEACHER,
      isActive: true,
      firstName: "Иван",
      lastName: "Петров",
      middleName: "Сергеевич",
    },
  })

  console.log("Users seeded successfully:")
  console.log("  Admin:   admin@edutrack.ru / admin123")
  console.log("  Teacher: teacher@edutrack.ru / teacher123")
}

seedUsers()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
