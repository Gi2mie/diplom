import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, UserStatus } from "@prisma/client"
import {
  isValidNhtkEmail,
  normalizeNhtkEmail,
  validateUserPhoneOrThrow,
} from "@/lib/user-validation"
import { toPublicUserJson, userResponsibleRoomsSelect } from "@/lib/user-serialize"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [users, adminsTotal, blockedTotal] = await Promise.all([
    db.user.findMany({
      where: {
        id: { not: session.user.id },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        position: true,
        department: true,
        createdAt: true,
        lastLoginAt: true,
        responsibleRooms: userResponsibleRoomsSelect,
      },
    }),
    db.user.count({ where: { role: UserRole.ADMIN } }),
    db.user.count({ where: { status: UserStatus.BLOCKED } }),
  ])

  return NextResponse.json({
    users: users.map((u) => toPublicUserJson(u)),
    meta: { adminsTotal, blockedTotal },
  })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const {
    firstName,
    lastName,
    middleName,
    email,
    phone,
    role,
    status,
    position,
    department,
    password,
  } = body as {
    firstName?: string
    lastName?: string
    middleName?: string
    email?: string
    phone?: string
    role?: UserRole
    status?: UserStatus
    position?: string
    department?: string
    password?: string
  }

  if (!firstName || !lastName || !email || !password || !role || !status) {
    return NextResponse.json({ error: "Не заполнены обязательные поля" }, { status: 400 })
  }

  if (status === UserStatus.INACTIVE) {
    return NextResponse.json({ error: "Статус «Неактивен» недопустим" }, { status: 400 })
  }
  if (status !== UserStatus.ACTIVE && status !== UserStatus.BLOCKED) {
    return NextResponse.json({ error: "Недопустимый статус" }, { status: 400 })
  }

  const normalizedEmail = normalizeNhtkEmail(email)
  if (!isValidNhtkEmail(normalizedEmail)) {
    return NextResponse.json(
      { error: "Email должен быть вида имя@nhtk (домен только @nhtk)" },
      { status: 400 }
    )
  }

  let phoneFormatted: string | null = null
  try {
    phoneFormatted = phone ? validateUserPhoneOrThrow(phone) : null
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Некорректный телефон" },
      { status: 400 }
    )
  }
  if (!phoneFormatted) {
    return NextResponse.json({ error: "Укажите номер телефона полностью" }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) {
    return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await db.user.create({
    data: {
      firstName,
      lastName,
      middleName: middleName || null,
      email: normalizedEmail,
      phone: phoneFormatted,
      role,
      status,
      isActive: status === UserStatus.ACTIVE,
      position: position || null,
      department: department || null,
      passwordHash,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      middleName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      position: true,
      department: true,
      createdAt: true,
      lastLoginAt: true,
      responsibleRooms: userResponsibleRoomsSelect,
    },
  })

  return NextResponse.json({ user: toPublicUserJson(user) }, { status: 201 })
}

