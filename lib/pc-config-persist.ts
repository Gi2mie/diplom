import {
  ComponentType,
  EquipmentStatus,
  EquipmentType,
  Prisma,
  SoftwareCatalogCategory,
  SoftwareLicenseKind,
} from "@prisma/client"
import { z } from "zod"
import { db } from "@/lib/db"
import { mapComputerEquipment, type ComputerEquipmentWithRelations } from "@/lib/pc-config-map"

export const pcConfigSaveSchema = z.object({
  workstationId: z.string().min(1),
  name: z.string(),
  inventoryNumber: z.string(),
  status: z.enum(["active", "repair", "decommissioned"]),
  notes: z.string(),
  purchaseDate: z.string(),
  warrantyEnd: z.string(),
  cpuModel: z.string(),
  cpuCores: z.coerce.number(),
  cpuFrequency: z.string(),
  ramSize: z.coerce.number(),
  ramType: z.string(),
  ramFrequency: z.string(),
  storageType: z.string(),
  storageSize: z.coerce.number(),
  hasSecondaryStorage: z.boolean(),
  secondaryStorageType: z.string(),
  secondaryStorageSize: z.coerce.number(),
  gpuModel: z.string(),
  gpuMemory: z.coerce.number(),
  motherboardModel: z.string(),
  networkType: z.string(),
  macAddress: z.string(),
  ipAddress: z.string(),
  osName: z.enum(["Windows", "macOS", "Linux"]),
  osVersion: z.string(),
})

export type PcConfigSavePayload = z.infer<typeof pcConfigSaveSchema>

export function parsePcConfigSaveBody(
  data: unknown
):
  | { ok: true; payload: PcConfigSavePayload }
  | { ok: false; error: string } {
  const r = pcConfigSaveSchema.safeParse(data)
  if (!r.success) {
    const msg = r.error.issues[0]?.message ?? "Неверные данные"
    return { ok: false, error: msg }
  }
  return { ok: true, payload: r.data }
}

/** RM-222-01 → PC-222-01; иначе PC-{код}, если ещё не с префиксом PC- */
export function pcNameFromWorkstationCode(code: string): string {
  const c = code.trim()
  if (!c) return ""
  if (/^RM-/i.test(c)) return c.replace(/^RM-/i, "PC-")
  if (/^PC-/i.test(c)) return c
  return `PC-${c}`
}

export function uiStatusToEquipment(
  status: PcConfigSavePayload["status"]
): { status: EquipmentStatus; isActive: boolean } {
  switch (status) {
    case "active":
      return { status: EquipmentStatus.OPERATIONAL, isActive: true }
    case "repair":
      return { status: EquipmentStatus.IN_REPAIR, isActive: false }
    case "decommissioned":
      return { status: EquipmentStatus.DECOMMISSIONED, isActive: false }
  }
}

function diskComponentType(storageType: string): ComponentType {
  return storageType.toLowerCase().includes("hdd") ? ComponentType.HDD : ComponentType.SSD
}

function parseDate(s: string): Date | null {
  const t = s?.trim()
  if (!t) return null
  const d = new Date(t)
  return Number.isNaN(d.getTime()) ? null : d
}

function jsonSpecs(obj: Record<string, unknown>): Prisma.InputJsonValue {
  return obj as Prisma.InputJsonValue
}

function buildComponents(equipmentId: string, p: PcConfigSavePayload): Prisma.ComponentCreateManyInput[] {
  const rows: Prisma.ComponentCreateManyInput[] = []

  rows.push({
    equipmentId,
    type: ComponentType.CPU,
    name: p.cpuModel.trim() || "—",
    specifications: jsonSpecs({
      cores: p.cpuCores || 0,
      coresCount: p.cpuCores || 0,
      frequency: p.cpuFrequency || "—",
      baseClock: p.cpuFrequency || "—",
    }),
  })

  rows.push({
    equipmentId,
    type: ComponentType.RAM,
    name: `ОЗУ ${p.ramSize || 0} ГБ ${p.ramType || ""}`.trim(),
    specifications: jsonSpecs({
      sizeGb: p.ramSize || 0,
      ddrType: p.ramType || "—",
      frequency: p.ramFrequency || "—",
    }),
  })

  if (p.storageSize > 0) {
    const st = (p.storageType || "SSD").trim() || "SSD"
    rows.push({
      equipmentId,
      type: diskComponentType(st),
      name: st,
      specifications: jsonSpecs({ sizeGb: p.storageSize, capacityGb: p.storageSize }),
    })
  }

  if (p.hasSecondaryStorage && p.secondaryStorageSize > 0) {
    const st = (p.secondaryStorageType || "HDD").trim() || "HDD"
    rows.push({
      equipmentId,
      type: diskComponentType(st),
      name: st,
      specifications: jsonSpecs({
        sizeGb: p.secondaryStorageSize,
        capacityGb: p.secondaryStorageSize,
      }),
    })
  }

  rows.push({
    equipmentId,
    type: ComponentType.GPU,
    name: p.gpuModel.trim() || "—",
    specifications: jsonSpecs({ memoryGb: p.gpuMemory || 0 }),
  })

  rows.push({
    equipmentId,
    type: ComponentType.MOTHERBOARD,
    name: p.motherboardModel.trim() || "—",
  })

  rows.push({
    equipmentId,
    type: ComponentType.NETWORK_CARD,
    name: p.networkType.trim() || "—",
    specifications: jsonSpecs({
      macAddress: p.macAddress || "—",
      ipAddress: p.ipAddress || "—",
    }),
  })

  return rows
}

async function syncOsSoftware(
  tx: Prisma.TransactionClient,
  equipmentId: string,
  osName: string,
  osVersion: string
) {
  const full = [osName, osVersion].filter((x) => x?.trim()).join(" ").trim()
  if (!full || full === "—") return

  const soft = await tx.software.upsert({
    where: { name_version: { name: full, version: "" } },
    create: {
      name: full,
      version: "",
      category: SoftwareCatalogCategory.OTHER,
      licenseKind: SoftwareLicenseKind.FREE,
    },
    update: {},
  })

  await tx.installedSoftware.create({
    data: {
      equipmentId,
      softwareId: soft.id,
      version: osVersion?.trim() || null,
    },
  })
}

const computerInclude = {
  workstation: {
    select: {
      id: true,
      code: true,
      pcName: true,
      classroomId: true,
      classroom: {
        select: {
          id: true,
          number: true,
          name: true,
          building: { select: { name: true } },
        },
      },
    },
  },
  components: true,
  software: {
    include: { software: { select: { name: true } } },
  },
} as const

async function loadMappedRow(id: string) {
  const row = await db.equipment.findUnique({
    where: { id },
    include: computerInclude,
  })
  if (!row) return null
  return mapComputerEquipment(row as ComputerEquipmentWithRelations)
}

export async function createComputerConfig(
  p: PcConfigSavePayload
): Promise<{ ok: true; computer: ReturnType<typeof mapComputerEquipment> } | { ok: false; error: string; status: number }> {
  const ws = await db.workstation.findUnique({ where: { id: p.workstationId } })
  if (!ws) return { ok: false, error: "Рабочее место не найдено", status: 400 }

  const inv = p.inventoryNumber.trim()
  if (!inv) return { ok: false, error: "Укажите инвентарный номер", status: 400 }

  const dupInv = await db.equipment.findUnique({ where: { inventoryNumber: inv } })
  if (dupInv) return { ok: false, error: "Инвентарный номер уже занят", status: 409 }

  const dupWs = await db.equipment.findFirst({
    where: {
      workstationId: p.workstationId,
      type: EquipmentType.COMPUTER,
      isActive: true,
    },
  })
  if (dupWs) return { ok: false, error: "На этом рабочем месте уже есть компьютер", status: 409 }

  const displayName = p.name.trim() || pcNameFromWorkstationCode(ws.code)
  const { status, isActive } = uiStatusToEquipment(p.status)

  try {
    const id = await db.$transaction(async (tx) => {
      await tx.workstation.update({
        where: { id: ws.id },
        data: { pcName: displayName },
      })

      const computerKind = await tx.equipmentKind.findFirst({
        where: { mapsToEnum: EquipmentType.COMPUTER },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      })

      const equipment = await tx.equipment.create({
        data: {
          inventoryNumber: inv,
          name: displayName,
          type: EquipmentType.COMPUTER,
          status,
          isActive,
          workstationId: ws.id,
          equipmentKindId: computerKind?.id ?? null,
          purchaseDate: parseDate(p.purchaseDate),
          warrantyUntil: parseDate(p.warrantyEnd),
          description: p.notes.trim() || null,
          model: p.cpuModel.trim() || null,
        },
      })

      const comps = buildComponents(equipment.id, p)
      await tx.component.createMany({ data: comps })
      await syncOsSoftware(tx, equipment.id, p.osName, p.osVersion)

      return equipment.id
    })

    const computer = await loadMappedRow(id)
    if (!computer) return { ok: false, error: "Не удалось прочитать созданную запись", status: 500 }
    return { ok: true, computer }
  } catch (e) {
    console.error("createComputerConfig", e)
    return { ok: false, error: "Ошибка при сохранении", status: 500 }
  }
}

export async function updateComputerConfig(
  equipmentId: string,
  p: PcConfigSavePayload
): Promise<{ ok: true; computer: ReturnType<typeof mapComputerEquipment> } | { ok: false; error: string; status: number }> {
  const existing = await db.equipment.findUnique({
    where: { id: equipmentId },
  })
  if (!existing || existing.type !== EquipmentType.COMPUTER) {
    return { ok: false, error: "Компьютер не найден", status: 404 }
  }

  const ws = await db.workstation.findUnique({ where: { id: p.workstationId } })
  if (!ws) return { ok: false, error: "Рабочее место не найдено", status: 400 }

  const inv = p.inventoryNumber.trim()
  if (!inv) return { ok: false, error: "Укажите инвентарный номер", status: 400 }

  const dupInv = await db.equipment.findFirst({
    where: { inventoryNumber: inv, NOT: { id: equipmentId } },
  })
  if (dupInv) return { ok: false, error: "Инвентарный номер уже занят", status: 409 }

  const dupWs = await db.equipment.findFirst({
    where: {
      workstationId: p.workstationId,
      type: EquipmentType.COMPUTER,
      isActive: true,
      NOT: { id: equipmentId },
    },
  })
  if (dupWs) return { ok: false, error: "На этом рабочем месте уже есть другой компьютер", status: 409 }

  const displayName = p.name.trim() || pcNameFromWorkstationCode(ws.code)
  const { status, isActive } = uiStatusToEquipment(p.status)

  const prevWsId = existing.workstationId

  try {
    await db.$transaction(async (tx) => {
      if (prevWsId && prevWsId !== ws.id) {
        await tx.workstation.update({
          where: { id: prevWsId },
          data: { pcName: null },
        })
      }

      await tx.workstation.update({
        where: { id: ws.id },
        data: { pcName: displayName },
      })

      await tx.equipment.update({
        where: { id: equipmentId },
        data: {
          inventoryNumber: inv,
          name: displayName,
          status,
          isActive,
          workstationId: ws.id,
          purchaseDate: parseDate(p.purchaseDate),
          warrantyUntil: parseDate(p.warrantyEnd),
          description: p.notes.trim() || null,
          model: p.cpuModel.trim() || null,
        },
      })

      await tx.component.deleteMany({ where: { equipmentId } })
      await tx.installedSoftware.deleteMany({ where: { equipmentId } })

      const comps = buildComponents(equipmentId, p)
      await tx.component.createMany({ data: comps })
      await syncOsSoftware(tx, equipmentId, p.osName, p.osVersion)
    })

    const computer = await loadMappedRow(equipmentId)
    if (!computer) return { ok: false, error: "Не удалось прочитать запись", status: 500 }
    return { ok: true, computer }
  } catch (e) {
    console.error("updateComputerConfig", e)
    return { ok: false, error: "Ошибка при сохранении", status: 500 }
  }
}
