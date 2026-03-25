"use client"

/**
 * ROLE GUARD COMPONENTS
 * 
 * ВРЕМЕННО: Используются mock-данные для проверки ролей.
 * Компоненты работают на основе текущей mock-роли из lib/mock-auth.ts
 * 
 * ДЛЯ ВОССТАНОВЛЕНИЯ АВТОРИЗАЦИИ:
 * 1. Раскомментировать useSession из "next-auth/react"
 * 2. Заменить getMockSession на useSession
 * 3. Вернуть проверку status === "loading"
 */

import type { ReactNode } from "react"
import { getMockSession, type MockUserRole } from "@/lib/mock-auth"

// ОРИГИНАЛЬНЫЙ КОД (закомментирован):
// import { useSession } from "next-auth/react"
// import type { UserRole } from "@prisma/client"

type RoleGuardProps = {
  children: ReactNode
  allowedRoles: MockUserRole[]
  fallback?: ReactNode
}

/**
 * Client-side role guard component
 * Use for conditional rendering based on user role
 */
export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  // ВРЕМЕННО: Используем mock-сессию
  const session = getMockSession()
  
  // ОРИГИНАЛЬНЫЙ КОД:
  // const { data: session, status } = useSession()
  // if (status === "loading") return null

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
