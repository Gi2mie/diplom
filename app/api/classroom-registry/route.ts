import { NextResponse } from "next/server"
import { auth, isTeacherSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, UserStatus } from "@prisma/client"

type ClassroomRow = {
  id: string
  number: string
  name: string | null
  floor: number | null
  capacity: number | null
  description: string | null
  listingStatus: import("@prisma/client").ClassroomListingStatus
  buildingId: string | null
  buildingName: string | null
  classroomTypeId: string | null
  typeName: string | null
  typeCode: string | null
  typeColor: string | null
  responsibleId: string | null
  responsibleLabel: string | null
  workstationCount: number
  equipmentCount: number
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const teacherScope = isTeacherSession(session) ? { responsibleId: session.user.id } : {}

  const classroomsRaw = await db.classroom.findMany({
    where: teacherScope,
    orderBy: { number: "asc" },
    include: {
      building: { select: { id: true, name: true } },
      classroomType: { select: { id: true, name: true, code: true, color: true } },
      responsible: { select: { id: true, firstName: true, lastName: true, middleName: true } },
      workstations: { select: { _count: { select: { equipment: true } } } },
    },
  })

  const classrooms: ClassroomRow[] = classroomsRaw.map((c) => {
    const workstationCount = c.workstations.length
    const equipmentCount = c.workstations.reduce((s, w) => s + w._count.equipment, 0)
    const responsibleLabel = c.responsible
      ? `${c.responsible.lastName} ${c.responsible.firstName}${c.responsible.middleName ? ` ${c.responsible.middleName}` : ""}`
      : null
    return {
      id: c.id,
      number: c.number,
      name: c.name,
      floor: c.floor,
      capacity: c.capacity,
      description: c.description,
      listingStatus: c.listingStatus,
      buildingId: c.buildingId,
      buildingName: c.building?.name ?? null,
      classroomTypeId: c.classroomTypeId,
      typeName: c.classroomType?.name ?? null,
      typeCode: c.classroomType?.code ?? null,
      typeColor: c.classroomType?.color ?? null,
      responsibleId: c.responsibleId,
      responsibleLabel,
      workstationCount,
      equipmentCount,
    }
  })

  if (isTeacherSession(session)) {
    const totalWorkstations = classrooms.reduce((s, c) => s + c.workstationCount, 0)
    const buildingIds = [...new Set(classrooms.map((c) => c.buildingId).filter(Boolean))] as string[]
    const typeIds = [...new Set(classrooms.map((c) => c.classroomTypeId).filter(Boolean))] as string[]

    const buildingCountMap = new Map<string, number>()
    const typeCountMap = new Map<string, number>()
    for (const c of classrooms) {
      if (c.buildingId) buildingCountMap.set(c.buildingId, (buildingCountMap.get(c.buildingId) ?? 0) + 1)
      if (c.classroomTypeId)
        typeCountMap.set(c.classroomTypeId, (typeCountMap.get(c.classroomTypeId) ?? 0) + 1)
    }

    const [buildingsRaw, typesRaw] = await Promise.all([
      buildingIds.length
        ? db.building.findMany({ where: { id: { in: buildingIds } }, orderBy: { name: "asc" } })
        : Promise.resolve([]),
      typeIds.length
        ? db.classroomType.findMany({ where: { id: { in: typeIds } }, orderBy: { name: "asc" } })
        : Promise.resolve([]),
    ])

    return NextResponse.json({
      stats: {
        totalClassrooms: classrooms.length,
        totalWorkstations,
        totalBuildings: buildingIds.length,
        totalTypes: typeIds.length,
      },
      classrooms,
      buildings: buildingsRaw.map((b) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        floors: b.floors,
        description: b.description,
        classroomsCount: buildingCountMap.get(b.id) ?? 0,
      })),
      types: typesRaw.map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        color: t.color,
        description: t.description,
        classroomsCount: typeCountMap.get(t.id) ?? 0,
      })),
      teachers: [] as { id: string; firstName: string; lastName: string; middleName: string | null; email: string }[],
    })
  }

  const [
    totalClassrooms,
    totalWorkstations,
    totalBuildings,
    totalTypes,
    buildings,
    types,
    buildingCounts,
    typeCounts,
  ] = await Promise.all([
    db.classroom.count(),
    db.workstation.count(),
    db.building.count(),
    db.classroomType.count(),
    db.building.findMany({ orderBy: { name: "asc" } }),
    db.classroomType.findMany({ orderBy: { name: "asc" } }),
    db.classroom.groupBy({
      by: ["buildingId"],
      where: { buildingId: { not: null } },
      _count: { _all: true },
    }),
    db.classroom.groupBy({
      by: ["classroomTypeId"],
      where: { classroomTypeId: { not: null } },
      _count: { _all: true },
    }),
  ])

  const buildingIdToCount = new Map(
    buildingCounts
      .filter((r): r is typeof r & { buildingId: string } => r.buildingId != null)
      .map((r) => [r.buildingId, r._count._all])
  )
  const typeIdToCount = new Map(
    typeCounts
      .filter((r): r is typeof r & { classroomTypeId: string } => r.classroomTypeId != null)
      .map((r) => [r.classroomTypeId, r._count._all])
  )

  const teachers = await db.user.findMany({
    where: { role: UserRole.TEACHER, status: UserStatus.ACTIVE },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, middleName: true, email: true },
  })

  return NextResponse.json({
    stats: {
      totalClassrooms,
      totalWorkstations,
      totalBuildings,
      totalTypes,
    },
    classrooms,
    buildings: buildings.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      floors: b.floors,
      description: b.description,
      classroomsCount: buildingIdToCount.get(b.id) ?? 0,
    })),
    types: types.map((t) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      color: t.color,
      description: t.description,
      classroomsCount: typeIdToCount.get(t.id) ?? 0,
    })),
    teachers,
  })
}
