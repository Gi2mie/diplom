import {
  EquipmentStatus,
  IssueStatus,
  RepairStatus,
  WorkstationStatus,
  type Prisma,
} from "@prisma/client"

type Tx = Prisma.TransactionClient

/**
 * Оборудование «на обслуживании» для РМ и UI: активный ремонт, открытая неисправность
 * или статус «в ремонте» / «требует проверки». Списанное / не в эксплуатации РМ целиком не переводит.
 */
export function isEquipmentOnService(args: {
  status: EquipmentStatus
  hasOpenIssue: boolean
  hasActiveRepair: boolean
}): boolean {
  if (args.hasActiveRepair || args.hasOpenIssue) return true
  return (
    args.status === EquipmentStatus.IN_REPAIR || args.status === EquipmentStatus.NEEDS_CHECK
  )
}

/** Статус РМ для API/клиента по уже посчитанным флагам «на обслуживании» (совпадает с логикой sync). */
export function workstationStatusFromOnServiceFlags(
  items: { onService: boolean }[]
): WorkstationStatus {
  return items.some((i) => i.onService) ? WorkstationStatus.MAINTENANCE : WorkstationStatus.ACTIVE
}

/**
 * Статус рабочего места: MAINTENANCE, если хотя бы одна единица оборудования «на обслуживании»;
 * иначе ACTIVE (все привязанное оборудование «исправно» и без открытых заявок/ремонтов).
 */
export async function syncWorkstationStatusFromEquipment(tx: Tx, workstationId: string) {
  const rows = await tx.equipment.findMany({
    where: { workstationId },
    select: {
      id: true,
      status: true,
      issueReports: {
        where: { status: { in: [IssueStatus.NEW, IssueStatus.IN_PROGRESS] } },
        take: 1,
        select: { id: true },
      },
      repairs: {
        where: { status: { in: [RepairStatus.PLANNED, RepairStatus.IN_PROGRESS] } },
        take: 1,
        select: { id: true },
      },
    },
  })

  let maintenance = false
  for (const e of rows) {
    if (
      isEquipmentOnService({
        status: e.status,
        hasOpenIssue: e.issueReports.length > 0,
        hasActiveRepair: e.repairs.length > 0,
      })
    ) {
      maintenance = true
      break
    }
  }

  await tx.workstation.update({
    where: { id: workstationId },
    data: { status: maintenance ? WorkstationStatus.MAINTENANCE : WorkstationStatus.ACTIVE },
  })
}
