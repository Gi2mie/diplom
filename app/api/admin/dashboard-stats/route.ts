import { NextResponse } from "next/server"
import {
  EquipmentStatus,
  IssuePriority,
  IssueStatus,
  RepairStatus,
  UserStatus,
} from "@prisma/client"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"

function formatAuthor(u: {
  firstName: string
  lastName: string
  middleName: string | null
}) {
  const f = u.firstName?.[0]?.toUpperCase() ?? ""
  const m = u.middleName?.trim()?.[0]?.toUpperCase() ?? ""
  const initials = m ? `${f}.${m}.` : `${f}.`
  return `${u.lastName} ${initials}`.trim()
}

function classroomLine(
  equipment: {
    name: string
    workstation: null | {
      classroom: {
        number: string
        name: string | null
        building: { name: string } | null
      }
    }
  }
) {
  const ws = equipment.workstation
  if (!ws) {
    return equipment.name ? `Оборудование: ${equipment.name}` : "Без привязки к аудитории"
  }
  const c = ws.classroom
  const parts: string[] = []
  if (c.building?.name) parts.push(c.building.name)
  const label = c.name ? `${c.name} (${c.number})` : `Каб. ${c.number}`
  parts.push(label)
  return parts.join(", ")
}

function mapPriority(p: IssuePriority): "low" | "medium" | "high" {
  if (p === IssuePriority.CRITICAL || p === IssuePriority.HIGH) return "high"
  if (p === IssuePriority.MEDIUM) return "medium"
  return "low"
}

function mapStatus(
  s: IssueStatus
): "pending" | "in_progress" | "completed" | "rejected" {
  if (s === IssueStatus.NEW) return "pending"
  if (s === IssueStatus.IN_PROGRESS) return "in_progress"
  if (s === IssueStatus.REJECTED) return "rejected"
  return "completed"
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const repairActiveStatuses: RepairStatus[] = [
    RepairStatus.PLANNED,
    RepairStatus.IN_PROGRESS,
  ]

  const completedStatuses: IssueStatus[] = [
    IssueStatus.RESOLVED,
    IssueStatus.CLOSED,
  ]

  const [
    pendingRequests,
    inProgressRequests,
    equipmentTotal,
    equipmentOperational,
    equipmentNeedsCheck,
    equipmentInRepair,
    equipmentDecommissioned,
    equipmentNotInUse,
    classrooms,
    workstations,
    activeRepairs,
    softwareCount,
    usersTotal,
    completedRequestsThisMonth,
    recentRaw,
  ] = await Promise.all([
    db.issueReport.count({ where: { status: IssueStatus.NEW } }),
    db.issueReport.count({ where: { status: IssueStatus.IN_PROGRESS } }),
    db.equipment.count(),
    db.equipment.count({ where: { status: EquipmentStatus.OPERATIONAL } }),
    db.equipment.count({ where: { status: EquipmentStatus.NEEDS_CHECK } }),
    db.equipment.count({ where: { status: EquipmentStatus.IN_REPAIR } }),
    db.equipment.count({ where: { status: EquipmentStatus.DECOMMISSIONED } }),
    db.equipment.count({ where: { status: EquipmentStatus.NOT_IN_USE } }),
    db.classroom.count(),
    db.workstation.count(),
    db.repair.count({
      where: { status: { in: repairActiveStatuses } },
    }),
    db.software.count(),
    db.user.count({ where: { status: UserStatus.ACTIVE } }),
    db.issueReport.count({
      where: {
        status: { in: completedStatuses },
        updatedAt: { gte: startOfMonth },
      },
    }),
    db.issueReport.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: {
          select: { firstName: true, lastName: true, middleName: true },
        },
        equipment: {
          select: {
            name: true,
            workstation: {
              select: {
                classroom: {
                  select: {
                    number: true,
                    name: true,
                    building: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ])

  const openRequests = pendingRequests + inProgressRequests

  const recentIssues = recentRaw.map((r) => ({
    id: r.id,
    title: r.title,
    classroom: classroomLine(r.equipment),
    status: mapStatus(r.status),
    date: r.createdAt.toISOString().slice(0, 10),
    priority: mapPriority(r.priority),
    author: formatAuthor(r.reporter),
  }))

  return NextResponse.json({
    stats: {
      totalEquipment: equipmentTotal,
      workingEquipment: equipmentOperational,
      faultyEquipment: equipmentNeedsCheck,
      inRepairEquipment: equipmentInRepair,
      equipmentDecommissioned,
      equipmentNotInUse,
      totalClassrooms: classrooms,
      totalWorkstations: workstations,
      openRequests,
      pendingRequests,
      inProgressRequests,
      completedRequestsThisMonth,
      totalUsers: usersTotal,
      activeRepairs,
      softwareCount,
    },
    recentIssues,
  })
}
