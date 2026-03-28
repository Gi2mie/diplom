import { NextResponse } from "next/server"
import { IssueStatus, RepairStatus, UserRole } from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { adminUpdateIssueReportSchema } from "@/lib/validators"

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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  const existing = await db.issueReport.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 })
  }

  const body = await request.json()
  const parsed = adminUpdateIssueReportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const u = parsed.data

  const terminalStatuses: IssueStatus[] = [
    IssueStatus.RESOLVED,
    IssueStatus.CLOSED,
    IssueStatus.REJECTED,
  ]
  if (u.status !== undefined && terminalStatuses.includes(u.status)) {
    const activeRepairs = await db.repair.count({
      where: {
        issueReportId: id,
        status: { in: [RepairStatus.PLANNED, RepairStatus.IN_PROGRESS] },
      },
    })
    if (activeRepairs > 0) {
      return NextResponse.json(
        {
          error:
            "Пока по обращению есть ремонты в очереди или в работе, нельзя установить статус «Решено», «Закрыто» или «Отклонено». Дождитесь завершения или отмены всех таких ремонтов.",
        },
        { status: 400 }
      )
    }
  }

  const row = await db.issueReport.update({
    where: { id },
    data: {
      ...(u.title !== undefined ? { title: u.title } : {}),
      ...(u.description !== undefined ? { description: u.description } : {}),
      ...(u.status !== undefined ? { status: u.status } : {}),
      ...(u.priority !== undefined ? { priority: u.priority } : {}),
      ...(u.resolution !== undefined ? { resolution: u.resolution } : {}),
    },
    include: listInclude,
  })

  return NextResponse.json({ issue: row })
}

export async function DELETE() {
  return NextResponse.json({ error: "Удаление обращений недоступно" }, { status: 403 })
}
