import { EquipmentStatus, IssueStatus, RepairStatus, type Prisma } from "@prisma/client"
import { syncWorkstationStatusFromEquipment } from "@/lib/workstation-status-sync"

type Tx = Prisma.TransactionClient

/**
 * Статус оборудования вычисляется автоматически:
 * - есть ремонт в очереди -> IN_REPAIR
 * - есть ремонт в работе -> NEEDS_CHECK
 * - есть открытая неисправность -> NEEDS_CHECK
 * - иначе -> OPERATIONAL
 */
export async function recomputeEquipmentStatus(tx: Tx, equipmentId: string) {
  const wsRow = await tx.equipment.findUnique({
    where: { id: equipmentId },
    select: { workstationId: true },
  })

  const activeRepairs = await tx.repair.findMany({
    where: {
      equipmentId,
      status: { in: [RepairStatus.PLANNED, RepairStatus.IN_PROGRESS] },
    },
    select: { status: true },
  })

  let nextStatus: EquipmentStatus = EquipmentStatus.OPERATIONAL

  if (activeRepairs.some((r) => r.status === RepairStatus.PLANNED)) {
    nextStatus = EquipmentStatus.IN_REPAIR
  } else if (activeRepairs.some((r) => r.status === RepairStatus.IN_PROGRESS)) {
    nextStatus = EquipmentStatus.NEEDS_CHECK
  } else {
    const hasOpenIssue = await tx.issueReport.findFirst({
      where: {
        equipmentId,
        status: { in: [IssueStatus.NEW, IssueStatus.IN_PROGRESS] },
      },
      select: { id: true },
    })
    nextStatus = hasOpenIssue ? EquipmentStatus.NEEDS_CHECK : EquipmentStatus.OPERATIONAL
  }

  await tx.equipment.update({
    where: { id: equipmentId },
    data: { status: nextStatus },
  })

  if (wsRow?.workstationId) {
    await syncWorkstationStatusFromEquipment(tx, wsRow.workstationId)
  }
}

export async function recomputeEquipmentStatuses(tx: Tx, equipmentIds: string[]) {
  const ids = [...new Set(equipmentIds.filter(Boolean))]
  for (const id of ids) {
    await recomputeEquipmentStatus(tx, id)
  }
}
