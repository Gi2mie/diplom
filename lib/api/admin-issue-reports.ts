import type { IssuePriority, IssueStatus } from "@prisma/client"
import type { TeacherProblemEquipmentKind } from "@/lib/validators"

export type AdminIssueReportRow = {
  id: string
  title: string
  description: string
  status: IssueStatus
  priority: IssuePriority
  resolution: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  reporter: {
    id: string
    firstName: string
    lastName: string
    middleName: string | null
    email: string
  }
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
  repairs: Array<{
    id: string
    status: string
    equipmentId: string
    equipment: { id: string; name: string; inventoryNumber: string }
  }>
}

export type CreateAdminIssueBody = {
  title: string
  description?: string
  priority: IssuePriority
  classroomId: string
  workstationId?: string | null
  wholeClassroom: boolean
  problemEquipmentKind: TeacherProblemEquipmentKind
}

export type UpdateAdminIssueBody = {
  title?: string
  description?: string
  status?: IssueStatus
  priority?: IssuePriority
  resolution?: string | null
}

export type PostIssueRepairsBody = {
  classroomId: string
  equipmentIds: string[]
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Request failed")
  }
  return data as T
}

export async function fetchAdminIssueReports(): Promise<AdminIssueReportRow[]> {
  const res = await fetch("/api/admin/issue-reports", { cache: "no-store" })
  const data = await parseJson<{ issues: AdminIssueReportRow[] }>(res)
  return data.issues
}

export async function createAdminIssueReport(body: CreateAdminIssueBody): Promise<AdminIssueReportRow> {
  const res = await fetch("/api/admin/issue-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await parseJson<{ issue: AdminIssueReportRow }>(res)
  return data.issue
}

export async function updateAdminIssueReport(
  id: string,
  body: UpdateAdminIssueBody
): Promise<AdminIssueReportRow> {
  const res = await fetch(`/api/admin/issue-reports/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await parseJson<{ issue: AdminIssueReportRow }>(res)
  return data.issue
}

export async function postRepairsForIssue(
  issueId: string,
  body: PostIssueRepairsBody
): Promise<{ issue: AdminIssueReportRow; createdRepairs: number }> {
  const res = await fetch(`/api/admin/issue-reports/${issueId}/repairs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseJson(res)
}

export async function deleteAdminIssueReport(issueId: string): Promise<{ ok: true }> {
  const res = await fetch(`/api/admin/issue-reports/${issueId}`, { method: "DELETE" })
  return parseJson(res)
}
