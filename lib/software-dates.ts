/** Дата «срока» для JSON API: нет значения, эпоха Unix, Invalid Date → null (в UI — прочерк). */
export function licenseDateToApiYmd(d: Date | null | undefined): string | null {
  if (d == null) return null
  const t = d.getTime()
  if (!Number.isFinite(t) || t <= 0) return null
  return d.toISOString().slice(0, 10)
}

/** Перед записью в БД из валидатора: не сохраняем эпоху как осмысленную дату. */
export function normalizeLicenseDateForDb(d: Date | null | undefined): Date | null {
  if (d == null) return null
  const t = d.getTime()
  if (!Number.isFinite(t) || t <= 0) return null
  return d
}
