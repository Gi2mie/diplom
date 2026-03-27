import { normalizeRuPhoneDigits, formatRuPhoneMask } from "@/lib/ru-phone"

/** Домен только @nhtk (без поддоменов), локальная часть не пустая */
const NHTK_EMAIL = /^[^\s@]+@nhtk$/i

export function normalizeNhtkEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isValidNhtkEmail(raw: string): boolean {
  const e = normalizeNhtkEmail(raw)
  return NHTK_EMAIL.test(e)
}

/** Полный email из локальной части (домен @nhtk подставляется автоматически) */
export function composeNhtkEmail(localPart: string): string {
  return normalizeNhtkEmail(`${localPart.trim()}@nhtk`)
}

/** Локальная часть для отображения в форме (только поле «до @») */
export function emailLocalPartFromNhtkEmail(fullEmail: string): string {
  const e = normalizeNhtkEmail(fullEmail)
  const suffix = "@nhtk"
  if (e.endsWith(suffix)) return e.slice(0, -suffix.length)
  const i = e.lastIndexOf("@")
  return i >= 0 ? e.slice(0, i) : e
}

/** Если вставили user@nhtk или user@ — оставить только локальную часть */
export function sanitizeEmailLocalInput(raw: string): string {
  const v = raw.trim()
  if (!v.includes("@")) return v
  const at = v.indexOf("@")
  const local = v.slice(0, at).trim()
  return local
}

export function validateUserPhoneOrThrow(raw: string): string {
  const digits = normalizeRuPhoneDigits(raw)
  if (digits.length !== 11) {
    throw new Error("Введите номер полностью: +7 и 10 цифр (всего 11 цифр)")
  }
  return formatRuPhoneMask(digits)
}
