import { EquipmentType, type Prisma } from "@prisma/client"

type Tx = Prisma.TransactionClient

export async function applyEquipmentAttachments(
  tx: Tx,
  args: {
    hostId: string
    attachedEquipmentIds: string[]
    hostWorkstationId: string | null
  }
): Promise<string | null> {
  const { hostId, attachedEquipmentIds, hostWorkstationId } = args
  const uniq = [...new Set(attachedEquipmentIds)]

  await tx.equipment.updateMany({
    where: { parentEquipmentId: hostId },
    data: { parentEquipmentId: null },
  })

  if (uniq.length === 0) {
    return null
  }

  if (!hostWorkstationId) {
    return "Укажите рабочее место, чтобы привязать другое оборудование"
  }

  for (const id of uniq) {
    if (id === hostId) {
      return "Нельзя привязать оборудование к самому себе"
    }
  }

  const rows = await tx.equipment.findMany({
    where: { id: { in: uniq } },
    select: {
      id: true,
      type: true,
      _count: { select: { childEquipments: true } },
    },
  })

  if (rows.length !== uniq.length) {
    return "Одна из выбранных позиций не найдена"
  }

  for (const row of rows) {
    if (row.type === EquipmentType.COMPUTER) {
      return "Нельзя привязать другой компьютер как периферию"
    }
    if (row._count.childEquipments > 0) {
      return "Нельзя привязать оборудование, к которому уже привязаны другие позиции — сначала отвяжите их"
    }
  }

  for (const id of uniq) {
    await tx.equipment.update({
      where: { id },
      data: {
        parentEquipmentId: hostId,
        workstationId: hostWorkstationId,
      },
    })
  }

  return null
}

/** Дочерние записи следуют за родителем при смене рабочего места. */
export async function syncChildrenWorkstationId(
  tx: Tx,
  hostId: string,
  workstationId: string | null
) {
  await tx.equipment.updateMany({
    where: { parentEquipmentId: hostId },
    data: { workstationId },
  })
}
