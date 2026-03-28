import { NextResponse } from "next/server"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { createClassroomTypeSchema } from "@/lib/validators"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createClassroomTypeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const d = parsed.data
  const dup = await db.classroomType.findUnique({ where: { code: d.code }, select: { id: true } })
  if (dup) {
    return NextResponse.json({ error: "Тип с таким кодом уже существует" }, { status: 409 })
  }

  await db.classroomType.create({
    data: {
      name: d.name,
      code: d.code,
      color: d.color,
      description: d.description ?? "",
    },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
