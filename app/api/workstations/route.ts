import { NextResponse } from "next/server"
import { IssueStatus, RepairStatus, UserRole, WorkstationStatus } from "@prisma/client"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { createWorkstationSchema } from "@/lib/validators"
import { workstationCodeMatchesClassroom } from "@/lib/workstation-code"
import {
  isEquipmentOnService,
  syncWorkstationStatusFromEquipment,
  workstationStatusFromOnServiceFlags,
} from "@/lib/workstation-status-sync"

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
      equipment: {
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          name: true,
          inventoryNumber: true,
          type: true,
          status: true,
          equipmentKind: { select: { name: true } },
          issueReports: {
            where: { status: { in: [IssueStatus.NEW, IssueStatus.IN_PROGRESS] } },
            take: 1,
            select: { id: true },
          },
          repairs: {
            where: { status: { in: [RepairStatus.PLANNED, RepairStatus.IN_PROGRESS] } },
            take: 1,
            select: { id: true },
          },
          software: {
            orderBy: { software: { name: "asc" } },
            select: {
              id: true,
              version: true,
              software: { select: { name: true, version: true } },
            },
          },
        },
      },
    },
  })

  return NextResponse.json({
    workstations: rows.map((w) => {
      const equipmentItems = w.equipment.map((e) => ({
        id: e.id,
        name: e.name,
        inventoryNumber: e.inventoryNumber,
        typeEnum: e.type,
        kindName: e.equipmentKind?.name ?? null,
        equipmentStatus: e.status,
        onService: isEquipmentOnService({
          status: e.status,
          hasOpenIssue: e.issueReports.length > 0,
          hasActiveRepair: e.repairs.length > 0,
        }),
        installedSoftware: e.software.map((row) => ({
          id: row.id,
          softwareName: row.software.name,
          catalogVersion: row.software.version,
          installedVersion: row.version,
        })),
      }))
      const status = workstationStatusFromOnServiceFlags(equipmentItems)

      return {
        id: w.id,
        code: w.code,
        classroomId: w.classroomId,
        name: w.name ?? "",
        description: w.description ?? "",
        pcName: w.pcName ?? "",
        status,
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
        equipmentItems,
      }
    }),
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

  await db.$transaction(async (tx) => {
    const created = await tx.workstation.create({
      data: {
        code: data.code,
        classroomId: data.classroomId,
        name: data.name?.trim() || null,
        description: data.description?.trim() || null,
        pcName: data.pcName?.trim() || null,
        status: WorkstationStatus.ACTIVE,
        hasMonitor: false,
        hasKeyboard: false,
        hasMouse: false,
        hasHeadphones: false,
        hasOtherEquipment: false,
        otherEquipmentNote: null,
        lastMaintenance,
      },
    })
    await syncWorkstationStatusFromEquipment(tx, created.id)
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
