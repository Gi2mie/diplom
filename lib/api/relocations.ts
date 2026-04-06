export type RelocationJournalRow = {
  id: string
  kind: "EQUIPMENT" | "WORKSTATION"
  movedAt: string
  revertedAt: string | null
  fromClassroomNumber: string
  toClassroomNumber: string
  fromWorkstationCode: string
  toWorkstationCode: string
  equipmentName: string | null
  inventoryNumber: string | null
  movedEquipmentCount: number
  initiator: string
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    const err = data?.error
    const msg =
      typeof err === "string"
        ? err
        : err && typeof err === "object"
          ? JSON.stringify(err)
          : "Request failed"
    throw new Error(msg)
  }
  return data as T
}

export async function fetchRelocationLogs(): Promise<RelocationJournalRow[]> {
  const res = await fetch("/api/relocations", { cache: "no-store" })
  const data = await parseJson<{ logs: RelocationJournalRow[] }>(res)
  return data.logs
}

export async function createRelocationApi(
  body:
    | { kind: "EQUIPMENT"; equipmentId: string; toWorkstationId: string }
    | { kind: "WORKSTATION"; fromWorkstationId: string; toWorkstationId: string }
): Promise<void> {
  const res = await fetch("/api/relocations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await parseJson<{ ok: boolean }>(res)
}

export async function revertRelocationApi(id: string): Promise<void> {
  const res = await fetch(`/api/relocations/${id}/revert`, { method: "POST" })
  await parseJson<{ ok: boolean }>(res)
}
