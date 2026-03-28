import { NextResponse } from "next/server"
import { EquipmentType } from "@prisma/client"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { normalizeLicenseDateForDb } from "@/lib/software-dates"
import type { SoftwareLicenseDefaults } from "@/lib/software-db"
import { assignSoftwareWorkstationsSchema } from "@/lib/validators"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id: softwareId } = await params
  const softwareRow = await db.software.findUnique({ where: { id: softwareId } })
  if (!softwareRow) {
    return NextResponse.json({ error: "ПО не найдено" }, { status: 404 })
  }
  const software = softwareRow as unknown as SoftwareLicenseDefaults

  const body = await request.json()
  const parsed = assignSoftwareWorkstationsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const rows: {
    equipmentId: string
    softwareId: string
    version: string | null
    licenseKey: string | null
    expiresAt: Date | null
  }[] = []

  for (const wsId of parsed.data.workstationIds) {
    const eq = await db.equipment.findFirst({
      where: {
        workstationId: wsId,
        type: EquipmentType.COMPUTER,
        isActive: true,
      },
      select: { id: true },
    })
    if (!eq) continue
    rows.push({
      equipmentId: eq.id,
      softwareId,
      version: software.version || null,
      licenseKey: software.defaultLicenseKey ?? null,
      expiresAt: normalizeLicenseDateForDb(software.licenseExpiresAt),
    })
  }

  if (rows.length === 0) {
    return NextResponse.json(
      {
        error:
          "На выбранных рабочих местах нет зарегистрированного ПК (тип «Компьютер»). Добавьте ПК в «Конфигурация ПК».",
      },
      { status: 400 }
    )
  }

  await db.installedSoftware.createMany({ data: rows, skipDuplicates: true })

  return NextResponse.json({ ok: true, added: rows.length })
}
