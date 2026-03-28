import { NextResponse } from "next/server"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateBuildingSchema } from "@/lib/validators"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const existing = await db.building.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    return NextResponse.json({ error: "Корпус не найден" }, { status: 404 })
  }

  const body = await request.json()
  const parsed = updateBuildingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const d = parsed.data
  await db.building.update({
    where: { id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.address !== undefined ? { address: d.address } : {}),
      ...(d.floors !== undefined ? { floors: d.floors } : {}),
      ...(d.description !== undefined ? { description: d.description } : {}),
    },
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
  const n = await db.classroom.count({ where: { buildingId: id } })
  if (n > 0) {
    return NextResponse.json(
      { error: "Нельзя удалить корпус с привязанными аудиториями" },
      { status: 400 }
    )
  }

  await db.building.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
