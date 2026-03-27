import { NextResponse } from "next/server"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, UserStatus } from "@prisma/client"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [teachers, classrooms] = await Promise.all([
    db.user.findMany({
      where: { role: UserRole.TEACHER, status: UserStatus.ACTIVE },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        responsibleRooms: {
          where: { isActive: true },
          orderBy: { number: "asc" },
          select: {
            id: true,
            number: true,
            name: true,
            building: { select: { name: true } },
          },
        },
      },
    }),
    db.classroom.findMany({
      where: { isActive: true },
      orderBy: { number: "asc" },
      select: {
        id: true,
        number: true,
        name: true,
        building: { select: { name: true } },
        responsibleId: true,
        responsible: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
          },
        },
      },
    }),
  ])

  return NextResponse.json({
    teachers: teachers.map((t) => ({
      id: t.id,
      firstName: t.firstName,
      lastName: t.lastName,
      middleName: t.middleName,
      email: t.email,
      classrooms: t.responsibleRooms.map((r) => ({
        id: r.id,
        number: r.number,
        name: r.name,
        building: r.building?.name ?? null,
      })),
    })),
    classrooms: classrooms.map((c) => ({
      id: c.id,
      number: c.number,
      name: c.name,
      building: c.building?.name ?? null,
      responsibleId: c.responsibleId,
      responsible: c.responsible,
    })),
  })
}
