import { EquipmentStatus, WorkstationStatus } from "@prisma/client"

export type ApiWorkstation = {
  id: string
  code: string
  classroomId: string
  name: string
  description: string
  pcName: string
  status: WorkstationStatus
  hasMonitor: boolean
  hasKeyboard: boolean
  hasMouse: boolean
  hasHeadphones: boolean
  hasOtherEquipment: boolean
  otherEquipmentNote: string
  lastMaintenance: string
  classroomNumber: string
  classroomName: string | null
  buildingName: string | null
  equipmentItems: {
    id: string
    name: string
    inventoryNumber: string
    typeEnum: string
    kindName: string | null
    equipmentStatus: EquipmentStatus
    onService: boolean
    /** Активный перенос: номер аудитории, откуда привезли на это РМ */
    relocationFromClassroom: string | null
    installedSoftware: {
      id: string
      softwareName: string
      catalogVersion: string
      installedVersion: string | null
    }[]
  }[]
  /**
   * Оборудование с этого РМ ушло на другое место (активный перенос);
   * в комплектации показывается с подписью «в ауд. …».
   */
  relocatedAwayItems: {
    id: string
    name: string
    inventoryNumber: string
    typeEnum: string
    kindName: string | null
    equipmentStatus: EquipmentStatus
    onService: boolean
    installedSoftware: {
      id: string
      softwareName: string
      catalogVersion: string
      installedVersion: string | null
    }[]
    relocatedToClassroom: string
  }[]
  /** Есть оборудование с активным переносом (отображается как ауд.1->ауд.2) */
  hasRelocatedEquipment: boolean
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error || "Request failed")
  }
  return data as T
}

export async function fetchWorkstations(): Promise<ApiWorkstation[]> {
  const response = await fetch("/api/workstations", { cache: "no-store" })
  const data = await parseJson<{ workstations: ApiWorkstation[] }>(response)
  return data.workstations
}

export type SaveWorkstationBody = {
  code: string
  classroomId: string
  name?: string | null
  description?: string | null
  pcName?: string | null
  hasMonitor?: boolean
  hasKeyboard?: boolean
  hasMouse?: boolean
  hasHeadphones?: boolean
  hasOtherEquipment?: boolean
  otherEquipmentNote?: string | null
  lastMaintenance?: string | null
}

export async function createWorkstationApi(body: SaveWorkstationBody): Promise<void> {
  const response = await fetch("/api/workstations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await parseJson<{ ok: boolean }>(response)
}

export async function updateWorkstationApi(id: string, body: Partial<SaveWorkstationBody>): Promise<void> {
  const response = await fetch(`/api/workstations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await parseJson<{ ok: boolean }>(response)
}

export async function deleteWorkstationApi(id: string): Promise<void> {
  const response = await fetch(`/api/workstations/${id}`, { method: "DELETE" })
  await parseJson<{ ok: boolean }>(response)
}
