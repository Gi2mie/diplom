import { NextResponse } from "next/server"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { createBuildingSchema } from "@/lib/validators"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createBuildingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const d = parsed.data
  await db.building.create({
    data: {
      name: d.name,
      address: d.address ?? "",
      floors: d.floors,
      description: d.description ?? null,
    },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
