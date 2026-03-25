import { auth } from "@/lib/auth"

export async function getCurrentUser() {
  const session = await auth()
  return session?.user || null
}

export async function getCurrentSession() {
  return await auth()
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: "Администратор",
    TEACHER: "Преподаватель",
  }
  return labels[role] || role
}

export function hasAdminAccess(role: string): boolean {
  return role === "ADMIN"
}

export function hasTeacherAccess(role: string): boolean {
  return role === "TEACHER" || role === "ADMIN"
}

export async function requireAuth() {
  const session = await auth()
  if (!session) {
    throw new Error("Not authenticated")
  }
  return session
}

export async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Admin access required")
  }
  return session
}

