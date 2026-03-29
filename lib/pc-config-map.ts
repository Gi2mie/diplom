import { ComponentType, EquipmentStatus, type Component, type Equipment } from "@prisma/client"

type Spec = Record<string, unknown> | null

function readSpec(spec: unknown): Spec {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) return null
  return spec as Spec
}

export type PcConfigRow = {
  id: string
  name: string
  workstationId: string
  classroomId: string
  classroomNumber: string
  classroomDisplayName: string
  buildingName: string | null
  workstationCode: string
  /** Как у записи оборудования: пересчитывается из неисправностей и ремонтов */
  equipmentStatus: EquipmentStatus
  isActiveEquipment: boolean
  cpuModel: string
  cpuCores: number
  cpuFrequency: string
  ramSize: number
  ramType: string
  ramFrequency: string
  storageType: string
  storageSize: number
  hasSecondaryStorage: boolean
  secondaryStorageType: string
  secondaryStorageSize: number
  gpuModel: string
  gpuMemory: number
  motherboardModel: string
  networkType: string
  macAddress: string
  ipAddress: string
  osName: string
  osVersion: string
  inventoryNumber: string
  purchaseDate: string
  warrantyEnd: string
  lastUpdate: string
  notes: string
}

function diskLabel(c: Component): string {
  if (c.type === ComponentType.SSD) {
    const n = (c.name + (c.model ?? "")).toLowerCase()
    return n.includes("nvme") ? "SSD NVMe" : "SSD"
  }
  return "HDD"
}

function diskSizeGb(c: Component | undefined): number {
  if (!c) return 0
  const sp = readSpec(c.specifications)
  const v = sp?.sizeGb ?? sp?.capacityGb
  return typeof v === "number" ? v : typeof v === "string" ? Number.parseFloat(v) || 0 : 0
}

export type ComputerEquipmentWithRelations = Equipment & {
  workstation: {
    id: string
    code: string
    pcName: string | null
    classroomId: string
    classroom: {
      id: string
      number: string
      name: string | null
      building: { name: string } | null
    } | null
  } | null
  components: Component[]
  software: { version: string | null; software: { name: string } }[]
}

export function mapComputerEquipment(e: ComputerEquipmentWithRelations): PcConfigRow {
  const byType = (t: ComponentType) => e.components.filter((c) => c.type === t)

  const cpu = byType(ComponentType.CPU)[0]
  const ramMods = byType(ComponentType.RAM)
  const ssds = byType(ComponentType.SSD)
  const hdds = byType(ComponentType.HDD)
  const gpu = byType(ComponentType.GPU)[0]
  const mb = byType(ComponentType.MOTHERBOARD)[0]
  const net = byType(ComponentType.NETWORK_CARD)[0]

  const cpuSpec = readSpec(cpu?.specifications)
  const ramSum = ramMods.reduce((s, r) => s + diskSizeGb(r), 0)

  let stor1 = ssds[0] ?? hdds[0]
  let stor2: Component | undefined
  if (ssds[0] && hdds[0]) {
    stor1 = ssds[0]
    stor2 = hdds[0]
  } else if (ssds.length >= 2) {
    stor2 = ssds[1]
  } else if (hdds.length >= 2) {
    stor2 = hdds[1]
  }

  const size1 = diskSizeGb(stor1)
  const size2 = diskSizeGb(stor2)

  const ws = e.workstation
  const classroom = ws?.classroom
  const classroomId = classroom?.id ?? ""
  const classroomDisplay = classroom
    ? classroom.name
      ? `${classroom.number} — ${classroom.name}`
      : classroom.number
    : "—"

  const ramFirst = ramMods[0]
  const ramSp = readSpec(ramFirst?.specifications)
  const ramType =
    typeof ramSp?.ddrType === "string"
      ? ramSp.ddrType
      : ramFirst?.name?.includes("DDR5")
        ? "DDR5"
        : ramMods.length
          ? "DDR4"
          : "—"

  const osInst =
    e.software.find((i) => /windows|linux|ubuntu|macos/i.test(i.software.name)) ?? e.software[0]
  const osFull = osInst?.software.name ?? "—"
  const osParts = osFull.split(/\s+/)

  const gpuSpec = readSpec(gpu?.specifications)
  const netSpec = readSpec(net?.specifications)

  return {
    id: e.id,
    name: (ws?.pcName?.trim() || e.name).trim() || e.inventoryNumber,
    workstationId: ws?.id ?? "",
    classroomId,
    classroomNumber: classroom?.number ?? "",
    classroomDisplayName: classroomDisplay,
    buildingName: classroom?.building?.name ?? null,
    workstationCode: ws?.code ?? "—",
    equipmentStatus: e.status,
    isActiveEquipment: e.isActive,
    cpuModel: cpu?.name || e.model || "—",
    cpuCores: Number(cpuSpec?.cores ?? cpuSpec?.coresCount ?? 0) || 0,
    cpuFrequency: String(cpuSpec?.frequency ?? cpuSpec?.baseClock ?? "—"),
    ramSize: ramSum || Number(ramSp?.sizeGb ?? 0) || 0,
    ramType,
    ramFrequency: String(ramSp?.frequency ?? "—"),
    storageType: stor1 ? diskLabel(stor1) : "—",
    storageSize: size1,
    hasSecondaryStorage: Boolean(stor2 && size2 > 0),
    secondaryStorageType: stor2 ? diskLabel(stor2) : "",
    secondaryStorageSize: size2,
    gpuModel: gpu?.name || "—",
    gpuMemory: Number(gpuSpec?.memoryGb ?? 0),
    motherboardModel: mb?.name || "—",
    networkType: net?.name || "—",
    macAddress: String(netSpec?.macAddress ?? "—"),
    ipAddress: String(netSpec?.ipAddress ?? "—"),
    osName: osParts[0] ?? "—",
    osVersion: osInst?.version ?? osParts.slice(1).join(" ") ?? "",
    inventoryNumber: e.inventoryNumber,
    purchaseDate: e.purchaseDate ? e.purchaseDate.toISOString().slice(0, 10) : "",
    warrantyEnd: e.warrantyUntil ? e.warrantyUntil.toISOString().slice(0, 10) : "",
    lastUpdate: e.updatedAt.toISOString().slice(0, 10),
    notes: e.description ?? "",
  }
}
