import { NextResponse } from "next/server"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { createEquipmentKindSchema } from "@/lib/validators"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createEquipmentKindSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const d = parsed.data
  const row = await db.equipmentKind.create({
    data: {
      name: d.name.trim(),
      description: d.description?.trim() || null,
      mapsToEnum: d.mapsToEnum,
    },
  })

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 })
}
