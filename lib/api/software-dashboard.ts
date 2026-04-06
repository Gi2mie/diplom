import type { SoftwareCatalogCategory, SoftwareLicenseKind } from "@prisma/client"

export type DashboardSoftwareRow = {
  id: string
  name: string
  version: string
  vendor: string | null
  category: SoftwareCatalogCategory
  licenseKind: SoftwareLicenseKind
  licenseType: string | null
  defaultLicenseKey: string | null
  licenseExpiresAt: string | null
  description: string | null
  installationCount: number
}

export type SoftwareDetailInstallation = {
  id: string
  version: string | null
  licenseKey: string | null
  expiresAt: string | null
  installedAt: string
  workstationId: string | null
  workstationCode: string | null
  workstationName: string | null
  classroomNumber: string | null
  classroomName: string | null
  buildingName: string | null
}

export type SoftwareDetail = {
  id: string
  name: string
  version: string
  vendor: string | null
  category: SoftwareCatalogCategory
  licenseKind: SoftwareLicenseKind
  licenseType: string | null
  defaultLicenseKey: string | null
  licenseExpiresAt: string | null
  description: string | null
  installations: SoftwareDetailInstallation[]
}

export type SoftwareFormBody = {
  name: string
  version?: string
  vendor?: string | null
  category: SoftwareCatalogCategory
  licenseKind: SoftwareLicenseKind
  licenseType?: string | null
  defaultLicenseKey?: string | null
  licenseExpiresAt?: string | Date | null
  description?: string | null
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Request failed")
  }
  return data as T
}

export async function fetchSoftwareDashboardList(params?: {
  search?: string
  category?: SoftwareCatalogCategory | "all"
  licenseKind?: SoftwareLicenseKind | "all"
  workstationId?: string | "all"
}): Promise<DashboardSoftwareRow[]> {
  const sp = new URLSearchParams()
  if (params?.search?.trim()) sp.set("search", params.search.trim())
  if (params?.category && params.category !== "all") sp.set("category", params.category)
  if (params?.licenseKind && params.licenseKind !== "all") sp.set("licenseKind", params.licenseKind)
  if (params?.workstationId && params.workstationId !== "all") sp.set("workstationId", params.workstationId)
  const q = sp.toString()
  const response = await fetch(q ? `/api/software?${q}` : "/api/software", { cache: "no-store" })
  const data = await parseJson<{ software: DashboardSoftwareRow[] }>(response)
  return data.software
}

export async function fetchSoftwareDetail(id: string): Promise<SoftwareDetail> {
  const response = await fetch(`/api/software/${id}`, { cache: "no-store" })
  return parseJson<SoftwareDetail>(response)
}

export async function createSoftwareDashboardApi(body: SoftwareFormBody): Promise<{ id: string }> {
  const response = await fetch("/api/software", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await parseJson<{ ok: boolean; id: string }>(response)
  return { id: data.id }
}

export async function updateSoftwareDashboardApi(id: string, body: Partial<SoftwareFormBody>): Promise<void> {
  const response = await fetch(`/api/software/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await parseJson<{ ok: boolean }>(response)
}

export async function deleteSoftwareDashboardApi(id: string): Promise<void> {
  const response = await fetch(`/api/software/${id}`, { method: "DELETE" })
  await parseJson<{ ok: boolean }>(response)
}

export async function assignSoftwareToWorkstationsApi(
  softwareId: string,
  workstationIds: string[]
): Promise<{ added: number }> {
  const response = await fetch(`/api/software/${softwareId}/installations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workstationIds }),
  })
  return parseJson<{ ok: boolean; added: number }>(response)
}

export async function assignSoftwareToAllWorkstationsApi(softwareId: string): Promise<{ targets: number }> {
  const response = await fetch(`/api/software/${softwareId}/installations/all`, { method: "POST" })
  return parseJson<{ ok: boolean; targets: number }>(response)
}
