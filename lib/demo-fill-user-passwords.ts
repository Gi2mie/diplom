import { normalizeNhtkEmail } from "@/lib/user-validation"

/**
 * Пароли учёток из `npm run db:seed:fill` (в БД — только hash).
 * Используется для бланков «данные для входа» у администратора.
 * Держите в синхроне с FILL_*_DEFS в prisma/seed-demo-fill.ts.
 */
export const DEMO_FILL_STAFF_PASSWORDS = {
  "admin@nhtk": "admin123",
  "melnikovaev@nhtk": "melnikova123",
  "zubenkomp@nhtk": "zubenko123",
  "yermakovasv@nhtk": "yermakova123",
  "galkinpr@nhtk": "galkin123",
  "stepanovaai@nhtk": "stepanova123",
  "fedorovmy@nhtk": "fedorov123",
  "melnikop@nhtk": "melnik123",
  "chernovsn@nhtk": "chernov123",
  "lavroved@nhtk": "lavrova123",
} as const

export function demoFillHandoutPasswordPlain(email: string): string | null {
  const key = normalizeNhtkEmail(email)
  const row = DEMO_FILL_STAFF_PASSWORDS as Record<string, string>
  return row[key] ?? null
}
