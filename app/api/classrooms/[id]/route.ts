import { NextResponse } from "next/server"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateClassroomSchema } from "@/lib/validators"
import { isActiveFromListingStatus } from "@/lib/classroom-listing-status"
import { classroomPoolWorkstationCode } from "@/lib/classroom-pool-workstation"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const existing = await db.classroom.findUnique({
    where: { id },
    select: { id: true, number: true, buildingId: true, floor: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Аудитория не найдена" }, { status: 404 })
  }

  const body = await request.json()
  const parsed = updateClassroomSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const data = parsed.data

  if (data.number !== undefined && data.number !== existing.number) {
    const dup = await db.classroom.findUnique({ where: { number: data.number }, select: { id: true } })
    if (dup) {
      return NextResponse.json({ error: `Аудитория с номером ${data.number} уже есть` }, { status: 409 })
    }
  }

  if (data.buildingId !== undefined && data.buildingId !== null) {
    const b = await db.building.findUnique({
      where: { id: data.buildingId },
      select: { id: true, floors: true, name: true },
    })
    if (!b) return NextResponse.json({ error: "Корпус не найден" }, { status: 400 })
  }

  const nextBuildingId =
    data.buildingId !== undefined ? data.buildingId : existing.buildingId
  const nextFloor = data.floor !== undefined ? data.floor : existing.floor
  if (nextBuildingId && nextFloor != null) {
    const b = await db.building.findUnique({
      where: { id: nextBuildingId },
      select: { floors: true, name: true },
    })
    if (
      b &&
      b.floors >= 1 &&
      (nextFloor < 1 || nextFloor > b.floors)
    ) {
      return NextResponse.json(
        { error: `Этаж не может быть больше ${b.floors} (корпус «${b.name}»).` },
        { status: 400 }
      )
    }
  }
  if (data.classroomTypeId !== undefined && data.classroomTypeId !== null) {
    const t = await db.classroomType.findUnique({ where: { id: data.classroomTypeId }, select: { id: true } })
    if (!t) return NextResponse.json({ error: "Тип аудитории не найден" }, { status: 400 })
  }
  if (data.responsibleId !== undefined && data.responsibleId !== null) {
    const u = await db.user.findUnique({ where: { id: data.responsibleId }, select: { id: true } })
    if (!u) return NextResponse.json({ error: "Ответственный не найден" }, { status: 400 })
  }

  const updateData: {
    number?: string
    name?: string | null
    buildingId?: string | null
    classroomTypeId?: string | null
    floor?: number | null
    capacity?: number | null
    description?: string | null
    responsibleId?: string | null
    listingStatus?: (typeof data)["listingStatus"]
    isActive?: boolean
  } = {}
  if (data.number !== undefined) updateData.number = data.number
  if (data.name !== undefined) updateData.name = data.name
  if (data.buildingId !== undefined) updateData.buildingId = data.buildingId
  if (data.classroomTypeId !== undefined) updateData.classroomTypeId = data.classroomTypeId
  if (data.floor !== undefined) updateData.floor = data.floor
  if (data.capacity !== undefined) updateData.capacity = data.capacity
  if (data.description !== undefined) updateData.description = data.description
  if (data.responsibleId !== undefined) updateData.responsibleId = data.responsibleId
  if (data.listingStatus !== undefined) {
    updateData.listingStatus = data.listingStatus
    updateData.isActive = isActiveFromListingStatus(data.listingStatus)
  }
  if (data.isActive !== undefined && data.listingStatus === undefined) {
    updateData.isActive = data.isActive
  }

  await db.$transaction(async (tx) => {
    await tx.classroom.update({
      where: { id },
      data: updateData,
    })
    if (data.number !== undefined && data.number !== existing.number) {
      const oldPool = classroomPoolWorkstationCode(existing.number)
      const newPool = classroomPoolWorkstationCode(data.number)
      const poolWs = await tx.workstation.findFirst({
        where: { classroomId: id, code: oldPool },
        select: { id: true },
      })
      if (poolWs) {
        await tx.workstation.update({
          where: { id: poolWs.id },
          data: { code: newPool, name: newPool },
        })
      }
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
  const existing = await db.classroom.findUnique({
    where: { id },
    select: { id: true, number: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Аудитория не найдена" }, { status: 404 })
  }
  const poolCode = classroomPoolWorkstationCode(existing.number)
  const nonPoolCount = await db.workstation.count({
    where: { classroomId: id, NOT: { code: poolCode } },
  })
  if (nonPoolCount > 0) {
    return NextResponse.json(
      { error: "Нельзя удалить аудиторию, пока в ней есть учебные рабочие места (кроме служебного KAB)." },
      { status: 400 }
    )
  }

  await db.classroom.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
