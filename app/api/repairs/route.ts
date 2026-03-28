import { NextResponse } from "next/server"
import { RepairStatus, UserRole } from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

/** Активные и все ремонты для администратора. */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get("active") === "1" || searchParams.get("active") === "true"

  const where = activeOnly
    ? { status: { in: [RepairStatus.PLANNED, RepairStatus.IN_PROGRESS] as const } }
    : {}

  const repairs = await db.repair.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      equipment: {
        include: {
          workstation: {
            include: {
              classroom: { include: { building: { select: { name: true } } } },
            },
          },
        },
      },
      issueReport: {
        select: { id: true, title: true, status: true },
      },
      assignedTo: {
        select: { id: true, firstName: true, lastName: true, middleName: true },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true, middleName: true },
      },
    },
  })

  return NextResponse.json({ repairs })
}
