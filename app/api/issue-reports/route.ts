import { NextResponse } from "next/server"
import { EquipmentStatus, IssuePriority, UserRole } from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { resolveEquipmentIdsForTeacherIssue } from "@/lib/issue-report-teacher"
import { createTeacherIssueReportSchema } from "@/lib/validators"

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

function buildDescription(raw: string, title: string, kind: string): string {
  const body = raw.trim() || title.trim()
  const label = KIND_LABEL[kind] ?? kind
  return `[Тип по заявке: ${label}]\n\n${body}`
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== UserRole.TEACHER && role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createTeacherIssueReportSchema.safeParse(body)
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

  if (role === UserRole.TEACHER && classroom.responsibleId !== session.user.id) {
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

  const description = buildDescription(d.description, d.title, d.problemEquipmentKind)
  const priority = d.priority ?? IssuePriority.MEDIUM

  await db.$transaction(async (tx) => {
    for (const equipmentId of equipmentIds) {
      await tx.issueReport.create({
        data: {
          equipmentId,
          reporterId: session.user.id,
          title: d.title.trim(),
          description,
          priority,
        },
      })
      await tx.equipment.update({
        where: { id: equipmentId },
        data: { status: EquipmentStatus.NEEDS_CHECK },
      })
    }
  })

  return NextResponse.json({ ok: true, created: equipmentIds.length })
}
