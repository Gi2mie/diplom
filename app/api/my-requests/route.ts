import { NextResponse } from "next/server"
import {
  IssueStatus,
  SoftwareRequestKind,
  SoftwareRequestStatus,
} from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

type UiStatus = "pending" | "in_progress" | "completed" | "rejected"

function mapIssueStatus(s: IssueStatus): UiStatus {
  switch (s) {
    case IssueStatus.NEW:
      return "pending"
    case IssueStatus.IN_PROGRESS:
      return "in_progress"
    case IssueStatus.RESOLVED:
    case IssueStatus.CLOSED:
      return "completed"
    case IssueStatus.REJECTED:
      return "rejected"
  }
}

function mapSoftwareStatus(s: SoftwareRequestStatus): UiStatus {
  switch (s) {
    case SoftwareRequestStatus.PENDING:
      return "pending"
    case SoftwareRequestStatus.IN_PROGRESS:
      return "in_progress"
    case SoftwareRequestStatus.COMPLETED:
      return "completed"
    case SoftwareRequestStatus.REJECTED:
      return "rejected"
  }
}

function classroomLine(args: {
  number: string
  name: string | null
  buildingName: string | null
}): string {
  const title = args.name?.trim() || `Аудитория ${args.number}`
  return args.buildingName ? `${title} (${args.buildingName})` : title
}

function softwareKindRu(k: SoftwareRequestKind): string {
  switch (k) {
    case SoftwareRequestKind.INSTALL:
      return "Установка ПО"
    case SoftwareRequestKind.UPDATE:
      return "Обновление ПО"
    case SoftwareRequestKind.UNINSTALL:
      return "Удаление ПО"
    default:
      return "ПО"
  }
}

function isWholeClassroomIssueDescription(text: string): boolean {
  return text.includes("[Охват: вся аудитория]")
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  const [issues, softwareRows] = await Promise.all([
    db.issueReport.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        equipment: {
          select: {
            name: true,
            type: true,
            inventoryNumber: true,
            workstation: {
              select: {
                code: true,
                name: true,
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
    db.softwareRequest.findMany({
      where: { requesterId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        classroom: {
          select: {
            number: true,
            name: true,
            building: { select: { name: true } },
          },
        },
        workstation: {
          select: {
            code: true,
            name: true,
            equipment: { select: { inventoryNumber: true } },
          },
        },
      },
    }),
  ])

  const repairItems = issues.map((ir) => {
    const ws = ir.equipment.workstation
    const cr = ws?.classroom
    const classroomLabel = cr
      ? classroomLine({
          number: cr.number,
          name: cr.name,
          buildingName: cr.building?.name ?? null,
        })
      : "—"
    const workstationLabel = isWholeClassroomIssueDescription(ir.description)
      ? null
      : ws
        ? ws.name?.trim()
          ? `${ws.code} — ${ws.name}`
          : ws.code
        : null

    const resolution = ir.resolution?.trim()
    const adminComment = resolution || null

    return {
      key: `repair:${ir.id}`,
      source: "repair" as const,
      id: ir.id,
      title: ir.title,
      description: ir.description,
      status: mapIssueStatus(ir.status),
      priority: ir.priority,
      classroomLabel,
      workstationLabel,
      inventoryNumbers: [ir.equipment.inventoryNumber].filter(Boolean),
      createdAt: ir.createdAt.toISOString(),
      updatedAt: ir.updatedAt.toISOString(),
      adminComment,
      equipmentType: ir.equipment.type,
    }
  })

  const softwareItems = softwareRows.map((sr) => {
    const cr = sr.classroom
    const classroomLabel = classroomLine({
      number: cr.number,
      name: cr.name,
      buildingName: cr.building?.name ?? null,
    })
    let workstationLabel: string | null = null
    if (sr.wholeClassroom) {
      workstationLabel = "Вся аудитория"
    } else if (sr.workstation) {
      const w = sr.workstation
      workstationLabel = w.name?.trim() ? `${w.code} — ${w.name}` : w.code
    }

    const title = `${softwareKindRu(sr.kind)}: ${sr.softwareName}`

    const invFromWs =
      sr.workstation?.equipment.map((e) => e.inventoryNumber).filter(Boolean) ?? []

    return {
      key: `software:${sr.id}`,
      source: "software" as const,
      id: sr.id,
      title,
      description: sr.description,
      status: mapSoftwareStatus(sr.status),
      priority: sr.priority,
      classroomLabel,
      workstationLabel,
      inventoryNumbers: invFromWs,
      createdAt: sr.createdAt.toISOString(),
      updatedAt: sr.updatedAt.toISOString(),
      adminComment: sr.adminComment?.trim() || null,
      equipmentType: null,
    }
  })

  const items = [...repairItems, ...softwareItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return NextResponse.json({ items })
}
