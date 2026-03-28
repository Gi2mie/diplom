import type { EquipmentStatus } from "@prisma/client"

export type DashboardEquipmentRow = {
  id: string
  name: string
  inventoryNumber: string
  serialNumber: string | null
  status: EquipmentStatus
  description: string | null
  purchaseDate: string | null
  warrantyUntil: string | null
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
}

export type EquipmentFormPayload = {
  inventoryNumber: string
  name: string
  categoryId: string
  equipmentKindId: string
  status?: EquipmentStatus
  workstationId?: string | null
  serialNumber?: string | null
  description?: string | null
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error || "Request failed")
  }
  return data as T
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
  const data = await parseJson<{ equipment: DashboardEquipmentRow[] }>(response)
  return data.equipment
}

export async function createEquipmentDashboardApi(body: EquipmentFormPayload): Promise<void> {
  const response = await fetch("/api/equipment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await parseJson<{ ok: boolean }>(response)
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
  await parseJson<{ ok: boolean }>(response)
}

export async function deleteEquipmentDashboardApi(id: string): Promise<void> {
  const response = await fetch(`/api/equipment/${id}`, { method: "DELETE" })
  await parseJson<{ ok: boolean }>(response)
}
