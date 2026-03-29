/**
 * Дополнительное наполнение БД демо-данными.
 * Не изменяет: software_requests, issue_reports, repairs.
 *
 * Именование (поле name): префикс по типу + суффикс из кода РМ (101-01):
 * PC, MN, KB, MS, PRINT, PROE, IND, SCAN, NET, OTH.
 * Инвентарные номера: INV-DEMO-… (всегда INV).
 *
 * Перед вставкой: удаляются старые строки этого же сида (INV-DEMO- / SEEDFILL-)
 * и пустые РМ в заполняемых аудиториях. Обращения и ремонты не затрагиваются.
 */
import {
  PrismaClient,
  EquipmentStatus,
  EquipmentType,
  SoftwareCatalogCategory,
  SoftwareLicenseKind,
  WorkstationStatus,
  type Prisma,
} from "@prisma/client"
import { createComputerConfig, updateComputerConfig } from "../lib/pc-config-persist"
import type { PcConfigSavePayload } from "../lib/pc-config-persist"
import { syncWorkstationKitFromEquipment } from "../lib/workstation-kit-sync"
import { syncWorkstationStatusFromEquipment } from "../lib/workstation-status-sync"

const prisma = new PrismaClient()

const INV = "INV-DEMO"

/**
 * Удаляет предыдущие записи демо-наполнения в рамках этого скрипта.
 * Не трогает: software_requests, issue_reports, repairs (и оборудование, к которому они привязаны).
 */
async function purgePreviousDemoSeed(roomNumbers: string[]): Promise<void> {
  const managedClassrooms = await prisma.classroom.findMany({
    where: { number: { in: roomNumbers } },
    select: { id: true },
  })
  const managedClassroomIds = managedClassrooms.map((c) => c.id)

  const demoInventoryWhere: Prisma.EquipmentWhereInput = {
    OR: [
      { inventoryNumber: { startsWith: `${INV}-` } },
      { inventoryNumber: { startsWith: "SEEDFILL-" } },
    ],
  }

  const demoEquipment = await prisma.equipment.findMany({
    where: demoInventoryWhere,
    select: {
      id: true,
      inventoryNumber: true,
      _count: { select: { issueReports: true, repairs: true } },
    },
  })

  const blocked = demoEquipment.filter(
    (e) => e._count.issueReports > 0 || e._count.repairs > 0,
  )
  for (const e of blocked) {
    console.warn(
      `Пропуск удаления ${e.inventoryNumber}: есть обращения или ремонты (данные не трогаем).`,
    )
  }

  const deletableIds = demoEquipment
    .filter((e) => e._count.issueReports === 0 && e._count.repairs === 0)
    .map((e) => e.id)

  if (deletableIds.length > 0) {
    await prisma.installedSoftware.deleteMany({ where: { equipmentId: { in: deletableIds } } })
    await prisma.component.deleteMany({ where: { equipmentId: { in: deletableIds } } })
    await prisma.customFieldValue.deleteMany({ where: { equipmentId: { in: deletableIds } } })
    const del = await prisma.equipment.deleteMany({ where: { id: { in: deletableIds } } })
    console.log(`Удалено единиц оборудования (INV-DEMO/SEEDFILL, без заявок): ${del.count}`)
  }

  if (managedClassroomIds.length > 0) {
    const emptyWs = await prisma.workstation.deleteMany({
      where: {
        classroomId: { in: managedClassroomIds },
        equipment: { none: {} },
      },
    })
    if (emptyWs.count > 0) {
      console.log(`Удалено пустых рабочих мест в целевых аудиториях: ${emptyWs.count}`)
    }
  }
}

function roomDigitsKey(roomNumber: string): string {
  const digits = roomNumber.replace(/\D/g, "")
  return digits || "0"
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
  if (!row) throw new Error(`Нет BUILTIN_${t}. Выполните prisma db seed.`)
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
    "Демо-наполнение: максимум РМ с ПК, полные конфигурации ПК, оборудование с префиксами имён, INV… (без заявок на ПО / обращений / ремонтов).",
  )

  const teacher = await prisma.user.findFirst({ where: { email: "teacher@nhtk" } })
  if (!teacher) {
    console.error("Нет teacher@nhtk. Выполните: npx prisma db seed")
    process.exit(1)
  }

  const typeClassroom = await prisma.classroomType.findUnique({ where: { code: "classroom" } })
  const typeLab = await prisma.classroomType.findUnique({ where: { code: "computer_lab" } })

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
    classroomTypeId: string | undefined
    floor: number
    capacity: number
    responsibleId?: string | null
  }[] = [
    {
      number: "101",
      name: "Аудитория 101",
      buildingId: mainBuilding.id,
      classroomTypeId: typeClassroom?.id,
      floor: 1,
      capacity: 18,
      responsibleId: teacher.id,
    },
    {
      number: "105",
      name: "Компьютерный класс 105",
      buildingId: mainBuilding.id,
      classroomTypeId: typeLab?.id,
      floor: 1,
      capacity: 22,
    },
    {
      number: "112",
      name: "Лаборатория 112",
      buildingId: labBuilding.id,
      classroomTypeId: typeLab?.id,
      floor: 1,
      capacity: 16,
      responsibleId: teacher.id,
    },
    {
      number: "202",
      name: "Аудитория 202",
      buildingId: mainBuilding.id,
      classroomTypeId: typeClassroom?.id,
      floor: 2,
      capacity: 20,
    },
    {
      number: "222а",
      name: "Аудитория 222а",
      buildingId: mainBuilding.id,
      classroomTypeId: typeClassroom?.id,
      floor: 2,
      capacity: 14,
    },
    {
      number: "301",
      name: "Аудитория 301",
      buildingId: mainBuilding.id,
      classroomTypeId: typeClassroom?.id,
      floor: 3,
      capacity: 18,
      responsibleId: teacher.id,
    },
    {
      number: "401",
      name: "Лекционный зал 401",
      buildingId: mainBuilding.id,
      classroomTypeId: typeClassroom?.id,
      floor: 4,
      capacity: 28,
    },
    {
      number: "405",
      name: "Аудитория 405",
      buildingId: mainBuilding.id,
      classroomTypeId: typeClassroom?.id,
      floor: 4,
      capacity: 16,
    },
  ]

  await purgePreviousDemoSeed(roomDefs.map((r) => r.number))

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

  console.log(
    `Готово: РМ с ПК ≈ ${wsCount}, конфигурации ПК (все поля + компоненты) через справочник, ПО на ПК, оборудование с полными полями. software_requests / issue_reports / repairs не изменялись.`,
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
