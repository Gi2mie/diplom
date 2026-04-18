import { NextResponse } from "next/server"
import { ClassroomListingStatus, WorkstationStatus } from "@prisma/client"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { createClassroomSchema } from "@/lib/validators"
import { isActiveFromListingStatus } from "@/lib/classroom-listing-status"
import { classroomPoolWorkstationCode } from "@/lib/classroom-pool-workstation"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createClassroomSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const data = parsed.data
  const listingStatus = data.listingStatus ?? ClassroomListingStatus.ACTIVE

  const dup = await db.classroom.findUnique({ where: { number: data.number }, select: { id: true } })
  if (dup) {
    return NextResponse.json({ error: `Аудитория с номером ${data.number} уже есть` }, { status: 409 })
  }

  if (data.buildingId) {
    const b = await db.building.findUnique({
      where: { id: data.buildingId },
      select: { id: true, floors: true, name: true },
    })
    if (!b) return NextResponse.json({ error: "Корпус не найден" }, { status: 400 })
    if (
      data.floor != null &&
      b.floors >= 1 &&
      (data.floor < 1 || data.floor > b.floors)
    ) {
      return NextResponse.json(
        { error: `Этаж не может быть больше ${b.floors} (корпус «${b.name}»).` },
        { status: 400 }
      )
    }
  }
  if (data.classroomTypeId) {
    const t = await db.classroomType.findUnique({ where: { id: data.classroomTypeId }, select: { id: true } })
    if (!t) return NextResponse.json({ error: "Тип аудитории не найден" }, { status: 400 })
  }
  if (data.responsibleId) {
    const u = await db.user.findUnique({ where: { id: data.responsibleId }, select: { id: true } })
    if (!u) return NextResponse.json({ error: "Ответственный не найден" }, { status: 400 })
  }

  await db.$transaction(async (tx) => {
    const classroom = await tx.classroom.create({
      data: {
        number: data.number,
        name: data.name ?? null,
        buildingId: data.buildingId ?? null,
        classroomTypeId: data.classroomTypeId ?? null,
        floor: data.floor ?? null,
        capacity: data.capacity ?? null,
        description: data.description ?? null,
        responsibleId: data.responsibleId ?? null,
        listingStatus,
        isActive: isActiveFromListingStatus(listingStatus),
      },
    })
    const poolCode = classroomPoolWorkstationCode(classroom.number)
    await tx.workstation.create({
      data: {
        code: poolCode,
        classroomId: classroom.id,
        name: poolCode,
        description: "Служебное место: оборудование кабинета без отдельного учебного РМ (не учитывается в вместимости).",
        status: WorkstationStatus.ACTIVE,
        hasMonitor: false,
        hasKeyboard: false,
        hasMouse: false,
        hasHeadphones: false,
        hasOtherEquipment: false,
      },
    })
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
