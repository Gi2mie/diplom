/** Соответствует enum SoftwareCatalogCategory в prisma/schema.prisma */
export const SOFTWARE_CATALOG_CATEGORIES = [
  "OFFICE",
  "DEVELOPMENT",
  "GRAPHICS",
  "UTILITIES",
  "SECURITY",
  "OTHER",
] as const
export type SoftwareCatalogCategoryValue = (typeof SOFTWARE_CATALOG_CATEGORIES)[number]

/** Соответствует enum SoftwareLicenseKind в prisma/schema.prisma */
export const SOFTWARE_LICENSE_KINDS = ["FREE", "PAID", "EDUCATIONAL"] as const
export type SoftwareLicenseKindValue = (typeof SOFTWARE_LICENSE_KINDS)[number]

export function isSoftwareCatalogCategory(
  v: string | null
): v is SoftwareCatalogCategoryValue {
  return v !== null && (SOFTWARE_CATALOG_CATEGORIES as readonly string[]).includes(v)
}

export function isSoftwareLicenseKind(v: string | null): v is SoftwareLicenseKindValue {
  return v !== null && (SOFTWARE_LICENSE_KINDS as readonly string[]).includes(v)
}

/** Скаляры Software (schema.prisma) — для приведения после find*, если клиент Prisma устарел. */
export type SoftwareCatalogScalars = {
  id: string
  name: string
  version: string
  vendor: string | null
  category: SoftwareCatalogCategoryValue
  licenseKind: SoftwareLicenseKindValue
  defaultLicenseKey: string | null
  licenseExpiresAt: Date | null
  licenseType: string | null
  description: string | null
  createdAt: Date
  updatedAt: Date
}

export type SoftwareLicenseDefaults = Pick<
  SoftwareCatalogScalars,
  "version" | "defaultLicenseKey" | "licenseExpiresAt"
>
