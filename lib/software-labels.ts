import { SoftwareCatalogCategory, SoftwareLicenseKind } from "@prisma/client"

export type SoftwareLicenseTypeValue =
  | "free_license"
  | "commercial_license"
  | "proprietary_license"
  | "free_software_license"
  | "open_source_license"

export function softwareCategoryLabel(c: SoftwareCatalogCategory): string {
  switch (c) {
    case SoftwareCatalogCategory.OFFICE:
      return "Офисное ПО"
    case SoftwareCatalogCategory.DEVELOPMENT:
      return "Разработка"
    case SoftwareCatalogCategory.GRAPHICS:
      return "Графика"
    case SoftwareCatalogCategory.UTILITIES:
      return "Утилиты"
    case SoftwareCatalogCategory.SECURITY:
      return "Безопасность"
    case SoftwareCatalogCategory.OTHER:
      return "Другое"
  }
}

export function softwareLicenseKindLabel(k: SoftwareLicenseKind): string {
  switch (k) {
    case SoftwareLicenseKind.FREE:
      return "Бесплатная лицензия"
    case SoftwareLicenseKind.PAID:
      return "Коммерческая лицензия"
    case SoftwareLicenseKind.EDUCATIONAL:
      return "Проприетарная лицензия"
  }
}

export const SOFTWARE_CATEGORY_OPTIONS = Object.values(SoftwareCatalogCategory).map((v) => ({
  value: v,
  label: softwareCategoryLabel(v),
}))

export const SOFTWARE_LICENSE_OPTIONS = Object.values(SoftwareLicenseKind).map((v) => ({
  value: v,
  label: softwareLicenseKindLabel(v),
}))

export const SOFTWARE_LICENSE_TYPE_OPTIONS: Array<{
  value: SoftwareLicenseTypeValue
  label: string
  kind: SoftwareLicenseKind
}> = [
  { value: "free_license", label: "Бесплатная лицензия", kind: SoftwareLicenseKind.FREE },
  { value: "commercial_license", label: "Коммерческая лицензия", kind: SoftwareLicenseKind.PAID },
  { value: "proprietary_license", label: "Проприетарная лицензия", kind: SoftwareLicenseKind.EDUCATIONAL },
  { value: "free_software_license", label: "Свободная лицензия", kind: SoftwareLicenseKind.FREE },
  { value: "open_source_license", label: "Лицензия с открытым исходным кодом", kind: SoftwareLicenseKind.FREE },
]

export function softwareLicenseTypeLabel(value: string | null | undefined): string {
  if (!value) return "—"
  return SOFTWARE_LICENSE_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function softwareLicenseTypeToKind(value: SoftwareLicenseTypeValue): SoftwareLicenseKind {
  return SOFTWARE_LICENSE_TYPE_OPTIONS.find((o) => o.value === value)?.kind ?? SoftwareLicenseKind.FREE
}

export function softwareLicenseTypeFromRow(
  licenseType: string | null | undefined,
  kind: SoftwareLicenseKind
): SoftwareLicenseTypeValue {
  const found = SOFTWARE_LICENSE_TYPE_OPTIONS.find((o) => o.value === licenseType)
  if (found) return found.value
  if (kind === SoftwareLicenseKind.PAID) return "commercial_license"
  if (kind === SoftwareLicenseKind.EDUCATIONAL) return "proprietary_license"
  return "free_license"
}

/** Дата окончания лицензии в UI: пустое / не задано → типографский прочерк. */
export function softwareLicenseExpiresDisplay(value: string | null | undefined): string {
  if (value == null) return "—"
  const t = String(value).trim()
  if (t === "" || t === "1970-01-01") return "—"
  return t
}
