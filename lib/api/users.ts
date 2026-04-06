export type UsersListMeta = {
  adminsTotal: number
  blockedTotal: number
}

export type ResponsibleClassroomItem = {
  id: string
  number: string
  name: string | null
  building: string | null
}

export type UserListItem = {
  id: string
  firstName: string
  lastName: string
  middleName: string | null
  email: string
  phone: string | null
  role: "ADMIN" | "TEACHER"
  status: "ACTIVE" | "INACTIVE" | "BLOCKED"
  position: string | null
  department: string | null
  responsibleClassrooms: ResponsibleClassroomItem[]
  createdAt: string
  lastLoginAt: string | null
  /** Только у администратора: пароль для выдачи (последний заданный при создании/смене). */
  handoutPasswordPlain?: string | null
}

export type CreateUserPayload = {
  firstName: string
  lastName: string
  middleName?: string
  email: string
  phone?: string
  role: "ADMIN" | "TEACHER"
  status: "ACTIVE" | "BLOCKED"
  position?: string
  department?: string
  password: string
}

export type UpdateUserPayload = Partial<CreateUserPayload>

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error || "Request failed")
  }
  return data as T
}

export async function fetchUsers(): Promise<{ users: UserListItem[]; meta: UsersListMeta }> {
  const response = await fetch("/api/users", { cache: "no-store" })
  const data = await parseJson<{ users: UserListItem[]; meta: UsersListMeta }>(response)
  return { users: data.users, meta: data.meta }
}

export async function fetchUserById(id: string): Promise<UserListItem> {
  const response = await fetch(`/api/users/${id}`, { cache: "no-store" })
  const data = await parseJson<{ user: UserListItem }>(response)
  return data.user
}

export async function createUser(payload: CreateUserPayload): Promise<UserListItem> {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await parseJson<{ user: UserListItem }>(response)
  return data.user
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<UserListItem> {
  const response = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await parseJson<{ user: UserListItem }>(response)
  return data.user
}

