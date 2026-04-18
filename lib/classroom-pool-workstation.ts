import type { Prisma } from "@prisma/client"

/**
 * Служебное рабочее место «оборудование кабинета»: код KAB-{номер аудитории}.
 * Не участвует в подсчёте вместимости (места для учебных РМ).
 */
export function classroomPoolWorkstationCode(classroomNumber: string): string {
  return `KAB-${classroomNumber}`
}

export function isClassroomPoolWorkstation(code: string, classroomNumber: string): boolean {
  return code === classroomPoolWorkstationCode(classroomNumber)
}

/** Рабочие места, которые учитываются в лимите capacity аудитории. */
export function prismaWorkstationsCountingTowardCapacity(
  classroomId: string,
  classroomNumber: string
): Prisma.WorkstationWhereInput {
  return {
    classroomId,
    NOT: { code: classroomPoolWorkstationCode(classroomNumber) },
  }
}
