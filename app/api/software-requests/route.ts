import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createSoftwareRequestSchema } from "@/lib/validators"

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

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const where =
    session.user.role === UserRole.ADMIN
      ? {}
      : { classroom: { responsibleId: session.user.id } }

  const requests = await db.softwareRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: listInclude,
  })

  return NextResponse.json({ requests })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.TEACHER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createSoftwareRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const d = parsed.data
  const classroom = await db.classroom.findUnique({
    where: { id: d.classroomId },
    select: { id: true, responsibleId: true },
  })
  if (!classroom) {
    return NextResponse.json({ error: "Аудитория не найдена" }, { status: 400 })
  }

  if (session.user.role === UserRole.TEACHER && classroom.responsibleId !== session.user.id) {
    return NextResponse.json({ error: "Нет доступа к этой аудитории" }, { status: 403 })
  }

  if (!d.wholeClassroom && d.workstationId) {
    const ws = await db.workstation.findUnique({
      where: { id: d.workstationId },
      select: { id: true, classroomId: true },
    })
    if (!ws || ws.classroomId !== d.classroomId) {
      return NextResponse.json({ error: "Рабочее место не относится к выбранной аудитории" }, { status: 400 })
    }
  }

  const row = await db.softwareRequest.create({
    data: {
      kind: d.kind,
      softwareName: d.softwareName.trim(),
      softwareVersion: (d.softwareVersion ?? "").trim(),
      description: (d.description ?? "").trim(),
      classroomId: d.classroomId,
      workstationId: d.wholeClassroom ? null : d.workstationId,
      wholeClassroom: d.wholeClassroom,
      priority: d.priority,
      requesterId: session.user.id,
    },
    include: listInclude,
  })

  return NextResponse.json({ request: row })
}
