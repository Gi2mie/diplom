import { NextResponse } from "next/server"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateClassroomTypeSchema } from "@/lib/validators"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const existing = await db.classroomType.findUnique({ where: { id }, select: { id: true, code: true } })
  if (!existing) {
    return NextResponse.json({ error: "Тип не найден" }, { status: 404 })
  }

  const body = await request.json()
  const parsed = updateClassroomTypeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const d = parsed.data
  if (d.code !== undefined && d.code !== existing.code) {
    const dup = await db.classroomType.findUnique({ where: { code: d.code }, select: { id: true } })
    if (dup) {
      return NextResponse.json({ error: "Тип с таким кодом уже существует" }, { status: 409 })
    }
  }

  await db.classroomType.update({
    where: { id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.code !== undefined ? { code: d.code } : {}),
      ...(d.color !== undefined ? { color: d.color } : {}),
      ...(d.description !== undefined ? { description: d.description ?? "" } : {}),
    },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const n = await db.classroom.count({ where: { classroomTypeId: id } })
  if (n > 0) {
    return NextResponse.json(
      { error: "Нельзя удалить тип, у которого есть аудитории" },
      { status: 400 }
    )
  }

  await db.classroomType.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
