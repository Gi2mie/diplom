import { NextResponse } from "next/server"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { licenseDateToApiYmd, normalizeLicenseDateForDb } from "@/lib/software-dates"
import type { SoftwareCatalogScalars } from "@/lib/software-db"
import { updateSoftwareSchema } from "@/lib/validators"

type SoftwareWithInstallations = SoftwareCatalogScalars & {
  installations: Array<{
    id: string
    version: string | null
    licenseKey: string | null
    expiresAt: Date | null
    installedAt: Date
    equipment: {
      workstation: {
        id: string
        code: string
        name: string | null
        classroom: {
          number: string
          name: string | null
          building: { id: string; name: string } | null
        } | null
      } | null
    }
  }>
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const raw = await db.software.findUnique({
    where: { id },
    include: {
      installations: {
        include: {
          equipment: {
            include: {
              workstation: {
                include: {
                  classroom: { include: { building: { select: { id: true, name: true } } } },
                },
              },
            },
          },
        },
      },
    },
  })

  const s = raw as SoftwareWithInstallations | null

  if (!s) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 })
  }

  return NextResponse.json({
    id: s.id,
    name: s.name,
    version: s.version,
    vendor: s.vendor,
    category: s.category,
    licenseKind: s.licenseKind,
    licenseType: s.licenseType,
    defaultLicenseKey: s.defaultLicenseKey,
    licenseExpiresAt: licenseDateToApiYmd(s.licenseExpiresAt),
    description: s.description,
    installations: s.installations.map((i) => ({
      id: i.id,
      version: i.version,
      licenseKey: i.licenseKey,
      expiresAt: licenseDateToApiYmd(i.expiresAt),
      installedAt: i.installedAt.toISOString().slice(0, 10),
      workstationId: i.equipment.workstation?.id ?? null,
      workstationCode: i.equipment.workstation?.code ?? null,
      workstationName: i.equipment.workstation?.name ?? null,
      classroomNumber: i.equipment.workstation?.classroom?.number ?? null,
      classroomName: i.equipment.workstation?.classroom?.name ?? null,
      buildingName: i.equipment.workstation?.classroom?.building?.name ?? null,
    })),
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const existingRaw = await db.software.findUnique({ where: { id } })
  if (!existingRaw) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 })
  }
  const existing = existingRaw as unknown as SoftwareCatalogScalars

  const body = await request.json()
  const parsed = updateSoftwareSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const d = parsed.data
  const nextName = d.name !== undefined ? d.name.trim() : existing.name
  const nextVersion = d.version !== undefined ? d.version.trim() : existing.version

  if (nextName !== existing.name || nextVersion !== existing.version) {
    const dup = await db.software.findFirst({
      where: {
        name: nextName,
        version: nextVersion,
        NOT: { id },
      } as never,
    })
    if (dup) {
      return NextResponse.json({ error: "Такая запись уже есть" }, { status: 409 })
    }
  }

  await db.software.update({
    where: { id },
    data: {
      ...(d.name !== undefined ? { name: nextName } : {}),
      ...(d.version !== undefined ? { version: nextVersion } : {}),
      ...(d.vendor !== undefined ? { vendor: d.vendor?.trim() || null } : {}),
      ...(d.category !== undefined ? { category: d.category } : {}),
      ...(d.licenseKind !== undefined ? { licenseKind: d.licenseKind } : {}),
      ...(d.licenseType !== undefined ? { licenseType: d.licenseType?.trim() || null } : {}),
      ...(d.defaultLicenseKey !== undefined
        ? { defaultLicenseKey: d.defaultLicenseKey?.trim() || null }
        : {}),
      ...(d.licenseExpiresAt !== undefined
        ? { licenseExpiresAt: normalizeLicenseDateForDb(d.licenseExpiresAt) }
        : {}),
      ...(d.description !== undefined ? { description: d.description?.trim() || null } : {}),
    } as never,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const existing = await db.software.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 })
  }

  await db.software.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
