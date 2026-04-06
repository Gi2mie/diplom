import type { EquipmentStatus, SoftwareLicenseKind } from "@prisma/client"

export type ReportsSummary = {
  totalEquipment: number
  operational: number
  needsCheck: number
  inRepair: number
  decommissioned: number
  activeRepairsCount: number
}

export type ReportsStatusRow = {
  status: EquipmentStatus
  label: string
  count: number
  color: string
  percentage: number
}

export type ReportsInRepairRow = {
  id: string
  name: string
  inventoryNumber: string
  classroomLabel: string
  buildingName: string | null
  workstationCode: string | null
  equipmentStatus: EquipmentStatus
  repairStatus: string | null
  technician: string | null
  startedAt: string | null
}

export type ReportsProblemRow = {
  id: string
  name: string
  type: string
  classroom: string
  problemCount: number
  lastProblem: string
  status: EquipmentStatus
}

export type ReportsClassroomRow = {
  classroomId: string
  classroomNumber: string
  classroomName: string | null
  buildingName: string | null
  totalEquipment: number
  faultyCount: number
  inRepairCount: number
  percentage: number
}

export type ReportsHistoryRow = {
  id: string
  date: string
  kind: "issue" | "repair"
  equipment: string
  inventoryNumber: string
  classroom: string
  description: string
  sysAdminDisplay: string | null
  status: string
}

export type ReportsPcSoftwareRow = {
  equipmentId: string
  name: string
  inventoryNumber: string
  workstationId: string | null
  workstationCode: string | null
  classroomId: string | null
  classroomNumber: string | null
  classroomName: string | null
  buildingId: string | null
  buildingName: string | null
  software: {
    name: string
    version: string
    licenseKind: SoftwareLicenseKind
    licenseType: string | null
  }[]
}

export type ReportsPayload = {
  summary: ReportsSummary
  statusBreakdown: ReportsStatusRow[]
  inRepairEquipment: ReportsInRepairRow[]
  topProblems: ReportsProblemRow[]
  classroomIssues: ReportsClassroomRow[]
  history: ReportsHistoryRow[]
  historyStats: {
    issuesInPeriod: number
    repairsCompletedInPeriod: number
  }
  pcSoftware: ReportsPcSoftwareRow[]
}

function buildQuery(params: Record<string, string | undefined>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, v)
  }
  const s = q.toString()
  return s ? `?${s}` : ""
}

export async function fetchReportsDashboard(filters: {
  dateFrom: string
  dateTo: string
  buildingId?: string
  classroomId?: string
  workstationId?: string
  inventorySearch?: string
}): Promise<ReportsPayload> {
  const res = await fetch(
    `/api/dashboard/reports${buildQuery({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      buildingId:
        filters.buildingId && filters.buildingId !== "all" ? filters.buildingId : undefined,
      classroomId:
        filters.classroomId && filters.classroomId !== "all" ? filters.classroomId : undefined,
      workstationId:
        filters.workstationId && filters.workstationId !== "all"
          ? filters.workstationId
          : undefined,
      inventorySearch: filters.inventorySearch?.trim() || undefined,
    })}`,
    { cache: "no-store" }
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Не удалось загрузить отчёты")
  }
  return data as ReportsPayload
}
