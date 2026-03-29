import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { RepairStatus, UserRole } from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { recomputeEquipmentStatus } from "@/lib/equipment-status-sync"
import { patchRepairStatusSchema } from "@/lib/validators"

const repairInclude = {
  equipment: {
    include: {
      workstation: {
        include: {
          classroom: { include: { building: { select: { name: true } } } },
        },
      },
    },
  },
  issueReport: {
    select: { id: true, title: true, status: true },
  },
  assignedTo: {
    select: { id: true, firstName: true, lastName: true, middleName: true },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, middleName: true },
  },
} as const

/** Смена статуса ремонта (администратор). Синхронизирует статус оборудования. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 })
  }

  const parsed = patchRepairStatusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const nextStatus = parsed.data.status

  const repair = await db.repair.findUnique({ where: { id } })
  if (!repair) {
    return NextResponse.json({ error: "Ремонт не найден" }, { status: 404 })
  }

  const data: Prisma.RepairUpdateInput = { status: nextStatus }

  if (nextStatus === RepairStatus.COMPLETED) {
    data.completedAt = repair.completedAt ?? new Date()
  } else {
    data.completedAt = null
  }

  if (nextStatus === RepairStatus.PLANNED) {
    data.startedAt = null
  } else if (nextStatus === RepairStatus.IN_PROGRESS && !repair.startedAt) {
    data.startedAt = new Date()
  }

  const updated = await db.$transaction(async (tx) => {
    const updatedRepair = await tx.repair.update({
      where: { id },
      data,
      include: repairInclude,
    })
    await recomputeEquipmentStatus(tx, repair.equipmentId)
    return updatedRepair
  })

  return NextResponse.json({ repair: updated })
}
