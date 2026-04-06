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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const includeCreds = isAdminSession(session)
  const user = await db.user.findUnique({
    where: { id },
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
      ...(includeCreds ? { handoutPasswordPlain: true } : {}),
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  if (id !== session.user.id && !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({
    user: toPublicUserJson(user, { includeCredentials: includeCreds }),
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
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

  if (password !== undefined && String(password).trim() !== "") {
    if (id === session.user.id) {
      return NextResponse.json(
        {
          error:
            "Свой пароль меняйте в профиле: укажите текущий пароль. Чужой пароль (преподавателя или другого администратора) задаётся в разделе «Пользователи».",
        },
        { status: 400 }
      )
    }
  }

  let nextEmail: string | undefined
  if (email !== undefined) {
    nextEmail = normalizeNhtkEmail(email)
    if (!isValidNhtkEmail(nextEmail)) {
      return NextResponse.json(
        { error: "Email должен быть вида имя@nhtk (домен только @nhtk)" },
        { status: 400 }
      )
    }
    const existing = await db.user.findFirst({
      where: { email: nextEmail, id: { not: id } },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 409 })
    }
  }

  let nextPhone: string | null | undefined
  if (phone !== undefined) {
    try {
      nextPhone = phone ? validateUserPhoneOrThrow(phone) : null
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Некорректный телефон" },
        { status: 400 }
      )
    }
    if (!nextPhone) {
      return NextResponse.json({ error: "Укажите номер телефона полностью" }, { status: 400 })
    }
  }

  if (status === UserStatus.INACTIVE) {
    return NextResponse.json({ error: "Статус «Неактивен» недопустим" }, { status: 400 })
  }
  if (status !== undefined && status !== UserStatus.ACTIVE && status !== UserStatus.BLOCKED) {
    return NextResponse.json({ error: "Недопустимый статус" }, { status: 400 })
  }

  const passwordTrim = password !== undefined ? String(password).trim() : ""
  const nextHandout =
    passwordTrim !== ""
      ? { passwordHash: await bcrypt.hash(passwordTrim, 12), handoutPasswordPlain: passwordTrim }
      : {}

  const user = await db.user.update({
    where: { id },
    data: {
      ...(firstName !== undefined ? { firstName } : {}),
      ...(lastName !== undefined ? { lastName } : {}),
      ...(middleName !== undefined ? { middleName: middleName || null } : {}),
      ...(nextEmail !== undefined ? { email: nextEmail } : {}),
      ...(nextPhone !== undefined ? { phone: nextPhone } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(status !== undefined ? { status, isActive: status === UserStatus.ACTIVE } : {}),
      ...(position !== undefined ? { position: position || null } : {}),
      ...(department !== undefined ? { department: department || null } : {}),
      ...nextHandout,
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
      handoutPasswordPlain: true,
      responsibleRooms: userResponsibleRoomsSelect,
    },
  })

  return NextResponse.json({ user: toPublicUserJson(user, { includeCredentials: true }) })
}
