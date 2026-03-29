import { EquipmentType, type Prisma } from "@prisma/client"

type Db = Prisma.TransactionClient

function inferPeripheralFlags(kindName: string | null | undefined): {
  keyboard: boolean
  mouse: boolean
  headphones: boolean
} {
  const kl = (kindName ?? "").toLowerCase()
  return {
    keyboard: /клавиатур|keyboard/i.test(kl),
    mouse: /мыш|mouse/i.test(kl),
    headphones: /наушник|headphone|гарнитур|headset/i.test(kl),
  }
}

/** Пересчитывает флаги комплектации РМ по всему оборудованию, привязанному к этому месту. */
export async function syncWorkstationKitFromEquipment(db: Db, workstationId: string) {
  const list = await db.equipment.findMany({
    where: { workstationId },
    select: { type: true, equipmentKind: { select: { name: true } } },
  })

  let hasMonitor = false
  let hasKeyboard = false
  let hasMouse = false
  let hasHeadphones = false

  for (const e of list) {
    if (e.type === EquipmentType.MONITOR) hasMonitor = true
    if (e.type === EquipmentType.PERIPHERAL || e.type === EquipmentType.OTHER) {
      const p = inferPeripheralFlags(e.equipmentKind?.name)
      if (p.keyboard) hasKeyboard = true
      if (p.mouse) hasMouse = true
      if (p.headphones) hasHeadphones = true
    }
  }

  await db.workstation.update({
    where: { id: workstationId },
    data: { hasMonitor, hasKeyboard, hasMouse, hasHeadphones },
  })
}
