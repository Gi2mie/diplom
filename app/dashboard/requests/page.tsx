import { redirect } from "next/navigation"

/** Раздел перенесён в «Неисправности». */
export default function RequestsPageRedirect() {
  redirect("/dashboard/issues")
}
