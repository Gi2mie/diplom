/**
 * EduControl — ориентиры дизайн-системы (токены в `app/globals.css`, компоненты в `components/ui/`).
 *
 * Использование:
 * - Заголовок страницы: `PageHeader` из `@/components/dashboard/page-header`
 * - Уведомления: `import { toast } from "sonner"` — глобальный `<Toaster />` в корневом layout
 * - Сортировка таблиц: `useTableSort` + `SortableTableHead`
 * - Контент: обёртка с отступами задаётся в `app/dashboard/layout.tsx` (`main` → `page-shell`)
 * - Анимации: переключатель в настройках; `localStorage` `edutrack-animations` (`on`/`off`),
 *   класс на `<html>`: `edu-motion-off` (см. `ThemeProvider`)
 */

export const EDU_APP_NAME = "EduControl"

/** CSS-классы-утилиты из globals.css */
export const pageShellClass = "page-shell"
