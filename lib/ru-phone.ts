/** Российский мобильный: ровно 11 цифр (7 + 10). Отображение: +7(999) 999-99-99 */

export function normalizeRuPhoneDigits(raw: string): string {
  let d = raw.replace(/\D/g, "")
  if (!d) return ""
  if (d[0] === "8") d = "7" + d.slice(1)
  if (d[0] !== "7") d = "7" + d.slice(0, 10)
  return d.slice(0, 11)
}

export function formatRuPhoneMask(digits: string): string {
  const d = normalizeRuPhoneDigits(digits)
  if (!d) return ""
  const rest = d.slice(1)
  if (rest.length === 0) return "+7"
  const a = rest.slice(0, 3)
  if (rest.length <= 3) return `+7(${a}`
  const b = rest.slice(3, 6)
  if (rest.length <= 6) return `+7(${a}) ${b}`
  const c = rest.slice(6, 8)
  const e = rest.slice(8, 10)
  if (rest.length <= 8) return `+7(${a}) ${b}-${c}`
  return `+7(${a}) ${b}-${c}-${e}`
}

export function isCompleteRuPhone11(raw: string): boolean {
  return normalizeRuPhoneDigits(raw).length === 11
}
