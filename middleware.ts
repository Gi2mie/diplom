import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

const publicRoutes = ["/", "/login"]
const adminRoutes = ["/dashboard"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = await auth()

  // Если это публичный маршрут, пропускаем проверку
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Если пользователь не авторизован, редирект на login
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
