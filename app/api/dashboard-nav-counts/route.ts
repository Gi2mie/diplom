import { NextResponse } from "next/server"
import { IssueStatus, RepairStatus, SoftwareRequestStatus, UserRole } from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export type DashboardNavCounts = {
  /** Заявки на ПО: невыполненные (ожидание + в работе). */
  softwareRequests: number
  /** Активные ремонты: в очереди и в работе. */
  activeRepairs: number
  /** Неисправности: новые и в работе. */
  issues: number
}

/** Счётчики для бейджей в боковом меню (только администратор). */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    const empty: DashboardNavCounts = {
      softwareRequests: 0,
      activeRepairs: 0,
      issues: 0,
    }
    return NextResponse.json(empty)
  }

  const issueOpenWhere = {
    status: { in: [IssueStatus.NEW, IssueStatus.IN_PROGRESS] as const },
  }

  const [openIssues, softwareRequests, activeRepairs] = await Promise.all([
    db.issueReport.count({ where: issueOpenWhere }),
    db.softwareRequest.count({
      where: {
        status: {
          in: [SoftwareRequestStatus.PENDING, SoftwareRequestStatus.IN_PROGRESS] as const,
        },
      },
    }),
    db.repair.count({
      where: {
        status: { in: [RepairStatus.PLANNED, RepairStatus.IN_PROGRESS] as const },
      },
    }),
  ])

  const payload: DashboardNavCounts = {
    softwareRequests,
    activeRepairs,
    issues: openIssues,
  }

  return NextResponse.json(payload)
}
