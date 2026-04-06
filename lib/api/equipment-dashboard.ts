import type { EquipmentStatus } from "@prisma/client"
import { parseFetchJson } from "@/lib/api/parse-fetch-json"

export type DashboardEquipmentRow = {
  id: string
  name: string
  inventoryNumber: string
  serialNumber: string | null
  status: EquipmentStatus
  description: string | null
  purchaseDate: string | null
  warrantyUntil: string | null
  /** ISO; заполняется при списании; удаление из учёта — не ранее чем через 30 суток. */
  decommissionedAt: string | null
  manufacturer: string | null
  model: string | null
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  equipmentKindId: string | null
  kindName: string | null
  typeEnum: string
  workstationId: string | null
  workstationCode: string | null
  workstationName: string | null
  classroomId: string | null
  classroomNumber: string | null
  classroomName: string | null
  buildingId: string | null
  buildingName: string | null
  /** Если оборудование временно в другой аудитории по журналу: «401->101» */
  relocationRoomsLabel: string | null
}

export type EquipmentFormPayload = {
  inventoryNumber: string
  name: string
  categoryId: string
  equipmentKindId: string
  status?: EquipmentStatus
  workstationId?: string | null
  serialNumber: string
  description?: string | null
}

function buildQuery(params: Record<string, string | undefined>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== "all") q.set(k, v)
  }
  const s = q.toString()
  return s ? `?${s}` : ""
}

export async function fetchEquipmentDashboardList(filters: {
  search?: string
  status?: string
  classroomId?: string
  workstationId?: string
  buildingId?: string
  categoryId?: string
  equipmentKindId?: string
}): Promise<DashboardEquipmentRow[]> {
  const response = await fetch(`/api/equipment${buildQuery(filters)}`, { cache: "no-store" })
  const data = await parseFetchJson<{ equipment: DashboardEquipmentRow[] }>(response)
  return data.equipment
}

export async function createEquipmentDashboardApi(body: EquipmentFormPayload): Promise<void> {
  const response = await fetch("/api/equipment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await parseFetchJson<{ ok: boolean }>(response)
}

export async function updateEquipmentDashboardApi(
  id: string,
  body: Partial<EquipmentFormPayload>
): Promise<void> {
  const response = await fetch(`/api/equipment/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await parseFetchJson<{ ok: boolean }>(response)
}

export async function deleteEquipmentDashboardApi(id: string): Promise<void> {
  const response = await fetch(`/api/equipment/${id}`, { method: "DELETE" })
  await parseFetchJson<{ ok: boolean }>(response)
}
