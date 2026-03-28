import { SoftwareCatalogCategory, SoftwareLicenseKind } from "@prisma/client"

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
      return "Бесплатная"
    case SoftwareLicenseKind.PAID:
      return "Платная"
    case SoftwareLicenseKind.EDUCATIONAL:
      return "Образовательная"
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

/** Дата окончания лицензии в UI: пустое / не задано → типографский прочерк. */
export function softwareLicenseExpiresDisplay(value: string | null | undefined): string {
  if (value == null) return "—"
  const t = String(value).trim()
  if (t === "" || t === "1970-01-01") return "—"
  return t
}
