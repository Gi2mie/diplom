/** Префикс номера рабочего места для выбранной аудитории (номер из справочника). */
export function workstationRmPrefix(classroomNumber: string): string {
  return `RM-${classroomNumber}-`
}

export function workstationCodeMatchesClassroom(code: string, classroomNumber: string): boolean {
  return code.startsWith(workstationRmPrefix(classroomNumber))
}

/** PC-301-01 из RM-301-01 для той же аудитории. */
export function pcNameFromRmCode(code: string, classroomNumber: string): string {
  const p = workstationRmPrefix(classroomNumber)
  if (!code.startsWith(p)) return ""
  return `PC-${classroomNumber}-${code.slice(p.length)}`
}

export function suffixFromRmCode(code: string, classroomNumber: string): string {
  const p = workstationRmPrefix(classroomNumber)
  return code.startsWith(p) ? code.slice(p.length) : ""
}
