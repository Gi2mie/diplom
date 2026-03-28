import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [categoriesRaw, kindsRaw] = await Promise.all([
    db.equipmentCategory.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { equipment: true } } },
    }),
    db.equipmentKind.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { equipment: true } } },
    }),
  ])

  return NextResponse.json({
    categories: categoriesRaw.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      color: c.color,
      equipmentCount: c._count.equipment,
    })),
    kinds: kindsRaw.map((k) => ({
      id: k.id,
      name: k.name,
      description: k.description,
      mapsToEnum: k.mapsToEnum,
      code: k.code,
      equipmentCount: k._count.equipment,
    })),
  })
}
