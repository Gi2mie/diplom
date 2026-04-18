import { PrismaClient, UserRole, UserStatus } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function seedUsers() {
  const adminPasswordHash = await hash("admin123", 12)
  const teacherPasswordHash = await hash("zubenko123", 12)

  await prisma.user.upsert({
    where: { email: "admin@nhtk" },
    update: {
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isActive: true,
      firstName: "Денис",
      lastName: "Николаев",
      middleName: "Сергеевич",
      phone: "+7(904) 521-09-83",
      position: "Ведущий системный администратор",
      department: "Отдел информационных технологий",
    },
    create: {
      email: "admin@nhtk",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isActive: true,
      firstName: "Денис",
      lastName: "Николаев",
      middleName: "Сергеевич",
      phone: "+7(904) 521-09-83",
      position: "Ведущий системный администратор",
      department: "Отдел информационных технологий",
    },
  })

  await prisma.user.upsert({
    where: { email: "zubenkomp@nhtk" },
    update: {
      passwordHash: teacherPasswordHash,
      role: UserRole.TEACHER,
      status: UserStatus.ACTIVE,
      isActive: true,
      firstName: "Михаил",
      lastName: "Зубенко",
      middleName: "Петирович",
      phone: "+7(904) 118-44-27",
      position: "Старший преподаватель",
      department: "Кафедра информатики и вычислительной техники",
    },
    create: {
      email: "zubenkomp@nhtk",
      passwordHash: teacherPasswordHash,
      role: UserRole.TEACHER,
      status: UserStatus.ACTIVE,
      isActive: true,
      firstName: "Михаил",
      lastName: "Зубенко",
      middleName: "Петирович",
      phone: "+7(904) 118-44-27",
      position: "Старший преподаватель",
      department: "Кафедра информатики и вычислительной техники",
    },
  })

  console.log("Users seeded successfully:")
  console.log("  Admin:   admin@nhtk / admin123")
  console.log("  Teacher: zubenkomp@nhtk / zubenko123")
}

seedUsers()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
