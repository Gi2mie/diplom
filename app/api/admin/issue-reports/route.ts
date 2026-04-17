import { NextResponse } from "next/server"
import {
  IssuePriority,
  IssueStatus,
  RepairStatus,
  UserRole,
} from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { recomputeEquipmentStatus } from "@/lib/equipment-status-sync"
import { resolveEquipmentIdsForTeacherIssue } from "@/lib/issue-report-teacher"
import { adminCreateIssueReportSchema } from "@/lib/validators"

const KIND_LABEL: Record<string, string> = {
  monitor: "Монитор",
  keyboard: "Клавиатура",
  mouse: "Мышь",
  system_unit: "Системный блок",
  printer: "Принтер",
  projector: "Проектор",
  network: "Сеть / интернет",
  software: "Программное обеспечение",
  other: "Другое",
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

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const issues = await db.issueReport.findMany({
    orderBy: { createdAt: "desc" },
    include: listInclude,
  })

  return NextResponse.json({ issues })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = adminCreateIssueReportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const d = parsed.data
  const classroom = await db.classroom.findUnique({
    where: { id: d.classroomId },
    select: { id: true },
  })
  if (!classroom) {
    return NextResponse.json({ error: "Аудитория не найдена" }, { status: 400 })
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

  const equipmentIds = await resolveEquipmentIdsForTeacherIssue(db, d.classroomId, {
    wholeClassroom: d.wholeClassroom,
    workstationId: d.workstationId ?? null,
  })
  if (equipmentIds.length === 0) {
    return NextResponse.json(
      {
        error:
          "Не найдено зарегистрированного оборудования на выбранных рабочих местах. Добавьте ПК в «Конфигурация ПК» или «Оборудование».",
      },
      { status: 400 }
    )
  }

  const priority = d.priority ?? IssuePriority.MEDIUM
  const descriptionBody = (d.description ?? "").trim() || d.title.trim()
  const kindLabel = KIND_LABEL[d.problemEquipmentKind] ?? d.problemEquipmentKind
  const scope = d.wholeClassroom ? "вся аудитория" : "одно рабочее место"
  const description = `[Тип по заявке: ${kindLabel}]\n[Охват: ${scope}]\n\n${descriptionBody}`

  const row = await db.$transaction(async (tx) => {
    let issueId = ""
    for (const equipmentId of equipmentIds) {
      const issue = await tx.issueReport.create({
        data: {
          equipmentId,
          reporterId: session.user.id,
          title: d.title.trim(),
          description,
          priority,
          status: IssueStatus.NEW,
        },
      })
      if (!issueId) issueId = issue.id
      await recomputeEquipmentStatus(tx, equipmentId)
    }
    const issue = await tx.issueReport.findUniqueOrThrow({
      where: { id: issueId },
      include: listInclude,
    })
    return issue
  })

  return NextResponse.json({ issue: row })
}
