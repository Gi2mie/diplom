import { NextResponse } from "next/server"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, UserStatus } from "@prisma/client"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id: userId } = await params
  const body = await request.json()
  const raw = body?.classroomIds
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "Ожидается classroomIds: string[]" }, { status: 400 })
  }

  const classroomIds = [...new Set(raw.filter((x: unknown) => typeof x === "string"))]
  if (classroomIds.some((id) => !id?.trim())) {
    return NextResponse.json({ error: "Некорректные идентификаторы аудиторий" }, { status: 400 })
  }

  const teacher = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true },
  })
  if (!teacher) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }
  if (teacher.role !== UserRole.TEACHER) {
    return NextResponse.json(
      { error: "Ответственность по аудиториям назначается только преподавателям" },
      { status: 400 }
    )
  }
  if (teacher.status !== UserStatus.ACTIVE) {
    return NextResponse.json(
      { error: "Нельзя назначать аудитории неактивному или заблокированному пользователю" },
      { status: 400 }
    )
  }

  if (classroomIds.length > 0) {
    const found = await db.classroom.findMany({
      where: { id: { in: classroomIds }, isActive: true },
      select: { id: true },
    })
    if (found.length !== classroomIds.length) {
      return NextResponse.json(
        { error: "Одна или несколько аудиторий не найдены в справочнике" },
        { status: 400 }
      )
    }
  }

  await db.$transaction([
    db.classroom.updateMany({
      where: {
        responsibleId: userId,
        ...(classroomIds.length > 0 ? { id: { notIn: classroomIds } } : {}),
      },
      data: { responsibleId: null },
    }),
    ...(classroomIds.length > 0
      ? [
          db.classroom.updateMany({
            where: { id: { in: classroomIds } },
            data: { responsibleId: userId },
          }),
        ]
      : []),
  ])

  return NextResponse.json({ ok: true })
}
