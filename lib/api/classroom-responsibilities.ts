export type ClassroomOption = {
  id: string
  number: string
  name: string | null
  building: string | null
  responsibleId: string | null
  responsible: { id: string; lastName: string; firstName: string; middleName: string | null } | null
}

export type TeacherWithClassrooms = {
  id: string
  firstName: string
  lastName: string
  middleName: string | null
  email: string
  classrooms: {
    id: string
    number: string
    name: string | null
    building: string | null
  }[]
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error || "Request failed")
  }
  return data as T
}

export async function fetchClassroomResponsibilities(): Promise<{
  teachers: TeacherWithClassrooms[]
  classrooms: ClassroomOption[]
}> {
  const response = await fetch("/api/classroom-responsibilities", { cache: "no-store" })
  return parseJson(response)
}

export async function updateResponsibleClassrooms(
  userId: string,
  classroomIds: string[]
): Promise<void> {
  const response = await fetch(`/api/users/${userId}/responsible-classrooms`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ classroomIds }),
  })
  await parseJson<{ ok: boolean }>(response)
}
