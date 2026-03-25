/**
 * MOCK AUTHENTICATION DATA
 * 
 * Временные mock-данные для разработки без авторизации через БД.
 * Роль выбирается при входе и сохраняется в localStorage.
 * 
 * ДЛЯ ВОССТАНОВЛЕНИЯ АВТОРИЗАЦИИ:
 * 1. Удалить этот файл
 * 2. Вернуть использование реальных сессий в auth-helpers.ts
 * 3. Обновить компоненты для использования useSession из next-auth/react
 */

// Тип роли пользователя (дублируем чтобы не зависеть от Prisma)
export type MockUserRole = "ADMIN" | "TEACHER"

// Ключ для localStorage
const ROLE_STORAGE_KEY = "edutrack_dev_role"

// Mock-пользователь для разработки
export interface MockUser {
  id: string
  email: string
  name: string
  firstName: string
  lastName: string
  middleName: string
  role: MockUserRole
  department: string
  position: string
  phone: string
  createdAt: string
  lastLogin: string
}

// Mock-сессия
export interface MockSession {
  user: MockUser
}

// Mock-пользователь администратора
const mockAdminUser: MockUser = {
  id: "mock-admin-001",
  email: "admin@edutrack.local",
  name: "Системный Администратор Владимирович",
  firstName: "Системный",
  lastName: "Администратор",
  middleName: "Владимирович",
  role: "ADMIN",
  department: "Информационно-технический отдел",
  position: "Системный администратор",
  phone: "+7 (999) 123-45-67",
  createdAt: "2024-01-15",
  lastLogin: "2025-03-25",
}

// Mock-пользователь преподавателя
const mockTeacherUser: MockUser = {
  id: "mock-teacher-001",
  email: "teacher@edutrack.local",
  name: "Петров Иван Сергеевич",
  firstName: "Иван",
  lastName: "Петров",
  middleName: "Сергеевич",
  role: "TEACHER",
  department: "Кафедра информатики и вычислительной техники",
  position: "Старший преподаватель",
  phone: "+7 (999) 987-65-43",
  createdAt: "2024-03-10",
  lastLogin: "2025-03-24",
}

/**
 * Получить сохранённую роль из localStorage (только на клиенте)
 */
export function getSavedRole(): MockUserRole {
  if (typeof window === "undefined") {
    return "ADMIN" // На сервере возвращаем дефолтную роль
  }
  const saved = localStorage.getItem(ROLE_STORAGE_KEY)
  if (saved === "ADMIN" || saved === "TEACHER") {
    return saved
  }
  return "ADMIN" // Дефолтная роль
}

/**
 * Сохранить выбранную роль в localStorage
 */
export function saveRole(role: MockUserRole): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(ROLE_STORAGE_KEY, role)
  }
}

/**
 * Очистить сохранённую роль (при выходе)
 */
export function clearSavedRole(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(ROLE_STORAGE_KEY)
  }
}

/**
 * Получить текущего mock-пользователя на основе сохранённой роли
 */
export function getMockUser(): MockUser {
  const role = getSavedRole()
  return role === "ADMIN" ? mockAdminUser : mockTeacherUser
}

/**
 * Получить mock-пользователя по указанной роли
 */
export function getMockUserByRole(role: MockUserRole): MockUser {
  return role === "ADMIN" ? mockAdminUser : mockTeacherUser
}

/**
 * Получить mock-сессию для разработки
 */
export function getMockSession(): MockSession {
  return {
    user: getMockUser(),
  }
}

/**
 * Проверить mock-права доступа
 */
export type MockPermissions = {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canManageUsers: boolean
  canManageClassrooms: boolean
  canManageEquipment: boolean
  canManageRepairs: boolean
  canCreateIssues: boolean
}

export function getMockPermissions(role: MockUserRole): MockPermissions {
  if (role === "ADMIN") {
    return {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canManageUsers: true,
      canManageClassrooms: true,
      canManageEquipment: true,
      canManageRepairs: true,
      canCreateIssues: true,
    }
  }

  // TEACHER role
  return {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canManageUsers: false,
    canManageClassrooms: false,
    canManageEquipment: false,
    canManageRepairs: false,
    canCreateIssues: true,
  }
}

/**
 * Получить permissions для текущего mock-пользователя
 */
export function getCurrentMockPermissions(): MockPermissions {
  const role = getSavedRole()
  return getMockPermissions(role)
}

/**
 * Текущая роль из localStorage
 */
export function getCurrentDevRole(): MockUserRole {
  return getSavedRole()
}
