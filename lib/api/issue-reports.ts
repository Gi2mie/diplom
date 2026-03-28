import { IssuePriority } from "@prisma/client"
import type { TeacherProblemEquipmentKind } from "@/lib/validators"

export type SubmitTeacherIssueReportBody = {
  title: string
  description?: string
  priority: IssuePriority
  classroomId: string
  workstationId?: string | null
  wholeClassroom: boolean
  problemEquipmentKind: TeacherProblemEquipmentKind
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Request failed")
  }
  return data as T
}

export async function submitTeacherIssueReport(
  body: SubmitTeacherIssueReportBody
): Promise<{ ok: boolean; created: number }> {
  const response = await fetch("/api/issue-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseJson(response)
}
