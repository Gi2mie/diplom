import { PrismaClient, UserRole, UserStatus } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create admin user
  const adminPassword = await hash("admin123", 12)
  const admin = await prisma.user.upsert({
    where: { email: "admin@nhtk" },
    update: {
      passwordHash: adminPassword,
      isActive: true,
      status: UserStatus.ACTIVE,
      phone: "+7(900) 111-11-11",
      position: "Системный администратор",
      department: "ИТ-отдел",
    },
    create: {
      email: "admin@nhtk",
      passwordHash: adminPassword,
      firstName: "Администратор",
      lastName: "Системы",
      status: UserStatus.ACTIVE,
      position: "Системный администратор",
      department: "ИТ-отдел",
      role: UserRole.ADMIN,
      isActive: true,
      phone: "+7(900) 111-11-11",
    },
  })
  console.log("Created admin user:", admin.email)

  // Create teacher user
  const teacherPassword = await hash("teacher123", 12)
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@nhtk" },
    update: {
      passwordHash: teacherPassword,
      isActive: true,
      status: UserStatus.ACTIVE,
      phone: "+7(900) 222-22-22",
      position: "Преподаватель",
      department: "Кафедра информатики",
    },
    create: {
      email: "teacher@nhtk",
      passwordHash: teacherPassword,
      firstName: "Иван",
      lastName: "Петров",
      middleName: "Сергеевич",
      status: UserStatus.ACTIVE,
      position: "Преподаватель",
      department: "Кафедра информатики",
      role: UserRole.TEACHER,
      isActive: true,
      phone: "+7(900) 222-22-22",
    },
  })
  console.log("Created teacher user:", teacher.email)

  console.log("\n=== Test Credentials ===")
  console.log("Admin: admin@nhtk / admin123")
  console.log("Teacher: teacher@nhtk / teacher123")
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
