import { NextResponse } from "next/server"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateWorkstationSchema } from "@/lib/validators"
import {
  workstationCodeClassroomErrorHint,
  workstationCodeMatchesClassroom,
} from "@/lib/workstation-code"
import {
  isClassroomPoolWorkstation,
  prismaWorkstationsCountingTowardCapacity,
} from "@/lib/classroom-pool-workstation"
import { syncWorkstationStatusFromEquipment } from "@/lib/workstation-status-sync"

function parseLastMaintenance(v: string | null | undefined): Date | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === "") return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

async function assertCapacityForMove(targetClassroomId: string, excludeId: string) {
  const classroom = await db.classroom.findUnique({
    where: { id: targetClassroomId },
    select: { capacity: true, number: true },
  })
  if (!classroom) return { ok: false as const, error: "Аудитория не найдена" }
  if (classroom.capacity == null) return { ok: true as const, classroom }
  const count = await db.workstation.count({
    where: {
      AND: [
        prismaWorkstationsCountingTowardCapacity(targetClassroomId, classroom.number),
        { id: { not: excludeId } },
      ],
    },
  })
  if (count >= classroom.capacity) {
    return {
      ok: false as const,
      error: `В аудитории ${classroom.number} нет свободных мест по вместимости (${classroom.capacity}).`,
    }
  }
  return { ok: true as const, classroom }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await ctx.params
  const existing = await db.workstation.findUnique({
    where: { id },
    include: { classroom: { select: { number: true } } },
  })
  if (!existing) {
    return NextResponse.json({ error: "Рабочее место не найдено" }, { status: 404 })
  }
  if (isClassroomPoolWorkstation(existing.code, existing.classroom.number)) {
    return NextResponse.json(
      { error: "Служебное рабочее место кабинета (KAB-…) нельзя редактировать." },
      { status: 409 }
    )
  }

  const body = await request.json()
  const parsed = updateWorkstationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const data = parsed.data

  const targetClassroomId = data.classroomId ?? existing.classroomId
  const classroom = await db.classroom.findUnique({
    where: { id: targetClassroomId },
    select: { id: true, number: true },
  })
  if (!classroom) {
    return NextResponse.json({ error: "Аудитория не найдена" }, { status: 400 })
  }

  const nextCode = data.code ?? existing.code
  if (!workstationCodeMatchesClassroom(nextCode, classroom.number)) {
    return NextResponse.json(
      { error: workstationCodeClassroomErrorHint(classroom.number) },
      { status: 400 }
    )
  }

  if (targetClassroomId !== existing.classroomId) {
    const cap = await assertCapacityForMove(targetClassroomId, existing.id)
    if (!cap.ok) {
      return NextResponse.json({ error: cap.error }, { status: 409 })
    }
  }

  if (nextCode !== existing.code || targetClassroomId !== existing.classroomId) {
    const dup = await db.workstation.findUnique({
      where: { classroomId_code: { classroomId: targetClassroomId, code: nextCode } },
    })
    if (dup && dup.id !== existing.id) {
      return NextResponse.json({ error: "Рабочее место с таким номером уже есть в этой аудитории" }, { status: 409 })
    }
  }

  const lastMaintenance =
    data.lastMaintenance !== undefined ? parseLastMaintenance(data.lastMaintenance) : undefined

  await db.$transaction(async (tx) => {
    await tx.workstation.update({
      where: { id },
      data: {
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.classroomId !== undefined ? { classroomId: data.classroomId } : {}),
        ...(data.name !== undefined ? { name: data.name?.trim() || null } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        ...(data.pcName !== undefined ? { pcName: data.pcName?.trim() || null } : {}),
        ...(lastMaintenance !== undefined ? { lastMaintenance } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    })
    await syncWorkstationStatusFromEquipment(tx, id)
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await ctx.params
  const existing = await db.workstation.findUnique({
    where: { id },
    include: {
      _count: { select: { equipment: true } },
      classroom: { select: { number: true } },
    },
  })
  if (!existing) {
    return NextResponse.json({ error: "Рабочее место не найдено" }, { status: 404 })
  }
  if (isClassroomPoolWorkstation(existing.code, existing.classroom.number)) {
    return NextResponse.json(
      {
        error:
          "Служебное рабочее место кабинета (KAB-…) нельзя удалить. Удалите аудиторию, если она больше не нужна.",
      },
      { status: 409 }
    )
  }
  if (existing._count.equipment > 0) {
    return NextResponse.json(
      {
        error:
          "Нельзя удалить рабочее место с привязанным оборудованием. Сначала переместите или удалите оборудование.",
      },
      { status: 409 }
    )
  }

  await db.workstation.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
