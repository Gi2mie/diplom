import type { PcConfigRow } from "@/lib/pc-config-map"
import type { PcConfigSavePayload } from "@/lib/pc-config-persist"

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error || "Request failed")
  }
  return data as T
}

export async function fetchPcConfigs(): Promise<PcConfigRow[]> {
  const response = await fetch("/api/pc-config", { cache: "no-store" })
  const data = await parseJson<{ computers: PcConfigRow[] }>(response)
  return data.computers
}

export async function createPcConfig(body: PcConfigSavePayload): Promise<PcConfigRow> {
  const response = await fetch("/api/pc-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.error || "Request failed")
  return (data as { computer: PcConfigRow }).computer
}

export async function updatePcConfig(id: string, body: PcConfigSavePayload): Promise<PcConfigRow> {
  const response = await fetch(`/api/pc-config/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.error || "Request failed")
  return (data as { computer: PcConfigRow }).computer
}

export function emptyPcConfigForm(): PcConfigSavePayload {
  return {
    workstationId: "",
    name: "",
    inventoryNumber: "",
    notes: "",
    purchaseDate: "",
    warrantyEnd: "",
    cpuModel: "",
    cpuCores: 4,
    cpuFrequency: "",
    ramSize: 8,
    ramType: "DDR4",
    ramFrequency: "",
    storageType: "SSD NVMe",
    storageSize: 256,
    hasSecondaryStorage: false,
    secondaryStorageType: "HDD",
    secondaryStorageSize: 0,
    gpuModel: "",
    gpuMemory: 0,
    motherboardModel: "",
    networkType: "Ethernet 1Gbps",
    macAddress: "",
    ipAddress: "",
    osName: "Windows",
    osVersion: "",
  }
}

function dashToEmpty(s: string): string {
  return s === "—" ? "" : s
}

function normalizeOsNameForForm(name: string): "Windows" | "macOS" | "Linux" {
  const n = name.trim().toLowerCase()
  if (!n || n === "—") return "Windows"
  if (n.includes("mac")) return "macOS"
  if (n.includes("win")) return "Windows"
  if (n.includes("linux") || n.includes("ubuntu") || n.includes("debian")) return "Linux"
  return "Windows"
}

export function pcRowToForm(pc: PcConfigRow): PcConfigSavePayload {
  return {
    workstationId: pc.workstationId,
    name: pc.name,
    inventoryNumber: pc.inventoryNumber,
    notes: pc.notes,
    purchaseDate: pc.purchaseDate,
    warrantyEnd: pc.warrantyEnd,
    cpuModel: dashToEmpty(pc.cpuModel),
    cpuCores: pc.cpuCores,
    cpuFrequency: dashToEmpty(pc.cpuFrequency),
    ramSize: pc.ramSize,
    ramType: dashToEmpty(pc.ramType),
    ramFrequency: dashToEmpty(pc.ramFrequency),
    storageType: pc.storageType === "—" ? "SSD NVMe" : pc.storageType,
    storageSize: pc.storageSize,
    hasSecondaryStorage: pc.hasSecondaryStorage,
    secondaryStorageType: pc.secondaryStorageType || "HDD",
    secondaryStorageSize: pc.secondaryStorageSize,
    gpuModel: dashToEmpty(pc.gpuModel),
    gpuMemory: pc.gpuMemory,
    motherboardModel: dashToEmpty(pc.motherboardModel),
    networkType: dashToEmpty(pc.networkType),
    macAddress: dashToEmpty(pc.macAddress),
    ipAddress: dashToEmpty(pc.ipAddress),
    osName: normalizeOsNameForForm(pc.osName === "—" ? "" : pc.osName),
    osVersion: pc.osVersion || "",
  }
}

export type { PcConfigRow, PcConfigSavePayload }
