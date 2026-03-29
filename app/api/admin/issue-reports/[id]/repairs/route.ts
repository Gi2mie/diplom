import { NextResponse } from "next/server"
import {
  IssueStatus,
  RepairStatus,
  UserRole,
} from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { recomputeEquipmentStatus } from "@/lib/equipment-status-sync"
import { batchRepairsFromIssueSchema } from "@/lib/validators"

function appendAdminRepairNotice(existing: string | null | undefined, lines: string[]): string {
  const block = `[Системный администратор] Выполняется ремонт оборудования: ${lines.join("; ")}.`
  const prev = existing?.trim()
  return prev ? `${prev}\n\n${block}` : block
}

const listInclude = {
  equipment: {
    include: {
      workstation: {
        include: {
          classroom: { include: { building: { select: { name: true } } } },
        },
      },
    },
  },
  reporter: {
    select: { id: true, firstName: true, lastName: true, middleName: true, email: true },
  },
  repairs: {
    where: { status: { in: [RepairStatus.PLANNED, RepairStatus.IN_PROGRESS] } },
    select: {
      id: true,
      status: true,
      equipmentId: true,
      equipment: { select: { id: true, name: true, inventoryNumber: true } },
    },
  },
} as const

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id: issueId } = await context.params
  const issue = await db.issueReport.findUnique({
    where: { id: issueId },
    include: {
      equipment: { include: { workstation: { select: { classroomId: true } } } },
    },
  })
  if (!issue) {
    return NextResponse.json({ error: "Обращение не найдено" }, { status: 404 })
  }

  const anchorClassroomId = issue.equipment.workstation?.classroomId
  if (!anchorClassroomId) {
    return NextResponse.json(
      {
        error:
          "У оборудования в обращении нет привязки к аудитории. Постановка на ремонт по кабинету невозможна.",
      },
      { status: 400 }
    )
  }

  const body = await request.json()
  const parsed = batchRepairsFromIssueSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const { classroomId, equipmentIds } = parsed.data
  if (classroomId !== anchorClassroomId) {
    return NextResponse.json(
      { error: "Аудитория не совпадает с расположением оборудования по обращению" },
      { status: 400 }
    )
  }

  const uniqueIds = [...new Set(equipmentIds)]

  const equipmentRows = await db.equipment.findMany({
    where: { id: { in: uniqueIds } },
    include: { workstation: { select: { classroomId: true } } },
  })
  if (equipmentRows.length !== uniqueIds.length) {
    return NextResponse.json({ error: "Некоторые единицы оборудования не найдены" }, { status: 400 })
  }

  for (const row of equipmentRows) {
    if (!row.workstationId || row.workstation?.classroomId !== classroomId) {
      return NextResponse.json(
        { error: `Оборудование «${row.name}» не относится к выбранной аудитории` },
        { status: 400 }
      )
    }
  }

  const active = await db.repair.findMany({
    where: {
      equipmentId: { in: uniqueIds },
      status: { in: [RepairStatus.PLANNED, RepairStatus.IN_PROGRESS] },
    },
    select: { equipmentId: true },
  })
  if (active.length > 0) {
    return NextResponse.json(
      { error: "Часть выбранного оборудования уже в активном ремонте" },
      { status: 400 }
    )
  }

  const labelLines = equipmentRows.map(
    (e) => `${e.name} (инв. ${e.inventoryNumber})`
  )
  const newResolution = appendAdminRepairNotice(issue.resolution, labelLines)

  await db.$transaction(async (tx) => {
    for (const eq of equipmentRows) {
      await tx.repair.create({
        data: {
          equipmentId: eq.id,
          issueReportId: issueId,
          createdById: session.user.id,
          description: `Ремонт по обращению: ${issue.title}`,
          status: RepairStatus.PLANNED,
        },
      })
      await recomputeEquipmentStatus(tx, eq.id)
    }
    await tx.issueReport.update({
      where: { id: issueId },
      data: {
        status: IssueStatus.IN_PROGRESS,
        resolution: newResolution,
      },
    })
  })

  const updated = await db.issueReport.findUnique({
    where: { id: issueId },
    include: listInclude,
  })

  return NextResponse.json({ issue: updated, createdRepairs: uniqueIds.length })
}
