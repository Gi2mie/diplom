import { NextResponse } from "next/server"
import { auth, isAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { licenseDateToApiYmd, normalizeLicenseDateForDb } from "@/lib/software-dates"
import {
  isSoftwareCatalogCategory,
  isSoftwareLicenseKind,
  type SoftwareCatalogScalars,
} from "@/lib/software-db"
import { createSoftwareSchema } from "@/lib/validators"

type SoftwareListRow = SoftwareCatalogScalars & { _count: { installations: number } }

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim()
  const category = searchParams.get("category")
  const licenseKind = searchParams.get("licenseKind")
  const workstationId = searchParams.get("workstationId")

  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { vendor: { contains: search, mode: "insensitive" } },
      { version: { contains: search, mode: "insensitive" } },
      {
        installations: {
          some: {
            equipment: {
              inventoryNumber: { contains: search, mode: "insensitive" },
            },
          },
        },
      },
    ]
  }

  if (category && isSoftwareCatalogCategory(category)) {
    where.category = category
  }

  if (licenseKind && isSoftwareLicenseKind(licenseKind)) {
    where.licenseKind = licenseKind
  }

  if (workstationId && workstationId !== "all") {
    where.installations = {
      some: { equipment: { workstationId } },
    }
  }

  const rows = (await db.software.findMany({
    where: where as never,
    orderBy: [{ name: "asc" }, { version: "asc" }] as never,
    include: {
      _count: { select: { installations: true } },
    },
  })) as unknown as SoftwareListRow[]

  const software = rows.map((s) => ({
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
    installationCount: s._count.installations,
  }))

  return NextResponse.json({ software })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createSoftwareSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }

  const d = parsed.data
  const name = d.name.trim()
  const version = (d.version ?? "").trim()

  const dup = await db.software.findFirst({
    where: { name, version } as never,
  })
  if (dup) {
    return NextResponse.json({ error: "Такая запись уже есть в каталоге" }, { status: 409 })
  }

  const row = await db.software.create({
    data: {
      name,
      version,
      vendor: d.vendor?.trim() || null,
      category: d.category,
      licenseKind: d.licenseKind,
      licenseType: d.licenseType?.trim() || null,
      defaultLicenseKey: d.defaultLicenseKey?.trim() || null,
      licenseExpiresAt: normalizeLicenseDateForDb(d.licenseExpiresAt ?? null),
      description: d.description?.trim() || null,
    } as never,
  })

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 })
}
