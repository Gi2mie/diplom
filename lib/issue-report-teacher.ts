import { EquipmentType } from "@prisma/client"
import type { PrismaClient } from "@prisma/client"

function preferComputer<T extends { id: string; type: EquipmentType }>(rows: T[]): T | undefined {
  return rows.find((e) => e.type === EquipmentType.COMPUTER) ?? rows[0]
}

/**
 * ID оборудования для создания обращений: по одному «якорю» на выбранное РМ или на каждое РМ в аудитории.
 * Предпочтительно устройство типа COMPUTER на рабочем месте.
 */
export async function resolveEquipmentIdsForTeacherIssue(
  db: PrismaClient,
  classroomId: string,
  options: { wholeClassroom: boolean; workstationId: string | null }
): Promise<string[]> {
  const base = {
    isActive: true,
    workstationId: { not: null },
    workstation: { classroomId },
  } as const

  if (!options.wholeClassroom && options.workstationId) {
    const rows = await db.equipment.findMany({
      where: { ...base, workstationId: options.workstationId },
      select: { id: true, type: true },
    })
    const pick = preferComputer(rows)
    return pick ? [pick.id] : []
  }

  const rows = await db.equipment.findMany({
    where: base,
    select: { id: true, workstationId: true, type: true },
  })

  const byWs = new Map<string, { id: string; type: EquipmentType }[]>()
  for (const e of rows) {
    if (!e.workstationId) continue
    const list = byWs.get(e.workstationId) ?? []
    list.push({ id: e.id, type: e.type })
    byWs.set(e.workstationId, list)
  }

  const ids: string[] = []
  for (const [, list] of byWs) {
    const pick = preferComputer(list)
    if (pick) ids.push(pick.id)
  }
  return [...new Set(ids)]
}
