import { NextResponse } from "next/server"
import { EquipmentStatus, UserRole } from "@prisma/client"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { createEquipmentSchema } from "@/lib/validators"
import { initialEquipmentStatusForCreate } from "@/lib/equipment-workstation-status"
import { syncWorkstationKitFromEquipment } from "@/lib/workstation-kit-sync"
import { syncWorkstationStatusFromEquipment } from "@/lib/workstation-status-sync"
import { buildActiveRelocationLabels } from "@/lib/relocation-service"
import type { Prisma } from "@prisma/client"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim() || undefined
  const statusParam = searchParams.get("status") || undefined
  const classroomId = searchParams.get("classroomId") || undefined
  const workstationIdParam = searchParams.get("workstationId") || undefined
  const buildingId = searchParams.get("buildingId") || undefined
  const categoryId = searchParams.get("categoryId") || undefined
  const equipmentKindId = searchParams.get("equipmentKindId") || undefined

  const where: Prisma.EquipmentWhereInput = {}

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { inventoryNumber: { contains: search, mode: "insensitive" } },
      { serialNumber: { contains: search, mode: "insensitive" } },
    ]
  }

  if (statusParam && statusParam !== "all") {
    if (Object.values(EquipmentStatus).includes(statusParam as EquipmentStatus)) {
      where.status = statusParam as EquipmentStatus
    }
  }

  if (categoryId && categoryId !== "all") {
    where.categoryId = categoryId
  }

  if (equipmentKindId && equipmentKindId !== "all") {
    where.equipmentKindId = equipmentKindId
  }

  if (workstationIdParam && workstationIdParam !== "all") {
    where.workstationId = workstationIdParam
  }

  const wsFilter: Prisma.WorkstationWhereInput = {}
  if (classroomId && classroomId !== "all") {
    wsFilter.classroomId = classroomId
  }

  const classroomWhere: Prisma.ClassroomWhereInput = {}
  if (buildingId && buildingId !== "all") {
    classroomWhere.buildingId = buildingId
  }
  if (session.user.role === UserRole.TEACHER) {
    classroomWhere.responsibleId = session.user.id
  }
  if (Object.keys(classroomWhere).length > 0) {
    wsFilter.classroom = classroomWhere
  }

  if (Object.keys(wsFilter).length > 0) {
    where.workstation = wsFilter
  }

  const rows = await db.equipment.findMany({
    where,
    orderBy: [{ name: "asc" }],
    include: {
      category: true,
      equipmentKind: true,
      workstation: {
        include: {
          classroom: {
            include: { building: { select: { id: true, name: true } } },
          },
        },
      },
    },
  })

  const relocationLabels = await buildActiveRelocationLabels()

  const equipment = rows.map((e) => ({
    id: e.id,
    name: e.name,
    inventoryNumber: e.inventoryNumber,
    serialNumber: e.serialNumber,
    status: e.status,
    description: e.description,
    purchaseDate: e.purchaseDate ? e.purchaseDate.toISOString().slice(0, 10) : null,
    warrantyUntil: e.warrantyUntil ? e.warrantyUntil.toISOString().slice(0, 10) : null,
    manufacturer: e.manufacturer,
    model: e.model,
    categoryId: e.categoryId,
    categoryName: e.category?.name ?? null,
    categoryColor: e.category?.color ?? null,
    equipmentKindId: e.equipmentKindId,
    kindName: e.equipmentKind?.name ?? null,
    typeEnum: e.type,
    workstationId: e.workstationId,
    workstationCode: e.workstation?.code ?? null,
    workstationName: e.workstation?.name ?? null,
    classroomId: e.workstation?.classroomId ?? null,
    classroomNumber: e.workstation?.classroom?.number ?? null,
    classroomName: e.workstation?.classroom?.name ?? null,
    buildingId: e.workstation?.classroom?.buildingId ?? null,
    buildingName: e.workstation?.classroom?.building?.name ?? null,
    relocationRoomsLabel: relocationLabels.get(e.id) ?? null,
  }))

  return NextResponse.json({ equipment })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createEquipmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const d = parsed.data

  const [kind, category] = await Promise.all([
    db.equipmentKind.findUnique({ where: { id: d.equipmentKindId } }),
    db.equipmentCategory.findUnique({ where: { id: d.categoryId } }),
  ])

  if (!kind) {
    return NextResponse.json({ error: "Тип оборудования не найден" }, { status: 400 })
  }
  if (!category) {
    return NextResponse.json({ error: "Категория не найдена" }, { status: 400 })
  }

  const dup = await db.equipment.findUnique({
    where: { inventoryNumber: d.inventoryNumber.trim() },
    select: { id: true },
  })
  if (dup) {
    return NextResponse.json({ error: "Инвентарный номер уже занят" }, { status: 409 })
  }

  if (d.workstationId) {
    const ws = await db.workstation.findUnique({ where: { id: d.workstationId } })
    if (!ws) {
      return NextResponse.json({ error: "Рабочее место не найдено" }, { status: 400 })
    }
  }

  const row = await db.$transaction(async (tx) => {
    const created = await tx.equipment.create({
      data: {
        inventoryNumber: d.inventoryNumber.trim(),
        name: d.name.trim(),
        type: kind.mapsToEnum,
        status: initialEquipmentStatusForCreate(d.workstationId ?? null, d.status),
        categoryId: d.categoryId,
        equipmentKindId: d.equipmentKindId,
        workstationId: d.workstationId ?? null,
        manufacturer: d.manufacturer?.trim() || null,
        model: d.model?.trim() || null,
        serialNumber: d.serialNumber?.trim() || null,
        purchaseDate: d.purchaseDate ?? null,
        warrantyUntil: d.warrantyUntil ?? null,
        description: d.description?.trim() || null,
      },
    })

    if (created.workstationId) {
      await syncWorkstationKitFromEquipment(tx, created.workstationId)
      await syncWorkstationStatusFromEquipment(tx, created.workstationId)
    }

    return created
  })

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 })
}
