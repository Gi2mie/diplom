import {
  IssuePriority,
  SoftwareRequestKind,
  SoftwareRequestStatus,
} from "@prisma/client"

export type SoftwareRequestListRow = {
  id: string
  kind: SoftwareRequestKind
  softwareName: string
  softwareVersion: string
  description: string
  classroomId: string
  workstationId: string | null
  wholeClassroom: boolean
  priority: IssuePriority
  status: SoftwareRequestStatus
  adminComment: string | null
  createdAt: string
  updatedAt: string
  classroom: {
    id: string
    number: string
    name: string | null
    building: { name: string } | null
  }
  workstation: { id: string; code: string; name: string | null } | null
  requester: {
    id: string
    firstName: string
    lastName: string
    middleName: string | null
  }
}

export type CreateSoftwareRequestBody = {
  kind: SoftwareRequestKind
  softwareName: string
  softwareVersion?: string
  description?: string
  classroomId: string
  workstationId?: string | null
  wholeClassroom: boolean
  priority: IssuePriority
}

export type UpdateSoftwareRequestBody = {
  status?: SoftwareRequestStatus
  adminComment?: string | null
  priority?: IssuePriority
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Request failed")
  }
  return data as T
}

export async function fetchSoftwareRequests(): Promise<SoftwareRequestListRow[]> {
  const response = await fetch("/api/software-requests", { cache: "no-store" })
  const data = await parseJson<{ requests: SoftwareRequestListRow[] }>(response)
  return data.requests
}

export async function createSoftwareRequestApi(
  body: CreateSoftwareRequestBody
): Promise<SoftwareRequestListRow> {
  const response = await fetch("/api/software-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await parseJson<{ request: SoftwareRequestListRow }>(response)
  return data.request
}

export async function updateSoftwareRequestApi(
  id: string,
  body: UpdateSoftwareRequestBody
): Promise<SoftwareRequestListRow> {
  const response = await fetch(`/api/software-requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await parseJson<{ request: SoftwareRequestListRow }>(response)
  return data.request
}

export async function deleteSoftwareRequestApi(id: string): Promise<void> {
  const response = await fetch(`/api/software-requests/${id}`, { method: "DELETE" })
  await parseJson<{ ok: boolean }>(response)
}
