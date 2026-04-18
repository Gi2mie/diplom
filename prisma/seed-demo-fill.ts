/**
 * Дополнительное наполнение БД демо-данными.
 *
 * Именование (поле name): префикс по типу + суффикс из кода РМ (101-01):
 * PC, MN, KB, MS, PRINT, PROE, IND, SCAN, NET, OTH.
 * Инвентарные номера: INV-DEMO-… (всегда INV).
 *
 * Перед наполнением: полная очистка всех таблиц схемы public (кроме _prisma_migrations),
 * затем заново создаются справочники, пользователи демо, аудитории, РМ, оборудование INV-DEMO,
 * заявки на ПО, обращения и ремонты.
 *
 * Не требует `prisma db seed`. Нужны миграции и DATABASE_URL.
 *
 * Внимание: удаляются все данные приложения в этой БД (не только демо-префиксы).
 */
import {
  PrismaClient,
  EquipmentStatus,
  EquipmentType,
  IssuePriority,
  IssueStatus,
  RepairStatus,
  SoftwareCatalogCategory,
  SoftwareLicenseKind,
  SoftwareRequestKind,
  SoftwareRequestStatus,
  UserRole,
  UserStatus,
  WorkstationStatus,
} from "@prisma/client"
import { hash } from "bcryptjs"
import { createComputerConfig, updateComputerConfig } from "../lib/pc-config-persist"
import type { PcConfigSavePayload } from "../lib/pc-config-persist"
import { syncWorkstationKitFromEquipment } from "../lib/workstation-kit-sync"
import { syncWorkstationStatusFromEquipment } from "../lib/workstation-status-sync"
import { classroomPoolWorkstationCode } from "../lib/classroom-pool-workstation"
import { DEMO_FILL_STAFF_PASSWORDS } from "../lib/demo-fill-user-passwords"

const prisma = new PrismaClient()

const INV = "INV-DEMO"

/**
 * Полная очистка данных приложения (PostgreSQL). Таблица миграций Prisma не трогается.
 * Остальные таблицы в `public` обрезаются по списку из каталога — подойдёт при новых моделях.
 */
async function wipeAllApplicationData(): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  )
  if (rows.length === 0) {
    console.warn("В схеме public не найдено таблиц — пропуск TRUNCATE.")
    return
  }
  const quoted = rows
    .map((r) => `"${String(r.tablename).replace(/"/g, '""')}"`)
    .join(", ")
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`)
  console.log(
    `База очищена: TRUNCATE CASCADE для ${rows.length} таблиц в public (без _prisma_migrations).`,
  )
}

const FILL_ROOM_NUMBERS = ["101", "105", "112", "202", "222а", "301", "401", "405"] as const

/** 8 преподавателей демо-наполнения (порядок = индекс ответственности за аудиторию). Пароли — демо, не для прода. */
const FILL_TEACHER_DEFS = [
  {
    email: "zubenkomp@nhtk",
    password: DEMO_FILL_STAFF_PASSWORDS["zubenkomp@nhtk"],
    firstName: "Михаил",
    lastName: "Зубенко",
    middleName: "Петирович",
    phone: "+7(904) 118-44-27",
    position: "Старший преподаватель",
    department: "Кафедра информатики и вычислительной техники",
  },
  {
    email: "yermakovasv@nhtk",
    password: DEMO_FILL_STAFF_PASSWORDS["yermakovasv@nhtk"],
    firstName: "Светлана",
    lastName: "Ермакова",
    middleName: "Викторовна",
    phone: "+7(912) 305-61-92",
    position: "Доцент",
    department: "Кафедра информатики и вычислительной техники",
  },
  {
    email: "galkinpr@nhtk",
    password: DEMO_FILL_STAFF_PASSWORDS["galkinpr@nhtk"],
    firstName: "Павел",
    lastName: "Галкин",
    middleName: "Романович",
    phone: "+7(913) 447-08-15",
    position: "Преподаватель",
    department: "Кафедра программной инженерии",
  },
  {
    email: "stepanovaai@nhtk",
    password: DEMO_FILL_STAFF_PASSWORDS["stepanovaai@nhtk"],
    firstName: "Анна",
    lastName: "Степанова",
    middleName: "Игоревна",
    phone: "+7(923) 219-77-40",
    position: "Преподаватель",
    department: "Кафедра программной инженерии",
  },
  {
    email: "fedorovmy@nhtk",
    password: DEMO_FILL_STAFF_PASSWORDS["fedorovmy@nhtk"],
    firstName: "Максим",
    lastName: "Фёдоров",
    middleName: "Юрьевич",
    phone: "+7(902) 864-12-58",
    position: "Старший преподаватель",
    department: "Кафедра телекоммуникаций",
  },
  {
    email: "melnikop@nhtk",
    password: DEMO_FILL_STAFF_PASSWORDS["melnikop@nhtk"],
    firstName: "Ольга",
    lastName: "Мельник",
    middleName: "Павловна",
    phone: "+7(950) 391-04-33",
    position: "Преподаватель",
    department: "Кафедра телекоммуникаций",
  },
  {
    email: "chernovsn@nhtk",
    password: DEMO_FILL_STAFF_PASSWORDS["chernovsn@nhtk"],
    firstName: "Сергей",
    lastName: "Чернов",
    middleName: "Николаевич",
    phone: "+7(983) 512-90-21",
    position: "Доцент",
    department: "Кафедра электроники и микропроцессорной техники",
  },
  {
    email: "lavroved@nhtk",
    password: DEMO_FILL_STAFF_PASSWORDS["lavroved@nhtk"],
    firstName: "Екатерина",
    lastName: "Лаврова",
    middleName: "Дмитриевна",
    phone: "+7(909) 678-45-06",
    position: "Преподаватель",
    department: "Кафедра электроники и микропроцессорной техники",
  },
] as const

const FILL_ADMIN_DEFS = [
  {
    email: "admin@nhtk",
    password: DEMO_FILL_STAFF_PASSWORDS["admin@nhtk"],
    firstName: "Денис",
    lastName: "Николаев",
    middleName: "Сергеевич",
    phone: "+7(904) 521-09-83",
    position: "Ведущий системный администратор",
    department: "Отдел информационных технологий",
  },
  {
    email: "melnikovaev@nhtk",
    password: DEMO_FILL_STAFF_PASSWORDS["melnikovaev@nhtk"],
    firstName: "Екатерина",
    lastName: "Мельникова",
    middleName: "Владимировна",
    phone: "+7(908) 147-22-61",
    position: "Системный администратор",
    department: "Отдел информационных технологий",
  },
] as const

/** По одной аудитории на преподавателя (индекс в FILL_TEACHER_DEFS) */
const FILL_ROOM_RESPONSIBLE_TEACHER_IDX: Record<(typeof FILL_ROOM_NUMBERS)[number], number> = {
  "101": 0,
  "105": 1,
  "112": 2,
  "202": 3,
  "222а": 4,
  "301": 5,
  "401": 6,
  "405": 7,
}

/**
 * Два администратора и восемь преподавателей для демо (реалистичные ФИО и отдельные пароли в константах выше).
 * Ответственность за аудитории заполняется в teacherIdByRoomNumber.
 */
async function ensureFillStaffUsers(): Promise<{
  teacherIdByRoomNumber: Record<string, string>
  teachersOrdered: { id: string; email: string }[]
  adminsOrdered: { id: string; email: string }[]
}> {
  for (const a of FILL_ADMIN_DEFS) {
    const adminPwd = await hash(a.password, 12)
    await prisma.user.upsert({
      where: { email: a.email },
      update: {
        passwordHash: adminPwd,
        firstName: a.firstName,
        lastName: a.lastName,
        middleName: a.middleName,
        phone: a.phone,
        position: a.position,
        department: a.department,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        isActive: true,
      },
      create: {
        email: a.email,
        passwordHash: adminPwd,
        firstName: a.firstName,
        lastName: a.lastName,
        middleName: a.middleName,
        phone: a.phone,
        position: a.position,
        department: a.department,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        isActive: true,
      },
    })
  }

  for (const t of FILL_TEACHER_DEFS) {
    const teacherPwd = await hash(t.password, 12)
    await prisma.user.upsert({
      where: { email: t.email },
      update: {
        passwordHash: teacherPwd,
        firstName: t.firstName,
        lastName: t.lastName,
        middleName: t.middleName,
        phone: t.phone,
        position: t.position,
        department: t.department,
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
        isActive: true,
      },
      create: {
        email: t.email,
        passwordHash: teacherPwd,
        firstName: t.firstName,
        lastName: t.lastName,
        middleName: t.middleName,
        phone: t.phone,
        position: t.position,
        department: t.department,
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
        isActive: true,
      },
    })
  }

  const adminEmails: string[] = [...FILL_ADMIN_DEFS.map((d) => d.email)]
  const teacherEmails: string[] = [...FILL_TEACHER_DEFS.map((d) => d.email)]

  const [admins, teachers] = await Promise.all([
    prisma.user.findMany({
      where: { email: { in: [...adminEmails] } },
      select: { id: true, email: true },
    }),
    prisma.user.findMany({
      where: { email: { in: [...teacherEmails] } },
      select: { id: true, email: true },
    }),
  ])

  admins.sort((a, b) => adminEmails.indexOf(a.email) - adminEmails.indexOf(b.email))
  teachers.sort((a, b) => teacherEmails.indexOf(a.email) - teacherEmails.indexOf(b.email))

  if (admins.length !== FILL_ADMIN_DEFS.length) {
    throw new Error(`Ожидалось ${FILL_ADMIN_DEFS.length} админов демо-наполнения, найдено ${admins.length}`)
  }
  if (teachers.length !== FILL_TEACHER_DEFS.length) {
    throw new Error(
      `Ожидалось ${FILL_TEACHER_DEFS.length} преподавателей демо-наполнения, найдено ${teachers.length}`,
    )
  }

  const teacherIdByRoomNumber: Record<string, string> = {}
  for (const num of FILL_ROOM_NUMBERS) {
    const idx = FILL_ROOM_RESPONSIBLE_TEACHER_IDX[num]
    teacherIdByRoomNumber[num] = teachers[idx]!.id
  }

  console.log(
    `Персонал демо: ${admins.length} админа (${adminEmails.join(", ")}), ${teachers.length} преподавателей; ответственность по аудиториям ${FILL_ROOM_NUMBERS.join(", ")}.`,
  )

  return { teacherIdByRoomNumber, teachersOrdered: teachers, adminsOrdered: admins }
}

/**
 * Минимальные справочники для вставки оборудования (раньше ожидались из prisma/seed.ts).
 */
async function ensureMinimalCatalogForDemoFill(): Promise<{
  typeClassroom: { id: string }
  typeLab: { id: string }
}> {
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

  console.log(
    "Справочники для демо: типы аудиторий, виды оборудования (BUILTIN_*), категории seed-ecat-*.",
  )

  return {
    typeClassroom: { id: typeClassroom.id },
    typeLab: { id: typeLab.id },
  }
}

function roomDigitsKey(roomNumber: string): string {
  const digits = roomNumber.replace(/\D/g, "")
  return digits || "0"
}

async function seedDemoRequestsIssuesRepairs(args: {
  adminId: string
  /** Ответственный за аудиторию — должен совпадать с requester/reporter в заявках по этой аудитории */
  teacherIdByRoomNumber: Record<string, string>
}): Promise<void> {
  const { adminId, teacherIdByRoomNumber } = args
  const teacher = (room: string) => {
    const id = teacherIdByRoomNumber[room]
    if (!id) throw new Error(`Нет ответственного для аудитории ${room} в teacherIdByRoomNumber`)
    return id
  }

  const classroomByNumber = (number: string) =>
    prisma.classroom.findUnique({ where: { number }, select: { id: true } })

  const workstationBySeat = async (roomNumber: string, seat: number) => {
    const rk = roomDigitsKey(roomNumber)
    const code = `RM-${rk}-${String(seat).padStart(2, "0")}`
    const c = await classroomByNumber(roomNumber)
    if (!c) return null
    return prisma.workstation.findFirst({
      where: { classroomId: c.id, code },
      select: { id: true },
    })
  }

  const pcBySeat = (roomNumber: string, seat: number) => {
    const rk = roomDigitsKey(roomNumber)
    const seatStr = String(seat).padStart(2, "0")
    return prisma.equipment.findFirst({
      where: { inventoryNumber: inv("PC", rk, seatStr) },
      select: { id: true },
    })
  }

  const monitorBySeat = (roomNumber: string, seat: number) => {
    const rk = roomDigitsKey(roomNumber)
    const seatStr = String(seat).padStart(2, "0")
    return prisma.equipment.findFirst({
      where: { inventoryNumber: inv("MN", rk, seatStr) },
      select: { id: true },
    })
  }

  const c112 = await classroomByNumber("112")
  const c105 = await classroomByNumber("105")
  const c301 = await classroomByNumber("301")
  const c401 = await classroomByNumber("401")

  const ws112_02 = await workstationBySeat("112", 2)
  const ws105_05 = await workstationBySeat("105", 5)
  const ws301_01 = await workstationBySeat("301", 1)

  if (c112 && ws112_02) {
    await prisma.softwareRequest.create({
      data: {
        kind: SoftwareRequestKind.INSTALL,
        softwareName: "LibreOffice",
        softwareVersion: "24.2",
        description:
          "Установить офисный пакет на рабочее место студента для курсовой работы (демо-заявка).",
        classroomId: c112.id,
        workstationId: ws112_02.id,
        wholeClassroom: false,
        priority: IssuePriority.HIGH,
        status: SoftwareRequestStatus.PENDING,
        requesterId: teacher("112"),
      },
    })
  }

  if (c105 && ws105_05) {
    await prisma.softwareRequest.create({
      data: {
        kind: SoftwareRequestKind.UPDATE,
        softwareName: "Google Chrome",
        softwareVersion: "131",
        description: "Обновить браузер до актуальной версии (безопасность, демо).",
        classroomId: c105.id,
        workstationId: ws105_05.id,
        wholeClassroom: false,
        priority: IssuePriority.MEDIUM,
        status: SoftwareRequestStatus.IN_PROGRESS,
        requesterId: teacher("105"),
      },
    })
  }

  if (c301 && ws301_01) {
    await prisma.softwareRequest.create({
      data: {
        kind: SoftwareRequestKind.UNINSTALL,
        softwareName: "7-Zip",
        softwareVersion: "23.01",
        description: "Удалить архиватор по требованию кафедры (демо-заявка).",
        classroomId: c301.id,
        workstationId: ws301_01.id,
        wholeClassroom: false,
        priority: IssuePriority.LOW,
        status: SoftwareRequestStatus.PENDING,
        requesterId: teacher("301"),
      },
    })
  }

  if (c401) {
    await prisma.softwareRequest.create({
      data: {
        kind: SoftwareRequestKind.INSTALL,
        softwareName: "Mozilla Firefox",
        softwareVersion: "latest",
        description: "Развернуть Firefox во всей аудитории для лекций (демо: на весь класс).",
        classroomId: c401.id,
        workstationId: null,
        wholeClassroom: true,
        priority: IssuePriority.MEDIUM,
        status: SoftwareRequestStatus.PENDING,
        requesterId: teacher("401"),
      },
    })
  }

  const eqPc112_3 = await pcBySeat("112", 3)
  const eqMn112_7 = await monitorBySeat("112", 7)
  const eqPc105_4 = await pcBySeat("105", 4)

  if (!eqPc112_3 || !eqMn112_7 || !eqPc105_4) {
    console.warn(
      "Демо обращения/ремонты: часть оборудования не найдена (пропуск по отсутствующим единицам).",
    )
  }

  let issue1: { id: string } | null = null
  let issue2: { id: string } | null = null
  let issue3: { id: string } | null = null

  if (eqPc112_3) {
    issue1 = await prisma.issueReport.create({
      data: {
        equipmentId: eqPc112_3.id,
        reporterId: teacher("112"),
        title: "ПК не выходит на загрузку ОС",
        description:
          "После обновления драйверов монитор показывает POST, далее чёрный экран. Демо-обращение.",
        status: IssueStatus.NEW,
        priority: IssuePriority.CRITICAL,
      },
    })
  }

  if (eqMn112_7) {
    issue2 = await prisma.issueReport.create({
      data: {
        equipmentId: eqMn112_7.id,
        reporterId: teacher("112"),
        title: "Мерцание изображения на мониторе",
        description: "На ярких участках заметны полосы и мерцание, демо-обращение.",
        status: IssueStatus.IN_PROGRESS,
        priority: IssuePriority.HIGH,
      },
    })
  }

  if (eqPc105_4) {
    issue3 = await prisma.issueReport.create({
      data: {
        equipmentId: eqPc105_4.id,
        reporterId: teacher("105"),
        title: "Низкая скорость диска",
        description: "Система долго откликается, подозрение на накопитель, демо-обращение.",
        status: IssueStatus.NEW,
        priority: IssuePriority.MEDIUM,
      },
    })
  }

  if (issue1 && eqPc112_3) {
    await prisma.repair.create({
      data: {
        equipmentId: eqPc112_3.id,
        issueReportId: issue1.id,
        assignedToId: adminId,
        createdById: adminId,
        status: RepairStatus.IN_PROGRESS,
        description: "Диагностика цепи питания и видеовыхода",
        diagnosis: "Предварительно: проверка БП и RAM.",
        startedAt: new Date(),
      },
    })
  }

  if (issue2 && eqMn112_7) {
    await prisma.repair.create({
      data: {
        equipmentId: eqMn112_7.id,
        issueReportId: issue2.id,
        assignedToId: adminId,
        createdById: adminId,
        status: RepairStatus.PLANNED,
        description: "Замена кабеля DisplayPort / проверка видеовыхода",
      },
    })
  }

  if (issue3 && eqPc105_4) {
    await prisma.repair.create({
      data: {
        equipmentId: eqPc105_4.id,
        issueReportId: issue3.id,
        assignedToId: adminId,
        createdById: adminId,
        status: RepairStatus.PLANNED,
        description: "Проверка SMART накопителя, при необходимости замена",
      },
    })
  }

  console.log("Добавлены демо-заявки на ПО, обращения о неисправностях и активные ремонты.")
}

/** Суффикс из кода РМ: RM-101-05 → 101-05 (единообразно для всех префиксов) */
function rmSuffix(wsCode: string): string {
  return wsCode.trim().replace(/^RM-?/i, "").replace(/^-+/, "")
}

/** Наименование по типу оборудования: «ПРЕФИКС-суффикс_из_РМ» */
function equipmentName(type: EquipmentType, wsCode: string, extra?: "kbd" | "mouse"): string {
  const s = rmSuffix(wsCode)
  switch (type) {
    case EquipmentType.COMPUTER:
      return `PC-${s}`
    case EquipmentType.INTERACTIVE_BOARD:
      return `IND-${s}`
    case EquipmentType.MONITOR:
      return `MN-${s}`
    case EquipmentType.PERIPHERAL:
      return extra === "mouse" ? `MS-${s}` : `KB-${s}`
    case EquipmentType.PRINTER:
      return `PRINT-${s}`
    case EquipmentType.PROJECTOR:
      return `PROE-${s}`
    case EquipmentType.OTHER:
      return `OTH-${s}`
    case EquipmentType.NETWORK_DEVICE:
      return `NET-${s}`
    case EquipmentType.SCANNER:
      return `SCAN-${s}`
    default:
      return `OTH-${s}`
  }
}

function inv(...parts: string[]): string {
  return [INV, ...parts].join("-").replace(/-+/g, "-")
}

async function kindId(t: EquipmentType): Promise<string> {
  const row = await prisma.equipmentKind.findUnique({
    where: { code: `BUILTIN_${t}` },
    select: { id: true },
  })
  if (!row) throw new Error(`Нет BUILTIN_${t}. Запустите скрипт с начала (ensureMinimalCatalogForDemoFill).`)
  return row.id
}

/** Виды для корректного определения клавиатуры/мыши в syncWorkstationKitFromEquipment */
async function ensurePeripheralKindCodes(): Promise<{ keyboardId: string; mouseId: string }> {
  const kb = await prisma.equipmentKind.upsert({
    where: { code: "DEMO_KEYBOARD" },
    update: { name: "Клавиатура USB", mapsToEnum: EquipmentType.PERIPHERAL },
    create: {
      code: "DEMO_KEYBOARD",
      name: "Клавиатура USB",
      mapsToEnum: EquipmentType.PERIPHERAL,
    },
  })
  const ms = await prisma.equipmentKind.upsert({
    where: { code: "DEMO_MOUSE" },
    update: { name: "Мышь USB", mapsToEnum: EquipmentType.PERIPHERAL },
    create: {
      code: "DEMO_MOUSE",
      name: "Мышь USB",
      mapsToEnum: EquipmentType.PERIPHERAL,
    },
  })
  return { keyboardId: kb.id, mouseId: ms.id }
}

function roomOctet(roomNumber: string): number {
  let s = 0
  for (let i = 0; i < roomNumber.length; i++) s = (s + roomNumber.charCodeAt(i) * (i + 1)) % 200
  return 20 + (s % 180)
}

function genMac(roomNumber: string, seat: number): string {
  const a = roomOctet(roomNumber) % 256
  const b = (seat * 17) % 256
  const c = (roomNumber.length * 31 + seat) % 256
  return `02:A0:${a.toString(16).padStart(2, "0").toUpperCase()}:${b.toString(16).padStart(2, "0").toUpperCase()}:${c.toString(16).padStart(2, "0").toUpperCase()}:${(seat % 254).toString(16).padStart(2, "0").toUpperCase()}`
}

function buildPcPayload(
  wsId: string,
  wsCode: string,
  inventoryNumber: string,
  seat: number,
  roomNumber: string
): PcConfigSavePayload {
  const s = rmSuffix(wsCode)
  const ro = roomOctet(roomNumber)
  const ipLast = 100 + ((seat * 3) % 120)
  return {
    workstationId: wsId,
    name: `PC-${s}`,
    inventoryNumber,
    notes: `Учебный ПК, ауд. ${roomNumber}, место ${seat}. Демо-данные, все поля заполнены.`,
    purchaseDate: "2024-08-15",
    warrantyEnd: "2027-08-14",
    cpuModel: "Intel Core i5-12400",
    cpuCores: 6,
    cpuFrequency: "2.5 GHz (до 4.4 GHz Turbo)",
    ramSize: 16,
    ramType: "DDR4-3200",
    ramFrequency: "3200 МГц",
    storageType: "SSD NVMe",
    storageSize: 512,
    hasSecondaryStorage: true,
    secondaryStorageType: "HDD SATA",
    secondaryStorageSize: 1000,
    gpuModel: "Intel UHD Graphics 730",
    gpuMemory: 2,
    motherboardModel: "ASUS Prime B660M-K D4",
    networkType: "Gigabit Ethernet (Intel I219-V)",
    macAddress: genMac(roomNumber, seat),
    ipAddress: `192.168.${ro}.${ipLast}`,
    osName: "Windows",
    osVersion: "11 Pro 23H2",
  }
}

async function removeOrphanComputerOnWs(workstationId: string): Promise<void> {
  const pcs = await prisma.equipment.findMany({
    where: { workstationId, type: EquipmentType.COMPUTER },
    select: { id: true },
  })
  for (const pc of pcs) {
    const [ic, rc] = await Promise.all([
      prisma.issueReport.count({ where: { equipmentId: pc.id } }),
      prisma.repair.count({ where: { equipmentId: pc.id } }),
    ])
    if (ic > 0 || rc > 0) continue
    await prisma.installedSoftware.deleteMany({ where: { equipmentId: pc.id } })
    await prisma.component.deleteMany({ where: { equipmentId: pc.id } })
    await prisma.equipment.delete({ where: { id: pc.id } })
  }
}

async function ensurePcConfig(
  ws: { id: string; code: string },
  roomNumber: string,
  seat: number,
  rk: string
): Promise<void> {
  const seatStr = String(seat).padStart(2, "0")
  const pcInv = inv("PC", rk, seatStr)
  const payload = buildPcPayload(ws.id, ws.code, pcInv, seat, roomNumber)

  await removeOrphanComputerOnWs(ws.id)

  const existing = await prisma.equipment.findFirst({
    where: { workstationId: ws.id, type: EquipmentType.COMPUTER },
  })

  if (!existing) {
    const r = await createComputerConfig(payload)
    if (!r.ok) {
      console.warn(`Не создать ПК ${ws.code}: ${r.error}`)
    }
  } else {
    const r = await updateComputerConfig(existing.id, payload)
    if (!r.ok) {
      console.warn(`Не обновить ПК ${ws.code}: ${r.error}`)
    }
  }
}

async function upsertEquip(args: {
  inventoryNumber: string
  type: EquipmentType
  name: string
  workstationId: string | null
  categoryId: string
  equipmentKindId: string
  manufacturer?: string | null
  model?: string | null
  serialNumber?: string | null
  purchaseDate?: Date | null
  warrantyUntil?: Date | null
  description?: string | null
}): Promise<void> {
  await prisma.equipment.upsert({
    where: { inventoryNumber: args.inventoryNumber },
    update: {
      name: args.name,
      type: args.type,
      workstationId: args.workstationId,
      categoryId: args.categoryId,
      equipmentKindId: args.equipmentKindId,
      manufacturer: args.manufacturer ?? null,
      model: args.model ?? null,
      serialNumber: args.serialNumber ?? null,
      purchaseDate: args.purchaseDate ?? null,
      warrantyUntil: args.warrantyUntil ?? null,
      description: args.description ?? null,
      status: EquipmentStatus.OPERATIONAL,
      isActive: true,
    },
    create: {
      inventoryNumber: args.inventoryNumber,
      name: args.name,
      type: args.type,
      status: EquipmentStatus.OPERATIONAL,
      workstationId: args.workstationId,
      categoryId: args.categoryId,
      equipmentKindId: args.equipmentKindId,
      manufacturer: args.manufacturer ?? null,
      model: args.model ?? null,
      serialNumber: args.serialNumber ?? null,
      purchaseDate: args.purchaseDate ?? null,
      warrantyUntil: args.warrantyUntil ?? null,
      description: args.description ?? null,
      isActive: true,
    },
  })
}

async function main() {
  console.log(
    "Демо-наполнение: полная очистка БД → тестовые данные (РМ, INV-DEMO, заявки, обращения, ремонты).",
  )

  await wipeAllApplicationData()

  const catalog = await ensureMinimalCatalogForDemoFill()

  const { teacherIdByRoomNumber, adminsOrdered } = await ensureFillStaffUsers()
  const admin = adminsOrdered[0]
  if (!admin) {
    console.error("Не удалось загрузить администратора демо-наполнения.")
    process.exit(1)
  }

  const { typeClassroom, typeLab } = catalog

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

  const labBuilding = await prisma.building.upsert({
    where: { id: "seed-building-lab" },
    update: {},
    create: {
      id: "seed-building-lab",
      name: "Лабораторный корпус",
      address: "ул. Учебная, 3",
      floors: 4,
      description: "Лаборатории и мастерские",
    },
  })

  const roomDefs: {
    number: string
    name: string
    buildingId: string
    classroomTypeId: string
    floor: number
    capacity: number
    responsibleId?: string | null
  }[] = [
    {
      number: "101",
      name: "Аудитория 101",
      buildingId: mainBuilding.id,
      classroomTypeId: typeClassroom.id,
      floor: 1,
      capacity: 18,
      responsibleId: teacherIdByRoomNumber["101"],
    },
    {
      number: "105",
      name: "Компьютерный класс 105",
      buildingId: mainBuilding.id,
      classroomTypeId: typeLab.id,
      floor: 1,
      capacity: 22,
      responsibleId: teacherIdByRoomNumber["105"],
    },
    {
      number: "112",
      name: "Лаборатория 112",
      buildingId: labBuilding.id,
      classroomTypeId: typeLab.id,
      floor: 1,
      capacity: 16,
      responsibleId: teacherIdByRoomNumber["112"],
    },
    {
      number: "202",
      name: "Аудитория 202",
      buildingId: mainBuilding.id,
      classroomTypeId: typeClassroom.id,
      floor: 2,
      capacity: 20,
      responsibleId: teacherIdByRoomNumber["202"],
    },
    {
      number: "222а",
      name: "Аудитория 222а",
      buildingId: mainBuilding.id,
      classroomTypeId: typeClassroom.id,
      floor: 2,
      capacity: 14,
      responsibleId: teacherIdByRoomNumber["222а"],
    },
    {
      number: "301",
      name: "Аудитория 301",
      buildingId: mainBuilding.id,
      classroomTypeId: typeClassroom.id,
      floor: 3,
      capacity: 18,
      responsibleId: teacherIdByRoomNumber["301"],
    },
    {
      number: "401",
      name: "Лекционный зал 401",
      buildingId: mainBuilding.id,
      classroomTypeId: typeClassroom.id,
      floor: 4,
      capacity: 28,
      responsibleId: teacherIdByRoomNumber["401"],
    },
    {
      number: "405",
      name: "Аудитория 405",
      buildingId: mainBuilding.id,
      classroomTypeId: typeClassroom.id,
      floor: 4,
      capacity: 16,
      responsibleId: teacherIdByRoomNumber["405"],
    },
  ]

  for (const r of roomDefs) {
    await prisma.classroom.upsert({
      where: { number: r.number },
      update: {
        name: r.name,
        buildingId: r.buildingId,
        classroomTypeId: r.classroomTypeId ?? null,
        floor: r.floor,
        capacity: r.capacity,
        ...(r.responsibleId !== undefined ? { responsibleId: r.responsibleId } : {}),
        listingStatus: "ACTIVE",
        isActive: true,
      },
      create: {
        number: r.number,
        name: r.name,
        buildingId: r.buildingId,
        classroomTypeId: r.classroomTypeId ?? null,
        floor: r.floor,
        capacity: r.capacity,
        responsibleId: r.responsibleId ?? null,
        listingStatus: "ACTIVE",
        isActive: true,
      },
    })
  }

  for (const r of roomDefs) {
    const room = await prisma.classroom.findUnique({
      where: { number: r.number },
      select: { id: true },
    })
    if (!room) continue
    const poolCode = classroomPoolWorkstationCode(r.number)
    await prisma.workstation.upsert({
      where: { classroomId_code: { classroomId: room.id, code: poolCode } },
      update: {},
      create: {
        code: poolCode,
        classroomId: room.id,
        name: poolCode,
        description:
          "Служебное место: оборудование кабинета без отдельного учебного РМ (не учитывается в вместимости).",
        status: WorkstationStatus.ACTIVE,
        hasMonitor: false,
        hasKeyboard: false,
        hasMouse: false,
        hasHeadphones: false,
        hasOtherEquipment: false,
      },
    })
  }

  const cat = {
    computers: "seed-ecat-computers",
    monitors: "seed-ecat-monitors",
    peripheral: "seed-ecat-peripheral",
    print: "seed-ecat-print",
    network: "seed-ecat-network",
  }

  const [
    kMonitor,
    kPrinter,
    kNetwork,
    kProjector,
    kScanner,
    kInteractive,
    kOther,
    peripheralKinds,
  ] = await Promise.all([
    kindId(EquipmentType.MONITOR),
    kindId(EquipmentType.PRINTER),
    kindId(EquipmentType.NETWORK_DEVICE),
    kindId(EquipmentType.PROJECTOR),
    kindId(EquipmentType.SCANNER),
    kindId(EquipmentType.INTERACTIVE_BOARD),
    kindId(EquipmentType.OTHER),
    ensurePeripheralKindCodes(),
  ])

  const kKeyboard = peripheralKinds.keyboardId
  const kMouse = peripheralKinds.mouseId

  const purchase = new Date("2024-06-01")
  const warranty = new Date("2027-05-31")

  const softwareDefs: {
    name: string
    version: string
    vendor?: string | null
    category: SoftwareCatalogCategory
    licenseKind: SoftwareLicenseKind
  }[] = [
    {
      name: "Microsoft Office",
      version: "2021",
      vendor: "Microsoft",
      category: SoftwareCatalogCategory.OFFICE,
      licenseKind: SoftwareLicenseKind.EDUCATIONAL,
    },
    {
      name: "Google Chrome",
      version: "122",
      vendor: "Google",
      category: SoftwareCatalogCategory.UTILITIES,
      licenseKind: SoftwareLicenseKind.FREE,
    },
    {
      name: "Visual Studio Code",
      version: "1.85",
      vendor: "Microsoft",
      category: SoftwareCatalogCategory.DEVELOPMENT,
      licenseKind: SoftwareLicenseKind.FREE,
    },
    {
      name: "7-Zip",
      version: "23.01",
      vendor: "Igor Pavlov",
      category: SoftwareCatalogCategory.UTILITIES,
      licenseKind: SoftwareLicenseKind.FREE,
    },
    {
      name: "Adobe Acrobat Reader",
      version: "2024",
      vendor: "Adobe",
      category: SoftwareCatalogCategory.OFFICE,
      licenseKind: SoftwareLicenseKind.FREE,
    },
  ]

  for (const s of softwareDefs) {
    await prisma.software.upsert({
      where: { name_version: { name: s.name, version: s.version } },
      update: {
        vendor: s.vendor ?? null,
        category: s.category,
        licenseKind: s.licenseKind,
      },
      create: {
        name: s.name,
        version: s.version,
        vendor: s.vendor ?? null,
        category: s.category,
        licenseKind: s.licenseKind,
      },
    })
  }

  const swRows = await prisma.software.findMany({
    where: { OR: softwareDefs.map((d) => ({ name: d.name, version: d.version })) },
    select: { id: true, name: true, version: true },
  })
  const swByKey = new Map(swRows.map((r) => [`${r.name}\0${r.version}`, r.id] as const))

  const syncedWsIds: string[] = []
  let wsCount = 0

  for (const def of roomDefs) {
    const classroom = await prisma.classroom.findUnique({ where: { number: def.number } })
    if (!classroom) continue

    const rk = roomDigitsKey(def.number)
    const seatMax = Math.min(Math.max(def.capacity, 1), 32)

    for (let seat = 1; seat <= seatMax; seat++) {
      const seatStr = String(seat).padStart(2, "0")
      const code = `RM-${rk}-${seatStr}`
      const wsName =
        seat === 1 ? "Рабочее место преподавателя" : `Рабочее место ${seat}`

      const ws = await prisma.workstation.upsert({
        where: { classroomId_code: { classroomId: classroom.id, code } },
        update: {
          name: wsName,
          isActive: true,
          status: WorkstationStatus.ACTIVE,
        },
        create: {
          classroomId: classroom.id,
          code,
          name: wsName,
          status: WorkstationStatus.ACTIVE,
          isActive: true,
        },
      })
      syncedWsIds.push(ws.id)
      wsCount++

      await ensurePcConfig(ws, def.number, seat, rk)

      const pcRow = await prisma.equipment.findFirst({
        where: { workstationId: ws.id, type: EquipmentType.COMPUTER },
        select: { id: true },
      })

      await upsertEquip({
        inventoryNumber: inv("MN", rk, seatStr),
        type: EquipmentType.MONITOR,
        name: equipmentName(EquipmentType.MONITOR, code),
        workstationId: ws.id,
        categoryId: cat.monitors,
        equipmentKindId: kMonitor,
        manufacturer: "LG Electronics",
        model: "24MP400-B",
        serialNumber: `SN-MN-${rk}-${seatStr}-${seat}`,
        purchaseDate: purchase,
        warrantyUntil: warranty,
        description: `Монитор для ${code}, демо-заполнение полей.`,
      })

      await upsertEquip({
        inventoryNumber: inv("KB", rk, seatStr),
        type: EquipmentType.PERIPHERAL,
        name: equipmentName(EquipmentType.PERIPHERAL, code, "kbd"),
        workstationId: ws.id,
        categoryId: cat.peripheral,
        equipmentKindId: kKeyboard,
        manufacturer: "Logitech",
        model: "K120",
        serialNumber: `SN-KB-${rk}-${seatStr}`,
        purchaseDate: purchase,
        warrantyUntil: warranty,
        description: "Проводная клавиатура.",
      })

      await upsertEquip({
        inventoryNumber: inv("MS", rk, seatStr),
        type: EquipmentType.PERIPHERAL,
        name: equipmentName(EquipmentType.PERIPHERAL, code, "mouse"),
        workstationId: ws.id,
        categoryId: cat.peripheral,
        equipmentKindId: kMouse,
        manufacturer: "Logitech",
        model: "M185",
        serialNumber: `SN-MS-${rk}-${seatStr}`,
        purchaseDate: purchase,
        warrantyUntil: warranty,
        description: "Беспроводная мышь.",
      })

      const isTeacher = seat === 1
      if (isTeacher) {
        await upsertEquip({
          inventoryNumber: inv("PROE", rk, seatStr),
          type: EquipmentType.PROJECTOR,
          name: equipmentName(EquipmentType.PROJECTOR, code),
          workstationId: ws.id,
          categoryId: cat.monitors,
          equipmentKindId: kProjector,
          manufacturer: "Epson",
          model: "EB-X51",
          serialNumber: `SN-PROJ-${rk}-${seatStr}`,
          purchaseDate: purchase,
          warrantyUntil: warranty,
          description: "Проектор у места преподавателя.",
        })
      }

      if (pcRow) {
        for (const sd of softwareDefs) {
          const sid = swByKey.get(`${sd.name}\0${sd.version}`)
          if (!sid) continue
          await prisma.installedSoftware.upsert({
            where: { equipmentId_softwareId: { equipmentId: pcRow.id, softwareId: sid } },
            update: {},
            create: { equipmentId: pcRow.id, softwareId: sid },
          })
        }
      }
    }

    if (def.number === "401") {
      const ws401 = await prisma.workstation.findFirst({
        where: {
          classroomId: classroom.id,
          code: `RM-${rk}-01`,
        },
      })
      if (ws401) {
        await upsertEquip({
          inventoryNumber: inv("IND", rk, "01"),
          type: EquipmentType.INTERACTIVE_BOARD,
          name: equipmentName(EquipmentType.INTERACTIVE_BOARD, ws401.code),
          workstationId: ws401.id,
          categoryId: cat.monitors,
          equipmentKindId: kInteractive,
          manufacturer: "Promethean",
          model: "ActivPanel 75",
          serialNumber: `SN-IND-${rk}-01`,
          purchaseDate: purchase,
          warrantyUntil: warranty,
          description: "Интерактивная панель у преподавательского места.",
        })
      }
    }

    if (def.number === "112") {
      const wsT = await prisma.workstation.findFirst({
        where: { classroomId: classroom.id, code: `RM-${rk}-01` },
      })
      if (wsT) {
        await upsertEquip({
          inventoryNumber: inv("SCAN", rk, "01"),
          type: EquipmentType.SCANNER,
          name: equipmentName(EquipmentType.SCANNER, wsT.code),
          workstationId: wsT.id,
          categoryId: cat.print,
          equipmentKindId: kScanner,
          manufacturer: "Canon",
          model: "CanoScan LiDE 400",
          serialNumber: `SN-SCAN-${rk}`,
          purchaseDate: purchase,
          warrantyUntil: warranty,
          description: "Планшетный сканер в лаборатории.",
        })
      }
    }

    if (def.number === "105" || def.number === "112") {
      await upsertEquip({
        inventoryNumber: inv("PRINT", rk, "LAB"),
        type: EquipmentType.PRINTER,
        name: `PRINT-${rk}-LAB`,
        workstationId: null,
        categoryId: cat.print,
        equipmentKindId: kPrinter,
        manufacturer: "HP",
        model: "LaserJet Pro M404dn",
        serialNumber: `SN-PRINT-LAB-${rk}`,
        purchaseDate: purchase,
        warrantyUntil: warranty,
        description: `Сетевой принтер/MFP для аудитории ${def.number} (без привязки к одному РМ).`,
      })
    }

    await upsertEquip({
      inventoryNumber: inv("OTH", rk, "MISC"),
      type: EquipmentType.OTHER,
      name: `OTH-${rk}-MISC`,
      workstationId: null,
      categoryId: cat.peripheral,
      equipmentKindId: kOther,
      manufacturer: "Hyperline",
      model: "Кабельный органайзер, PDU",
      serialNumber: `SN-OTH-${rk}`,
      purchaseDate: purchase,
      warrantyUntil: warranty,
      description: "Прочее оборудование кабельной инфраструктуры аудитории.",
    })
  }

  await upsertEquip({
    inventoryNumber: inv("NET", "CORE", "01"),
    type: EquipmentType.NETWORK_DEVICE,
    name: "NET-CORE-01",
    workstationId: null,
    categoryId: cat.network,
    equipmentKindId: kNetwork,
    manufacturer: "Cisco",
    model: "Catalyst 2960-L",
    serialNumber: "SN-NET-CORE-01",
    purchaseDate: purchase,
    warrantyUntil: warranty,
    description: "Стек ядра локальной сети учебного корпуса.",
  })

  const uniqueWs = [...new Set(syncedWsIds)]
  for (const wid of uniqueWs) {
    await syncWorkstationKitFromEquipment(prisma, wid)
    await syncWorkstationStatusFromEquipment(prisma, wid)
  }

  await seedDemoRequestsIssuesRepairs({ adminId: admin.id, teacherIdByRoomNumber })

  console.log(
    `Готово: РМ с ПК ≈ ${wsCount}, конфигурации ПК, ПО на ПК, оборудование; заявки на ПО / обращения / ремонты пересозданы демо-данными.`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
