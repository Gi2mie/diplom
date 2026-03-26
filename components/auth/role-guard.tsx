"use client"

/**
 * ROLE GUARD COMPONENTS
 * 
 * Проверка ролей на основе реальной сессии NextAuth.
 */

import type { ReactNode } from "react"
import { useSession } from "next-auth/react"

type RoleGuardProps = {
  children: ReactNode
  allowedRoles: string[]
  fallback?: ReactNode
}

/**
 * Client-side role guard component
 * Use for conditional rendering based on user role
 */
export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { data: session, status } = useSession()
  if (status === "loading") return null

  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Show content only to admins
 */
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={["ADMIN"]} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

/**
 * Show content to teachers only
 */
export function TeacherOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={["TEACHER"]} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}
