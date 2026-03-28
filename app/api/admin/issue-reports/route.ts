import { NextResponse } from "next/server"
import {
  EquipmentStatus,
  IssuePriority,
  IssueStatus,
  RepairStatus,
  UserRole,
} from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { adminCreateIssueReportSchema } from "@/lib/validators"

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
  const equipment = await db.equipment.findUnique({ where: { id: d.equipmentId } })
  if (!equipment) {
    return NextResponse.json({ error: "Оборудование не найдено" }, { status: 400 })
  }

  const reporter = await db.user.findUnique({ where: { id: d.reporterId } })
  if (!reporter) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 400 })
  }

  const priority = d.priority ?? IssuePriority.MEDIUM
  const description = (d.description ?? "").trim() || d.title.trim()

  const row = await db.$transaction(async (tx) => {
    const issue = await tx.issueReport.create({
      data: {
        equipmentId: d.equipmentId,
        reporterId: d.reporterId,
        title: d.title.trim(),
        description,
        priority,
        status: IssueStatus.NEW,
      },
      include: listInclude,
    })
    await tx.equipment.update({
      where: { id: d.equipmentId },
      data: { status: EquipmentStatus.NEEDS_CHECK },
    })
    return issue
  })

  return NextResponse.json({ issue: row })
}
