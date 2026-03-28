import type { EquipmentType } from "@prisma/client"

export type RegistryEquipmentCategory = {
  id: string
  name: string
  description: string | null
  color: string
  equipmentCount: number
}

export type RegistryEquipmentKind = {
  id: string
  name: string
  description: string | null
  mapsToEnum: EquipmentType
  code: string | null
  equipmentCount: number
}

export type EquipmentRegistryPayload = {
  categories: RegistryEquipmentCategory[]
  kinds: RegistryEquipmentKind[]
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error || "Request failed")
  }
  return data as T
}

export async function fetchEquipmentRegistry(): Promise<EquipmentRegistryPayload> {
  const response = await fetch("/api/equipment-registry", { cache: "no-store" })
  return parseJson(response)
}

export async function createEquipmentCategoryApi(body: {
  name: string
  description?: string | null
  color?: string
}): Promise<void> {
  const response = await fetch("/api/equipment-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await parseJson<{ ok: boolean }>(response)
}

export async function updateEquipmentCategoryApi(
  id: string,
  body: Partial<{ name: string; description: string | null; color: string }>
): Promise<void> {
  const response = await fetch(`/api/equipment-categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await parseJson<{ ok: boolean }>(response)
}

export async function deleteEquipmentCategoryApi(id: string): Promise<void> {
  const response = await fetch(`/api/equipment-categories/${id}`, { method: "DELETE" })
  await parseJson<{ ok: boolean }>(response)
}

export async function createEquipmentKindApi(body: {
  name: string
  description?: string | null
  mapsToEnum: EquipmentType
}): Promise<void> {
  const response = await fetch("/api/equipment-kinds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await parseJson<{ ok: boolean }>(response)
}

export async function updateEquipmentKindApi(
  id: string,
  body: Partial<{ name: string; description: string | null; mapsToEnum: EquipmentType }>
): Promise<void> {
  const response = await fetch(`/api/equipment-kinds/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await parseJson<{ ok: boolean }>(response)
}

export async function deleteEquipmentKindApi(id: string): Promise<void> {
  const response = await fetch(`/api/equipment-kinds/${id}`, { method: "DELETE" })
  await parseJson<{ ok: boolean }>(response)
}
