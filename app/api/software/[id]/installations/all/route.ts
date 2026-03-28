import { NextResponse } from "next/server"
import { EquipmentType } from "@prisma/client"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { normalizeLicenseDateForDb } from "@/lib/software-dates"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id: softwareId } = await params
  const software = await db.software.findUnique({ where: { id: softwareId } })
  if (!software) {
    return NextResponse.json({ error: "ПО не найдено" }, { status: 404 })
  }

  const computers = await db.equipment.findMany({
    where: {
      type: EquipmentType.COMPUTER,
      isActive: true,
      workstationId: { not: null },
    },
    select: { id: true },
  })

  const data = computers.map((eq) => ({
    equipmentId: eq.id,
    softwareId,
    version: software.version || null,
    licenseKey: software.defaultLicenseKey ?? null,
    expiresAt: normalizeLicenseDateForDb(software.licenseExpiresAt),
  }))

  if (data.length === 0) {
    return NextResponse.json(
      { error: "В системе нет рабочих мест с зарегистрированным ПК" },
      { status: 400 }
    )
  }

  await db.installedSoftware.createMany({ data, skipDuplicates: true })

  return NextResponse.json({ ok: true, targets: data.length })
}
