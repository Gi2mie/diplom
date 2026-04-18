import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createRelocationSchema } from "@/lib/validators"
import {
  relocateOneEquipment,
  relocateWholeWorkstation,
} from "@/lib/relocation-service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const rows = await db.relocationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      createdBy: {
        select: { firstName: true, lastName: true, middleName: true },
      },
      equipment: {
        select: { id: true, name: true, inventoryNumber: true },
      },
    },
  })

  const logs = rows.map((r) => {
    const initiator = [r.createdBy.lastName, r.createdBy.firstName, r.createdBy.middleName]
      .filter(Boolean)
      .join(" ")
      .trim()
    const movedIds =
      r.kind === "WORKSTATION" && Array.isArray(r.movedEquipmentIds)
        ? (r.movedEquipmentIds as string[])
        : r.equipmentId
          ? [r.equipmentId]
          : []
    return {
      id: r.id,
      kind: r.kind,
      movedAt: r.createdAt.toISOString(),
      revertedAt: r.revertedAt?.toISOString() ?? null,
      fromClassroomNumber: r.fromClassroomNumber,
      toClassroomNumber: r.toClassroomNumber,
      fromWorkstationCode: r.fromWorkstationCode,
      toWorkstationCode: r.toWorkstationCode,
      equipmentName: r.equipment?.name ?? null,
      inventoryNumber: r.equipment?.inventoryNumber ?? null,
      movedEquipmentCount: movedIds.length,
      initiator: initiator || "—",
    }
  })

  return NextResponse.json({ logs })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 })
  }

  const parsed = createRelocationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Проверьте поля формы", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const userId = session.user.id

  try {
    if (parsed.data.kind === "EQUIPMENT") {
      const log = await relocateOneEquipment({
        userId,
        equipmentId: parsed.data.equipmentId,
        toWorkstationId: parsed.data.toWorkstationId,
      })
      return NextResponse.json({ ok: true, id: log.id })
    }
    const log = await relocateWholeWorkstation({
      userId,
      fromWorkstationId: parsed.data.fromWorkstationId,
      toClassroomId: parsed.data.toClassroomId,
    })
    return NextResponse.json({ ok: true, id: log.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка перемещения"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
