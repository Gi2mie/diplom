import { NextResponse } from "next/server"
import { SoftwareRequestStatus, UserRole } from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { assertSoftwareRequestPermanentDeleteAllowed } from "@/lib/request-deletion-policy"
import { updateSoftwareRequestSchema } from "@/lib/validators"

const listInclude = {
  classroom: {
    select: {
      id: true,
      number: true,
      name: true,
      building: { select: { name: true } },
    },
  },
  workstation: { select: { id: true, code: true, name: true } },
  requester: {
    select: { id: true, firstName: true, lastName: true, middleName: true },
  },
} as const

async function findVisible(id: string, userId: string, role: UserRole) {
  const row = await db.softwareRequest.findUnique({
    where: { id },
    include: listInclude,
  })
  if (!row) return { row: null as null, forbidden: false }
  if (role === UserRole.ADMIN) return { row, forbidden: false }
  const classroom = await db.classroom.findUnique({
    where: { id: row.classroomId },
    select: { responsibleId: true },
  })
  if (classroom?.responsibleId !== userId) return { row: null, forbidden: true }
  return { row, forbidden: false }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const { row, forbidden } = await findVisible(id, session.user.id, session.user.role as UserRole)
  if (forbidden) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (!row) return NextResponse.json({ error: "Не найдено" }, { status: 404 })

  return NextResponse.json({ request: row })
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  const existing = await db.softwareRequest.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 })
  }

  const body = await request.json()
  const parsed = updateSoftwareRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const u = parsed.data
  const row = await db.softwareRequest.update({
    where: { id },
    data: {
      ...(u.status !== undefined ? { status: u.status } : {}),
      ...(u.adminComment !== undefined ? { adminComment: u.adminComment } : {}),
      ...(u.priority !== undefined ? { priority: u.priority } : {}),
    },
    include: listInclude,
  })

  return NextResponse.json({ request: row })
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await db.softwareRequest.findUnique({
    where: { id },
    select: {
      id: true,
      requesterId: true,
      status: true,
      classroomId: true,
      updatedAt: true,
    },
  })
  if (!existing) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 })
  }

  if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.TEACHER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (session.user.role === UserRole.ADMIN) {
    const allowed = assertSoftwareRequestPermanentDeleteAllowed({
      status: existing.status,
      updatedAt: new Date(existing.updatedAt),
    })
    if (!allowed.ok) {
      return NextResponse.json({ error: allowed.error }, { status: 400 })
    }
    await db.softwareRequest.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }

  const classroom = await db.classroom.findUnique({
    where: { id: existing.classroomId },
    select: { responsibleId: true },
  })
  const isResponsible = classroom?.responsibleId === session.user.id
  const isOwn = existing.requesterId === session.user.id
  if (!isResponsible || !isOwn || existing.status !== SoftwareRequestStatus.PENDING) {
    return NextResponse.json({ error: "Удалить можно только свою заявку со статусом «Не начато»" }, { status: 403 })
  }

  await db.softwareRequest.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
