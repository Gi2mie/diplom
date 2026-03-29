import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateEquipmentSchema } from "@/lib/validators"
import { syncWorkstationKitFromEquipment } from "@/lib/workstation-kit-sync"
import { syncWorkstationStatusFromEquipment } from "@/lib/workstation-status-sync"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const e = await db.equipment.findUnique({
    where: { id },
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

  if (!e) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 })
  }

  if (session.user.role === UserRole.TEACHER) {
    const rid = e.workstation?.classroom?.responsibleId
    if (!e.workstationId || rid !== session.user.id) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 })
    }
  }

  return NextResponse.json({
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
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const existing = await db.equipment.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Оборудование не найдено" }, { status: 404 })
  }

  const body = await request.json()
  const parsed = updateEquipmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const d = parsed.data

  if (d.inventoryNumber && d.inventoryNumber.trim() !== existing.inventoryNumber) {
    const dup = await db.equipment.findUnique({
      where: { inventoryNumber: d.inventoryNumber.trim() },
      select: { id: true },
    })
    if (dup) {
      return NextResponse.json({ error: "Инвентарный номер уже занят" }, { status: 409 })
    }
  }

  if (d.workstationId) {
    const ws = await db.workstation.findUnique({ where: { id: d.workstationId } })
    if (!ws) {
      return NextResponse.json({ error: "Рабочее место не найдено" }, { status: 400 })
    }
  }

  if (d.categoryId) {
    const cat = await db.equipmentCategory.findUnique({ where: { id: d.categoryId } })
    if (!cat) {
      return NextResponse.json({ error: "Категория не найдена" }, { status: 400 })
    }
  }

  let mapsToEnum = existing.type
  if (d.equipmentKindId) {
    const kind = await db.equipmentKind.findUnique({ where: { id: d.equipmentKindId } })
    if (!kind) {
      return NextResponse.json({ error: "Тип оборудования не найден" }, { status: 400 })
    }
    mapsToEnum = kind.mapsToEnum
  }

  const prevWorkstationId = existing.workstationId
  const nextWorkstationId = d.workstationId !== undefined ? d.workstationId : existing.workstationId

  await db.$transaction(async (tx) => {
    await tx.equipment.update({
      where: { id },
      data: {
        ...(d.inventoryNumber !== undefined ? { inventoryNumber: d.inventoryNumber.trim() } : {}),
        ...(d.name !== undefined ? { name: d.name.trim() } : {}),
        ...(d.categoryId !== undefined ? { categoryId: d.categoryId } : {}),
        ...(d.equipmentKindId !== undefined
          ? { equipmentKindId: d.equipmentKindId, type: mapsToEnum }
          : {}),
        ...(d.workstationId !== undefined ? { workstationId: d.workstationId } : {}),
        ...(d.manufacturer !== undefined ? { manufacturer: d.manufacturer?.trim() || null } : {}),
        ...(d.model !== undefined ? { model: d.model?.trim() || null } : {}),
        ...(d.serialNumber !== undefined ? { serialNumber: d.serialNumber?.trim() || null } : {}),
        ...(d.purchaseDate !== undefined ? { purchaseDate: d.purchaseDate ?? null } : {}),
        ...(d.warrantyUntil !== undefined ? { warrantyUntil: d.warrantyUntil ?? null } : {}),
        ...(d.description !== undefined ? { description: d.description?.trim() || null } : {}),
        ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
      },
    })

    if (prevWorkstationId && prevWorkstationId !== nextWorkstationId) {
      await syncWorkstationKitFromEquipment(tx, prevWorkstationId)
      await syncWorkstationStatusFromEquipment(tx, prevWorkstationId)
    }
    if (nextWorkstationId) {
      await syncWorkstationKitFromEquipment(tx, nextWorkstationId)
      await syncWorkstationStatusFromEquipment(tx, nextWorkstationId)
    }
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const existing = await db.equipment.findUnique({
    where: { id },
    select: { id: true, workstationId: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 })
  }

  await db.$transaction(async (tx) => {
    await tx.equipment.delete({ where: { id } })
    if (existing.workstationId) {
      await syncWorkstationKitFromEquipment(tx, existing.workstationId)
      await syncWorkstationStatusFromEquipment(tx, existing.workstationId)
    }
  })
  return NextResponse.json({ ok: true })
}
