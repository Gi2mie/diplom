import type { ClassroomListingStatus } from "@prisma/client"

export type ClassroomRegistryStats = {
  totalClassrooms: number
  totalWorkstations: number
  totalBuildings: number
  totalTypes: number
}

export type RegistryClassroom = {
  id: string
  number: string
  name: string | null
  floor: number | null
  capacity: number | null
  description: string | null
  listingStatus: ClassroomListingStatus
  buildingId: string | null
  buildingName: string | null
  classroomTypeId: string | null
  typeName: string | null
  typeCode: string | null
  typeColor: string | null
  responsibleId: string | null
  responsibleLabel: string | null
  workstationCount: number
  equipmentCount: number
}

export type RegistryBuilding = {
  id: string
  name: string
  address: string
  floors: number
  description: string | null
  classroomsCount: number
}

export type RegistryClassroomType = {
  id: string
  name: string
  code: string
  color: string
  description: string
  classroomsCount: number
}

export type RegistryTeacher = {
  id: string
  firstName: string
  lastName: string
  middleName: string | null
  email: string
}

export type ClassroomRegistryPayload = {
  stats: ClassroomRegistryStats
  classrooms: RegistryClassroom[]
  buildings: RegistryBuilding[]
  types: RegistryClassroomType[]
  teachers: RegistryTeacher[]
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error || "Request failed")
  }
  return data as T
}

export async function fetchClassroomRegistry(): Promise<ClassroomRegistryPayload> {
  const response = await fetch("/api/classroom-registry", { cache: "no-store" })
  return parseJson(response)
}

export type CreateClassroomBody = {
  number: string
  name?: string | null
  buildingId?: string | null
  classroomTypeId?: string | null
  floor?: number | null
  capacity?: number | null
  description?: string | null
  responsibleId?: string | null
  listingStatus?: ClassroomListingStatus
}

export async function createClassroomApi(body: CreateClassroomBody): Promise<void> {
  const response = await fetch("/api/classrooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await parseJson<{ ok: boolean }>(response)
}

export async function updateClassroomApi(id: string, body: Partial<CreateClassroomBody>): Promise<void> {
  const response = await fetch(`/api/classrooms/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await parseJson<{ ok: boolean }>(response)
}

export async function deleteClassroomApi(id: string): Promise<void> {
  const response = await fetch(`/api/classrooms/${id}`, { method: "DELETE" })
  await parseJson<{ ok: boolean }>(response)
}

export async function createBuildingApi(body: {
  name: string
  address?: string
  floors: number
  description?: string | null
}): Promise<void> {
  const response = await fetch("/api/buildings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await parseJson<{ ok: boolean }>(response)
}

export async function updateBuildingApi(
  id: string,
  body: Partial<{ name: string; address: string; floors: number; description: string | null }>
): Promise<void> {
  const response = await fetch(`/api/buildings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await parseJson<{ ok: boolean }>(response)
}

export async function deleteBuildingApi(id: string): Promise<void> {
  const response = await fetch(`/api/buildings/${id}`, { method: "DELETE" })
  await parseJson<{ ok: boolean }>(response)
}

export async function createClassroomTypeApi(body: {
  name: string
  code: string
  color: string
  description?: string
}): Promise<void> {
  const response = await fetch("/api/classroom-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await parseJson<{ ok: boolean }>(response)
}

export async function updateClassroomTypeApi(
  id: string,
  body: Partial<{ name: string; code: string; color: string; description: string | null }>
): Promise<void> {
  const response = await fetch(`/api/classroom-types/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await parseJson<{ ok: boolean }>(response)
}

export async function deleteClassroomTypeApi(id: string): Promise<void> {
  const response = await fetch(`/api/classroom-types/${id}`, { method: "DELETE" })
  await parseJson<{ ok: boolean }>(response)
}
