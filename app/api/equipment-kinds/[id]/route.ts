import { NextResponse } from "next/server"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateEquipmentKindSchema } from "@/lib/validators"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const existing = await db.equipmentKind.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    return NextResponse.json({ error: "Тип не найден" }, { status: 404 })
  }

  const body = await request.json()
  const parsed = updateEquipmentKindSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const d = parsed.data
  await db.equipmentKind.update({
    where: { id },
    data: {
      ...(d.name !== undefined ? { name: d.name.trim() } : {}),
      ...(d.description !== undefined ? { description: d.description?.trim() || null } : {}),
      ...(d.mapsToEnum !== undefined ? { mapsToEnum: d.mapsToEnum } : {}),
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
  const kind = await db.equipmentKind.findUnique({
    where: { id },
    select: { code: true },
  })
  if (!kind) {
    return NextResponse.json({ error: "Тип не найден" }, { status: 404 })
  }
  if (kind.code?.startsWith("BUILTIN_")) {
    return NextResponse.json(
      { error: "Системный тип из начальной настройки нельзя удалить" },
      { status: 400 }
    )
  }

  const n = await db.equipment.count({ where: { equipmentKindId: id } })
  if (n > 0) {
    return NextResponse.json(
      { error: "Нельзя удалить тип, к которому привязано оборудование" },
      { status: 400 }
    )
  }

  await db.equipmentKind.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
