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

  const mainBuilding = await prisma.building.upsert({
    where: { id: "seed-building-main" },
    update: {},
    create: {
      id: "seed-building-main",
      name: "Главный корпус",
      address: "ул. Учебная, 1",
      floors: 5,
      description: "Основное здание",
    },
  })

  const typeClassroom = await prisma.classroomType.upsert({
    where: { code: "classroom" },
    update: {},
    create: {
      name: "Учебная аудитория",
      code: "classroom",
      color: "bg-slate-100 text-slate-800",
      description: "Стандартные аудитории",
    },
  })

  const typeLab = await prisma.classroomType.upsert({
    where: { code: "computer_lab" },
    update: {},
    create: {
      name: "Компьютерный класс",
      code: "computer_lab",
      color: "bg-green-100 text-green-800",
      description: "Классы с ПК",
    },
  })

  await prisma.classroom.upsert({
    where: { number: "301" },
    update: {
      responsibleId: teacher.id,
    },
    create: {
      number: "301",
      name: "Аудитория 301",
      buildingId: mainBuilding.id,
      classroomTypeId: typeClassroom.id,
      floor: 3,
      capacity: 30,
      description: "Пример аудитории из сида",
      responsibleId: teacher.id,
      listingStatus: "ACTIVE",
      isActive: true,
    },
  })

  await prisma.classroom.upsert({
    where: { number: "105" },
    update: {},
    create: {
      number: "105",
      name: "Компьютерный класс 105",
      buildingId: mainBuilding.id,
      classroomTypeId: typeLab.id,
      floor: 1,
      capacity: 24,
      listingStatus: "ACTIVE",
      isActive: true,
    },
  })

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
