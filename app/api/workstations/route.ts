import { NextResponse } from "next/server"
import { UserRole, WorkstationStatus } from "@prisma/client"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { createWorkstationSchema } from "@/lib/validators"
import { workstationCodeMatchesClassroom } from "@/lib/workstation-code"

function parseLastMaintenance(v: string | null | undefined): Date | null {
  if (v == null || v === "") return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

async function assertCanAddWorkstation(classroomId: string) {
  const classroom = await db.classroom.findUnique({
    where: { id: classroomId },
    select: { capacity: true, number: true },
  })
  if (!classroom) return { ok: false as const, error: "Аудитория не найдена" }
  if (classroom.capacity == null) return { ok: true as const, classroom }
  const count = await db.workstation.count({ where: { classroomId } })
  if (count >= classroom.capacity) {
    return {
      ok: false as const,
      error: `В аудитории ${classroom.number} уже создано максимальное число рабочих мест (${classroom.capacity}). Добавить ещё одно нельзя.`,
    }
  }
  return { ok: true as const, classroom }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await db.workstation.findMany({
    where:
      session.user.role === UserRole.TEACHER
        ? { classroom: { responsibleId: session.user.id } }
        : undefined,
    orderBy: [{ classroom: { number: "asc" } }, { code: "asc" }],
    include: {
      classroom: {
        select: {
          id: true,
          number: true,
          name: true,
          building: { select: { name: true } },
        },
      },
    },
  })

  return NextResponse.json({
    workstations: rows.map((w) => ({
      id: w.id,
      code: w.code,
      classroomId: w.classroomId,
      name: w.name ?? "",
      description: w.description ?? "",
      pcName: w.pcName ?? "",
      status: w.status,
      hasMonitor: w.hasMonitor,
      hasKeyboard: w.hasKeyboard,
      hasMouse: w.hasMouse,
      hasHeadphones: w.hasHeadphones,
      hasOtherEquipment: w.hasOtherEquipment,
      otherEquipmentNote: w.otherEquipmentNote ?? "",
      lastMaintenance: w.lastMaintenance ? w.lastMaintenance.toISOString().slice(0, 10) : "",
      classroomNumber: w.classroom.number,
      classroomName: w.classroom.name,
      buildingName: w.classroom.building?.name ?? null,
    })),
  })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createWorkstationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const data = parsed.data
  const classroom = await db.classroom.findUnique({
    where: { id: data.classroomId },
    select: { id: true, number: true, capacity: true },
  })
  if (!classroom) {
    return NextResponse.json({ error: "Аудитория не найдена" }, { status: 400 })
  }

  if (!workstationCodeMatchesClassroom(data.code, classroom.number)) {
    return NextResponse.json(
      { error: `Номер должен начинаться с RM-${classroom.number}-` },
      { status: 400 }
    )
  }

  const cap = await assertCanAddWorkstation(data.classroomId)
  if (!cap.ok) {
    return NextResponse.json({ error: cap.error }, { status: 409 })
  }

  const dup = await db.workstation.findUnique({
    where: { classroomId_code: { classroomId: data.classroomId, code: data.code } },
  })
  if (dup) {
    return NextResponse.json({ error: "Рабочее место с таким номером уже есть в этой аудитории" }, { status: 409 })
  }

  const lastMaintenance = parseLastMaintenance(data.lastMaintenance ?? undefined)

  await db.workstation.create({
    data: {
      code: data.code,
      classroomId: data.classroomId,
      name: data.name?.trim() || null,
      description: data.description?.trim() || null,
      pcName: data.pcName?.trim() || null,
      status: data.status ?? WorkstationStatus.ACTIVE,
      hasMonitor: data.hasMonitor ?? false,
      hasKeyboard: data.hasKeyboard ?? false,
      hasMouse: data.hasMouse ?? false,
      hasHeadphones: data.hasHeadphones ?? false,
      hasOtherEquipment: data.hasOtherEquipment ?? false,
      otherEquipmentNote: data.hasOtherEquipment
        ? String(data.otherEquipmentNote ?? "").trim() || null
        : null,
      lastMaintenance,
    },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
