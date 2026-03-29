import { IssuePriority } from "@prisma/client"

export type MyRequestListItem = {
  key: string
  source: "repair" | "software"
  id: string
  title: string
  description: string
  status: "pending" | "in_progress" | "completed" | "rejected"
  priority: IssuePriority
  classroomLabel: string
  workstationLabel: string | null
  /** Инв. номера привязанного оборудования — для поиска в фильтре */
  inventoryNumbers: string[]
  createdAt: string
  updatedAt: string
  adminComment: string | null
  equipmentType: string | null
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Request failed")
  }
  return data as T
}

export async function fetchMyRequests(): Promise<MyRequestListItem[]> {
  const response = await fetch("/api/my-requests", { cache: "no-store" })
  const data = await parseJson<{ items: MyRequestListItem[] }>(response)
  return data.items
}
