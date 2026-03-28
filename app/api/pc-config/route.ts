import { NextResponse } from "next/server"
import { EquipmentType } from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { mapComputerEquipment, type ComputerEquipmentWithRelations } from "@/lib/pc-config-map"
import { createComputerConfig, parsePcConfigSaveBody } from "@/lib/pc-config-persist"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await db.equipment.findMany({
    where: { type: EquipmentType.COMPUTER },
    include: {
      workstation: {
        select: {
          id: true,
          code: true,
          pcName: true,
          classroomId: true,
          classroom: {
            select: {
              id: true,
              number: true,
              name: true,
              building: { select: { name: true } },
            },
          },
        },
      },
      components: true,
      software: {
        include: { software: { select: { name: true } } },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
  })

  const computers = rows.map((r) => mapComputerEquipment(r as ComputerEquipmentWithRelations))

  return NextResponse.json({ computers })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 })
  }

  const parsed = parsePcConfigSaveBody(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const result = await createComputerConfig(parsed.payload)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ computer: result.computer })
}
