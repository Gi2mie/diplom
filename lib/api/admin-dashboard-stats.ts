export type AdminDashboardStats = {
  totalEquipment: number
  workingEquipment: number
  faultyEquipment: number
  inRepairEquipment: number
  equipmentDecommissioned: number
  equipmentNotInUse: number
  totalClassrooms: number
  totalWorkstations: number
  openRequests: number
  pendingRequests: number
  inProgressRequests: number
  completedRequestsThisMonth: number
  totalUsers: number
  activeRepairs: number
  softwareCount: number
}

export type AdminDashboardRecentIssue = {
  id: string
  title: string
  classroom: string
  status: "pending" | "in_progress" | "completed" | "rejected"
  date: string
  priority: "low" | "medium" | "high"
  author: string
}

export type AdminDashboardStatsPayload = {
  stats: AdminDashboardStats
  recentIssues: AdminDashboardRecentIssue[]
}

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStatsPayload> {
  const res = await fetch("/api/admin/dashboard-stats", { credentials: "include" })
  const text = await res.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error("Некорректный ответ сервера")
  }
  if (!res.ok) {
    const msg =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error?: string }).error === "string"
        ? (data as { error: string }).error
        : "Не удалось загрузить данные панели"
    throw new Error(msg)
  }
  return data as AdminDashboardStatsPayload
}
