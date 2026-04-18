import type { UserRole, UserStatus } from "@prisma/client"
import { demoFillHandoutPasswordPlain } from "@/lib/demo-fill-user-passwords"

/** Вложенный select для Prisma: аудитории, за которые отвечает преподаватель */
export const userResponsibleRoomsSelect = {
  orderBy: { number: "asc" as const },
  select: {
    id: true,
    number: true,
    name: true,
    building: { select: { name: true } },
  },
} as const

export type UserWithResponsibleRooms = {
  id: string
  firstName: string
  lastName: string
  middleName: string | null
  email: string
  phone: string | null
  role: UserRole
  status: UserStatus
  position: string | null
  department: string | null
  createdAt: Date
  lastLoginAt: Date | null
  handoutPasswordPlain?: string | null
  responsibleRooms?: {
    id: string
    number: string
    name: string | null
    building: { name: string } | null
  }[]
}

export function toPublicUserJson(
  user: UserWithResponsibleRooms,
  options?: { includeCredentials?: boolean }
) {
  const { responsibleRooms, handoutPasswordPlain, ...rest } = user
  const base = {
    id: rest.id,
    firstName: rest.firstName,
    lastName: rest.lastName,
    middleName: rest.middleName,
    email: rest.email,
    phone: rest.phone,
    role: rest.role,
    status: rest.status,
    position: rest.position,
    department: rest.department,
    responsibleClassrooms: (responsibleRooms ?? []).map((c) => ({
      id: c.id,
      number: c.number,
      name: c.name,
      building: c.building?.name ?? null,
    })),
    createdAt: rest.createdAt.toISOString(),
    lastLoginAt: rest.lastLoginAt?.toISOString() ?? null,
  }
  if (options?.includeCredentials) {
    return {
      ...base,
      handoutPasswordPlain:
        handoutPasswordPlain ?? demoFillHandoutPasswordPlain(rest.email) ?? null,
    }
  }
  return base
}
