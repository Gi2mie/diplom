import { PrismaClient, UserRole, UserStatus } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function seedUsers() {
  const adminPasswordHash = await hash("admin123", 12)
  const teacherPasswordHash = await hash("teacher123", 12)

  await prisma.user.upsert({
    where: { email: "admin@nhtk" },
    update: {
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isActive: true,
      firstName: "Администратор",
      lastName: "Системный",
      middleName: "Владимирович",
      phone: "+7(900) 111-11-11",
      position: "Системный администратор",
      department: "ИТ-отдел",
    },
    create: {
      email: "admin@nhtk",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isActive: true,
      firstName: "Администратор",
      lastName: "Системный",
      middleName: "Владимирович",
      phone: "+7(900) 111-11-11",
      position: "Системный администратор",
      department: "ИТ-отдел",
    },
  })

  await prisma.user.upsert({
    where: { email: "teacher@nhtk" },
    update: {
      passwordHash: teacherPasswordHash,
      role: UserRole.TEACHER,
      status: UserStatus.ACTIVE,
      isActive: true,
      firstName: "Иван",
      lastName: "Петров",
      middleName: "Сергеевич",
      phone: "+7(900) 222-22-22",
      position: "Преподаватель",
      department: "Кафедра информатики",
    },
    create: {
      email: "teacher@nhtk",
      passwordHash: teacherPasswordHash,
      role: UserRole.TEACHER,
      status: UserStatus.ACTIVE,
      isActive: true,
      firstName: "Иван",
      lastName: "Петров",
      middleName: "Сергеевич",
      phone: "+7(900) 222-22-22",
      position: "Преподаватель",
      department: "Кафедра информатики",
    },
  })

  console.log("Users seeded successfully:")
  console.log("  Admin:   admin@nhtk / admin123")
  console.log("  Teacher: teacher@nhtk / teacher123")
}

seedUsers()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
