import { PrismaClient, UserRole, UserStatus, EquipmentType } from "@prisma/client"
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

  const equipmentTypeLabels: Record<EquipmentType, string> = {
    COMPUTER: "Компьютер",
    MONITOR: "Монитор",
    PRINTER: "Принтер",
    PROJECTOR: "Проектор",
    INTERACTIVE_BOARD: "Интерактивная доска",
    SCANNER: "Сканер",
    NETWORK_DEVICE: "Сетевое оборудование",
    PERIPHERAL: "Периферия",
    OTHER: "Прочее",
  }

  for (const ev of Object.values(EquipmentType)) {
    const code = `BUILTIN_${ev}`
    await prisma.equipmentKind.upsert({
      where: { code },
      update: { name: equipmentTypeLabels[ev], mapsToEnum: ev },
      create: {
        code,
        name: equipmentTypeLabels[ev],
        mapsToEnum: ev,
      },
    })
  }

  const seedCategories: { id: string; name: string; color: string; description: string }[] = [
    {
      id: "seed-ecat-computers",
      name: "Компьютеры и комплектующие",
      color: "#3b82f6",
      description: "Системные блоки, комплектующие",
    },
    {
      id: "seed-ecat-monitors",
      name: "Мониторы и дисплеи",
      color: "#10b981",
      description: "Мониторы, панели",
    },
    {
      id: "seed-ecat-peripheral",
      name: "Периферийные устройства",
      color: "#f59e0b",
      description: "Клавиатуры, мыши и т.п.",
    },
    {
      id: "seed-ecat-print",
      name: "Печать и сканирование",
      color: "#ef4444",
      description: "Принтеры, МФУ, сканеры",
    },
    {
      id: "seed-ecat-network",
      name: "Сетевое оборудование",
      color: "#8b5cf6",
      description: "Коммутаторы, точки доступа",
    },
  ]

  for (const c of seedCategories) {
    await prisma.equipmentCategory.upsert({
      where: { id: c.id },
      update: { name: c.name, color: c.color, description: c.description },
      create: {
        id: c.id,
        name: c.name,
        color: c.color,
        description: c.description,
      },
    })
  }

  const kindsByEnum = new Map<EquipmentType, string>()
  for (const ev of Object.values(EquipmentType)) {
    const row = await prisma.equipmentKind.findUnique({
      where: { code: `BUILTIN_${ev}` },
      select: { id: true },
    })
    if (row) kindsByEnum.set(ev, row.id)
  }

  function defaultEquipmentCategoryId(t: EquipmentType): string {
    if (t === EquipmentType.COMPUTER) return "seed-ecat-computers"
    if (t === EquipmentType.MONITOR || t === EquipmentType.PROJECTOR || t === EquipmentType.INTERACTIVE_BOARD)
      return "seed-ecat-monitors"
    if (t === EquipmentType.PRINTER || t === EquipmentType.SCANNER) return "seed-ecat-print"
    if (t === EquipmentType.NETWORK_DEVICE) return "seed-ecat-network"
    return "seed-ecat-peripheral"
  }

  const eqRows = await prisma.equipment.findMany({
    select: { id: true, type: true, categoryId: true, equipmentKindId: true },
  })
  for (const row of eqRows) {
    const kindId = kindsByEnum.get(row.type)
    const patch: { equipmentKindId?: string; categoryId?: string } = {}
    if (kindId && !row.equipmentKindId) patch.equipmentKindId = kindId
    if (!row.categoryId) patch.categoryId = defaultEquipmentCategoryId(row.type)
    if (Object.keys(patch).length > 0) {
      await prisma.equipment.update({ where: { id: row.id }, data: patch })
    }
  }

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
