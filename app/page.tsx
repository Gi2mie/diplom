import { redirect } from "next/navigation"

/**
 * HOME PAGE
 * 
 * ВРЕМЕННО: Редирект напрямую на dashboard без проверки авторизации.
 * 
 * ДЛЯ ВОССТАНОВЛЕНИЯ АВТОРИЗАЦИИ:
 * 1. Раскомментировать импорт auth из "@/lib/auth"
 * 2. Вернуть проверку сессии и редирект на /login для неавторизованных
 */

// ОРИГИНАЛЬНЫЙ КОД (закомментирован):
// import { auth } from "@/lib/auth"
// 
// export default async function HomePage() {
//   const session = await auth()
//   if (session) {
//     redirect("/dashboard")
//   } else {
//     redirect("/login")
//   }
// }

export default function HomePage() {
  // В режиме разработки сразу редиректим на dashboard
  redirect("/dashboard")
}
