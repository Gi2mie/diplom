import type { RepairStatus } from "@prisma/client"

export type DashboardRepairRow = {
  id: string
  status: RepairStatus
  description: string
  diagnosis: string | null
  workPerformed: string | null
  partsUsed: string | null
  cost: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  equipment: {
    id: string
    name: string
    inventoryNumber: string
    workstation: {
      id: string
      code: string
      name: string | null
      classroom: {
        id: string
        number: string
        name: string | null
        building: { name: string } | null
      }
    } | null
  }
  issueReport: { id: string; title: string; status: string } | null
  assignedTo: {
    id: string
    firstName: string
    lastName: string
    middleName: string | null
  } | null
  createdBy: {
    id: string
    firstName: string
    lastName: string
    middleName: string | null
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Request failed")
  }
  return data as T
}

export async function fetchDashboardRepairs(options?: { activeOnly?: boolean }): Promise<DashboardRepairRow[]> {
  const q = options?.activeOnly ? "?active=1" : ""
  const res = await fetch(`/api/repairs${q}`, { cache: "no-store" })
  const data = await parseJson<{ repairs: DashboardRepairRow[] }>(res)
  return data.repairs
}

export async function patchRepairStatus(id: string, status: DashboardRepairRow["status"]): Promise<DashboardRepairRow> {
  const res = await fetch(`/api/repairs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })
  const data = await parseJson<{ repair: DashboardRepairRow }>(res)
  return data.repair
}
