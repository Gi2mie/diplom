import type { EquipmentType } from "@prisma/client"
import { parseFetchJson } from "@/lib/api/parse-fetch-json"

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

export async function fetchEquipmentRegistry(): Promise<EquipmentRegistryPayload> {
  const response = await fetch("/api/equipment-registry", { cache: "no-store" })
  return parseFetchJson(response)
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
  await parseFetchJson<{ ok: boolean }>(response)
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
  await parseFetchJson<{ ok: boolean }>(response)
}

export async function deleteEquipmentCategoryApi(
  id: string,
  options?: { unlinkAllEquipment?: boolean }
): Promise<void> {
  const qs = options?.unlinkAllEquipment ? "?unlinkAllEquipment=1" : ""
  const response = await fetch(`/api/equipment-categories/${id}${qs}`, { method: "DELETE" })
  await parseFetchJson<{ ok: boolean }>(response)
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
  await parseFetchJson<{ ok: boolean }>(response)
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
  await parseFetchJson<{ ok: boolean }>(response)
}

export async function deleteEquipmentKindApi(
  id: string,
  options?: { unlinkAllEquipment?: boolean }
): Promise<void> {
  const qs = options?.unlinkAllEquipment ? "?unlinkAllEquipment=1" : ""
  const response = await fetch(`/api/equipment-kinds/${id}${qs}`, { method: "DELETE" })
  await parseFetchJson<{ ok: boolean }>(response)
}
