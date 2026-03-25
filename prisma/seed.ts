import { PrismaClient, UserRole } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create admin user
  const adminPassword = await hash("admin123", 12)
  const admin = await prisma.user.upsert({
    where: { email: "admin@school.ru" },
    update: {
      passwordHash: adminPassword,
      isActive: true,
    },
    create: {
      email: "admin@school.ru",
      passwordHash: adminPassword,
      firstName: "Администратор",
      lastName: "Системы",
      role: UserRole.ADMIN,
      isActive: true,
    },
  })
  console.log("Created admin user:", admin.email)

  // Create teacher user
  const teacherPassword = await hash("teacher123", 12)
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@school.ru" },
    update: {
      passwordHash: teacherPassword,
      isActive: true,
    },
    create: {
      email: "teacher@school.ru",
      passwordHash: teacherPassword,
      firstName: "Иван",
      lastName: "Петров",
      middleName: "Сергеевич",
      role: UserRole.TEACHER,
      isActive: true,
    },
  })
  console.log("Created teacher user:", teacher.email)

  console.log("\n=== Test Credentials ===")
  console.log("Admin: admin@school.ru / admin123")
  console.log("Teacher: teacher@school.ru / teacher123")
  console.log("========================\n")

  console.log("Seeding completed!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
