import { EquipmentType } from "@prisma/client"
import type { PrismaClient } from "@prisma/client"

function preferComputer<T extends { id: string; type: EquipmentType }>(rows: T[]): T | undefined {
  return rows.find((e) => e.type === EquipmentType.COMPUTER) ?? rows[0]
}

/**
 * ID оборудования для создания обращения преподавателя.
 * - Для одного РМ: выбирается «якорь» этого места (предпочтительно COMPUTER).
 * - Для всей аудитории: создаётся ОДНО обращение на аудиторию (якорь по всей аудитории).
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
    select: { id: true, type: true },
  })
  const pick = preferComputer(rows)
  return pick ? [pick.id] : []
}
