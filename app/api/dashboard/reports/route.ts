import { NextResponse } from "next/server"
import {
  EquipmentStatus,
  EquipmentType,
  RepairStatus,
  SoftwareLicenseKind,
  UserRole,
} from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { isClassroomPoolWorkstation } from "@/lib/classroom-pool-workstation"
import { equipmentStatusLabel } from "@/lib/equipment-labels"
import type { Prisma } from "@prisma/client"

const STATUS_COLORS: Record<EquipmentStatus, string> = {
  OPERATIONAL: "#22c55e",
  NEEDS_CHECK: "#ef4444",
  IN_REPAIR: "#f59e0b",
  DECOMMISSIONED: "#6b7280",
  NOT_IN_USE: "#94a3b8",
}

const STATUS_ORDER: EquipmentStatus[] = [
  EquipmentStatus.OPERATIONAL,
  EquipmentStatus.NEEDS_CHECK,
  EquipmentStatus.IN_REPAIR,
  EquipmentStatus.DECOMMISSIONED,
  EquipmentStatus.NOT_IN_USE,
]

const ACTIVE_REPAIR_STATUSES: RepairStatus[] = [
  RepairStatus.PLANNED,
  RepairStatus.IN_PROGRESS,
]

function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function parseDateParam(s: string | null, fallback: Date): Date {
  if (!s) return fallback
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? fallback : d
}

function teacherEquipmentWhere(userId: string): Prisma.EquipmentWhereInput {
  return {
    workstation: {
      classroom: { responsibleId: userId },
    },
  }
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const isTeacher = session.user.role === UserRole.TEACHER
  const teacherScope = isTeacher ? userId : undefined

  const { searchParams } = new URL(request.url)
  const today = new Date()
  const defaultFrom = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
  const dateFrom = parseDateParam(searchParams.get("dateFrom"), defaultFrom)
  const dateTo = endOfDay(parseDateParam(searchParams.get("dateTo"), today))

  const buildingId = searchParams.get("buildingId") || undefined
  const classroomId = searchParams.get("classroomId") || undefined
  const workstationId = searchParams.get("workstationId") || undefined
  const inventorySearch = searchParams.get("inventorySearch")?.trim() || undefined

  const equipmentScope: Prisma.EquipmentWhereInput = teacherScope
    ? teacherEquipmentWhere(teacherScope)
    : {}

  const [
    totalEquipment,
    operational,
    needsCheck,
    inRepairStatus,
    decommissioned,
    notInUse,
    activeRepairsCount,
  ] = await Promise.all([
    db.equipment.count({ where: equipmentScope }),
    db.equipment.count({
      where: { ...equipmentScope, status: EquipmentStatus.OPERATIONAL },
    }),
    db.equipment.count({
      where: { ...equipmentScope, status: EquipmentStatus.NEEDS_CHECK },
    }),
    db.equipment.count({
      where: { ...equipmentScope, status: EquipmentStatus.IN_REPAIR },
    }),
    db.equipment.count({
      where: { ...equipmentScope, status: EquipmentStatus.DECOMMISSIONED },
    }),
    db.equipment.count({
      where: { ...equipmentScope, status: EquipmentStatus.NOT_IN_USE },
    }),
    db.repair.count({
      where: {
        status: { in: ACTIVE_REPAIR_STATUSES },
        ...(teacherScope ? { equipment: { is: teacherEquipmentWhere(teacherScope) } } : {}),
      },
    }),
  ])

  const countsByStatus: Record<EquipmentStatus, number> = {
    [EquipmentStatus.OPERATIONAL]: operational,
    [EquipmentStatus.NEEDS_CHECK]: needsCheck,
    [EquipmentStatus.IN_REPAIR]: inRepairStatus,
    [EquipmentStatus.DECOMMISSIONED]: decommissioned,
    [EquipmentStatus.NOT_IN_USE]: notInUse,
  }

  const statusBreakdown = STATUS_ORDER.map((status) => ({
    status,
    label: equipmentStatusLabel(status),
    count: countsByStatus[status],
    color: STATUS_COLORS[status],
    percentage:
      totalEquipment > 0 ? Math.round((countsByStatus[status] / totalEquipment) * 1000) / 10 : 0,
  }))

  const inRepairEquipmentRaw = await db.equipment.findMany({
    where: {
      ...equipmentScope,
      OR: [
        { status: EquipmentStatus.IN_REPAIR },
        {
          repairs: {
            some: { status: { in: ACTIVE_REPAIR_STATUSES } },
          },
        },
      ],
    },
    include: {
      equipmentKind: { select: { name: true } },
      workstation: {
        include: {
          classroom: {
            include: { building: { select: { id: true, name: true } } },
          },
        },
      },
      repairs: {
        where: { status: { in: ACTIVE_REPAIR_STATUSES } },
        take: 1,
        orderBy: { updatedAt: "desc" },
        include: {
          assignedTo: {
            select: { firstName: true, lastName: true, middleName: true },
          },
        },
      },
    },
    orderBy: [{ name: "asc" }],
    take: 100,
  })

  function techName(u: {
    firstName: string
    lastName: string
    middleName: string | null
  }): string {
    const m = u.middleName?.trim()?.[0]
    return `${u.lastName} ${u.firstName[0] ?? ""}.${m ? m + "." : ""}`.trim()
  }

  const inRepairEquipment = inRepairEquipmentRaw.map((e) => {
    const r = e.repairs[0]
    const ws = e.workstation
    const c = ws?.classroom
    const classroomLabel = c
      ? c.name
        ? `${c.number} (${c.name})`
        : c.number
      : "—"
    return {
      id: e.id,
      name: e.name,
      inventoryNumber: e.inventoryNumber,
      classroomLabel,
      buildingName: c?.building?.name ?? null,
      workstationCode: ws?.code ?? null,
      equipmentStatus: e.status,
      repairStatus: r?.status ?? null,
      technician: r?.assignedTo ? techName(r.assignedTo) : null,
      startedAt: r?.startedAt ? r.startedAt.toISOString().slice(0, 10) : null,
    }
  })

  const issueGroups = await db.issueReport.groupBy({
    by: ["equipmentId"],
    where: teacherScope ? { equipment: { is: teacherEquipmentWhere(teacherScope) } } : {},
    _count: { id: true },
  })

  const sortedIssues = issueGroups.sort((a, b) => b._count.id - a._count.id).slice(0, 50)
  const problemEquipmentIds = sortedIssues.map((g) => g.equipmentId)

  const problemEquipmentRows =
    problemEquipmentIds.length > 0
      ? await db.equipment.findMany({
          where: { id: { in: problemEquipmentIds } },
          include: {
            equipmentKind: { select: { name: true } },
            workstation: {
              include: {
                classroom: {
                  include: { building: { select: { name: true } } },
                },
              },
            },
          },
        })
      : []

  const idToEquipment = new Map(problemEquipmentRows.map((row) => [row.id, row]))

  const lastIssueDates = await db.issueReport.findMany({
    where: { equipmentId: { in: problemEquipmentIds } },
    select: { equipmentId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
  const lastByEq = new Map<string, Date>()
  for (const row of lastIssueDates) {
    if (!lastByEq.has(row.equipmentId)) {
      lastByEq.set(row.equipmentId, row.createdAt)
    }
  }

  const topProblems = sortedIssues.map((g) => {
    const e = idToEquipment.get(g.equipmentId)
    const c = e?.workstation?.classroom
    const classroomLine = c
      ? [c.building?.name, c.name ? `${c.number} (${c.name})` : c.number]
          .filter(Boolean)
          .join(" · ")
      : "Без привязки"
    return {
      id: g.equipmentId,
      name: e?.name ?? "—",
      type: e?.equipmentKind?.name ?? "—",
      classroom: classroomLine,
      problemCount: g._count.id,
      lastProblem: lastByEq.get(g.equipmentId)?.toISOString().slice(0, 10) ?? "—",
      status: e?.status ?? EquipmentStatus.OPERATIONAL,
    }
  })

  const equipmentForClassrooms = await db.equipment.findMany({
    where: {
      ...equipmentScope,
      workstationId: { not: null },
    },
    select: {
      status: true,
      workstation: {
        select: {
          classroomId: true,
          classroom: {
            select: {
              id: true,
              number: true,
              name: true,
              building: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  })

  type ClassAgg = {
    classroomId: string
    classroomNumber: string
    classroomName: string | null
    buildingName: string | null
    totalEquipment: number
    faultyCount: number
    inRepairCount: number
  }

  const classMap = new Map<string, ClassAgg>()
  for (const row of equipmentForClassrooms) {
    const ws = row.workstation
    if (!ws) continue
    const cid = ws.classroomId
    const c = ws.classroom
    if (!classMap.has(cid)) {
      classMap.set(cid, {
        classroomId: cid,
        classroomNumber: c.number,
        classroomName: c.name,
        buildingName: c.building?.name ?? null,
        totalEquipment: 0,
        faultyCount: 0,
        inRepairCount: 0,
      })
    }
    const agg = classMap.get(cid)!
    agg.totalEquipment += 1
    if (row.status === EquipmentStatus.NEEDS_CHECK) agg.faultyCount += 1
    if (row.status === EquipmentStatus.IN_REPAIR) agg.inRepairCount += 1
  }

  if (isTeacher && teacherScope) {
    const myRooms = await db.classroom.findMany({
      where: { responsibleId: teacherScope },
      select: {
        id: true,
        number: true,
        name: true,
        building: { select: { name: true } },
      },
    })
    for (const c of myRooms) {
      if (!classMap.has(c.id)) {
        classMap.set(c.id, {
          classroomId: c.id,
          classroomNumber: c.number,
          classroomName: c.name,
          buildingName: c.building?.name ?? null,
          totalEquipment: 0,
          faultyCount: 0,
          inRepairCount: 0,
        })
      }
    }
  }

  const classroomIssues = Array.from(classMap.values())
    .map((row) => ({
      ...row,
      percentage:
        row.totalEquipment > 0
          ? Math.round(
              ((row.faultyCount + row.inRepairCount) / row.totalEquipment) * 1000
            ) / 10
          : 0,
    }))
    .sort((a, b) => {
      const pa = a.faultyCount + a.inRepairCount
      const pb = b.faultyCount + b.inRepairCount
      if (pb !== pa) return pb - pa
      return b.percentage - a.percentage
    })

  const issueHistoryWhere: Prisma.IssueReportWhereInput = {
    createdAt: { gte: dateFrom, lte: dateTo },
    ...(teacherScope ? { equipment: { is: teacherEquipmentWhere(teacherScope) } } : {}),
  }

  const repairHistoryWhere: Prisma.RepairWhereInput = {
    OR: [
      { startedAt: { gte: dateFrom, lte: dateTo } },
      {
        AND: [{ startedAt: null }, { createdAt: { gte: dateFrom, lte: dateTo } }],
      },
    ],
    ...(teacherScope ? { equipment: { is: teacherEquipmentWhere(teacherScope) } } : {}),
  }

  const [issueRows, repairRows, issuesInPeriod, repairsCompletedInPeriod] = await Promise.all([
    db.issueReport.findMany({
      where: issueHistoryWhere,
      take: 500,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: {
          select: { firstName: true, lastName: true, middleName: true, role: true },
        },
        repairs: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          include: {
            assignedTo: {
              select: { firstName: true, lastName: true, middleName: true },
            },
            createdBy: {
              select: { firstName: true, lastName: true, middleName: true },
            },
          },
        },
        equipment: {
          include: {
            workstation: {
              include: {
                classroom: {
                  include: { building: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    }),
    db.repair.findMany({
      where: repairHistoryWhere,
      take: 500,
      orderBy: { createdAt: "desc" },
      include: {
        assignedTo: {
          select: { firstName: true, lastName: true, middleName: true },
        },
        createdBy: {
          select: { firstName: true, lastName: true, middleName: true },
        },
        equipment: {
          include: {
            workstation: {
              include: {
                classroom: {
                  include: { building: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    }),
    db.issueReport.count({ where: issueHistoryWhere }),
    db.repair.count({
      where: {
        status: RepairStatus.COMPLETED,
        completedAt: { gte: dateFrom, lte: dateTo },
        ...(teacherScope ? { equipment: { is: teacherEquipmentWhere(teacherScope) } } : {}),
      },
    }),
  ])

  function classroomLineFromEquipment(
    e: (typeof issueRows)[0]["equipment"]
  ): string {
    const ws = e.workstation
    if (!ws) return "Без привязки"
    const c = ws.classroom
    const parts: string[] = []
    if (c.building?.name) parts.push(c.building.name)
    parts.push(c.name ? `${c.number} (${c.name})` : c.number)
    return parts.join(" · ")
  }

  type HistoryRow = {
    id: string
    date: string
    kind: "issue" | "repair"
    equipment: string
    inventoryNumber: string
    classroom: string
    description: string
    /** ФИО системного администратора (исполнитель ремонта / работа с обращением) */
    sysAdminDisplay: string | null
    status: string
  }

  function sysAdminForIssue(r: (typeof issueRows)[number]): string | null {
    const lr = r.repairs[0]
    if (lr?.assignedTo) return techName(lr.assignedTo)
    if (lr?.createdBy) return techName(lr.createdBy)
    if (r.reporter?.role === UserRole.ADMIN) return techName(r.reporter)
    return null
  }

  const historyIssue: HistoryRow[] = issueRows.map((r) => ({
    id: `issue-${r.id}`,
    date: r.createdAt.toISOString().slice(0, 10),
    kind: "issue" as const,
    equipment: r.equipment.name,
    inventoryNumber: r.equipment.inventoryNumber,
    classroom: classroomLineFromEquipment(r.equipment),
    description: r.title,
    sysAdminDisplay: sysAdminForIssue(r),
    status: r.status,
  }))

  const historyRepair: HistoryRow[] = repairRows.map((r) => {
    const d = r.startedAt ?? r.createdAt
    const exec = r.assignedTo ? techName(r.assignedTo) : r.createdBy ? techName(r.createdBy) : null
    return {
      id: `repair-${r.id}`,
      date: d.toISOString().slice(0, 10),
      kind: "repair" as const,
      equipment: r.equipment.name,
      inventoryNumber: r.equipment.inventoryNumber,
      classroom: classroomLineFromEquipment(r.equipment),
      description: r.description,
      sysAdminDisplay: exec,
      status: r.status,
    }
  })

  const history = [...historyIssue, ...historyRepair].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0
  )

  const classroomPart: Prisma.ClassroomWhereInput = {}
  if (teacherScope) {
    classroomPart.responsibleId = teacherScope
  }
  if (classroomId && classroomId !== "all") {
    classroomPart.id = classroomId
  }
  if (buildingId && buildingId !== "all") {
    classroomPart.buildingId = buildingId
  }

  const workstationIs: Prisma.WorkstationWhereInput = {}
  if (Object.keys(classroomPart).length > 0) {
    workstationIs.classroom = { is: classroomPart }
  }

  const pcWhere: Prisma.EquipmentWhereInput = {
    type: EquipmentType.COMPUTER,
    /** В отчёт «Установленное ПО на ПК» только ПК с хотя бы одной записью в установленном ПО */
    software: { some: {} },
    ...(Object.keys(workstationIs).length > 0 ? { workstation: { is: workstationIs } } : {}),
    ...(workstationId && workstationId !== "all" ? { workstationId } : {}),
    ...(inventorySearch
      ? { inventoryNumber: { contains: inventorySearch, mode: "insensitive" } }
      : {}),
  }

  const pcs = await db.equipment.findMany({
    where: pcWhere,
    orderBy: [{ inventoryNumber: "asc" }],
    take: 300,
    include: {
      workstation: {
        include: {
          classroom: {
            include: { building: { select: { id: true, name: true } } },
          },
        },
      },
      software: {
        include: { software: true },
        orderBy: { software: { name: "asc" } },
      },
    },
  })

  /** В отчёт «Установленное ПО на ПК» не входят компьютеры на служебном РМ кабинета (KAB-…). */
  const pcsForSoftwareReport = pcs.filter((e) => {
    const ws = e.workstation
    const c = ws?.classroom
    if (!ws || !c?.number) return true
    return !isClassroomPoolWorkstation(ws.code, c.number)
  })

  const pcSoftware = pcsForSoftwareReport.map((e) => {
    const ws = e.workstation
    const c = ws?.classroom
    return {
      equipmentId: e.id,
      name: e.name,
      inventoryNumber: e.inventoryNumber,
      workstationId: e.workstationId,
      workstationCode: ws?.code ?? null,
      classroomId: c?.id ?? null,
      classroomNumber: c?.number ?? null,
      classroomName: c?.name ?? null,
      buildingId: c?.building?.id ?? null,
      buildingName: c?.building?.name ?? null,
      software: e.software.map((inst) => ({
        name: inst.software.name,
        version: inst.version ?? inst.software.version ?? "—",
        licenseKind: inst.software.licenseKind as SoftwareLicenseKind,
        licenseType: inst.software.licenseType ?? null,
      })),
    }
  })

  return NextResponse.json({
    summary: {
      totalEquipment,
      operational,
      needsCheck,
      inRepair: inRepairStatus,
      decommissioned,
      activeRepairsCount,
    },
    statusBreakdown,
    inRepairEquipment,
    topProblems,
    classroomIssues,
    history,
    historyStats: {
      issuesInPeriod,
      repairsCompletedInPeriod,
    },
    pcSoftware,
  })
}
