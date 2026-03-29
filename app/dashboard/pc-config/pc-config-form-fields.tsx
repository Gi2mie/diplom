"use client"

import { useEffect, useMemo, useState } from "react"
import type { RegistryBuilding, RegistryClassroom } from "@/lib/api/classroom-registry"
import type { ApiWorkstation } from "@/lib/api/workstations"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  pcNameFromWorkstationCode,
  type PcConfigSavePayload,
} from "@/lib/pc-config-persist"

const UNASSIGNED_BUILDING = "__none__"

const OS_OPTIONS = [
  { value: "Windows", label: "Windows" },
  { value: "macOS", label: "macOS" },
  { value: "Linux", label: "Linux" },
] as const

type Props = {
  form: PcConfigSavePayload
  setForm: React.Dispatch<React.SetStateAction<PcConfigSavePayload>>
  buildings: RegistryBuilding[]
  classrooms: RegistryClassroom[]
  workstations: ApiWorkstation[]
  /** Увеличивать при открытии диалога добавления/редактирования — сброс каскада корпус→аудитория→место */
  cascadeKey: number
  idPrefix?: string
}

function wsLabel(ws: ApiWorkstation): string {
  const title = ws.name?.trim() || "Рабочее место"
  return `${ws.code} — ${title}`
}

function classroomLabel(c: RegistryClassroom): string {
  if (c.name?.trim()) return `${c.name.trim()} (${c.number})`
  return c.number || "—"
}

export function PcConfigFormFields({
  form,
  setForm,
  buildings,
  classrooms,
  workstations,
  cascadeKey,
  idPrefix = "pc",
}: Props) {
  const pid = (n: string) => `${idPrefix}-${n}`

  const [buildingId, setBuildingId] = useState("")
  const [classroomId, setClassroomId] = useState("")

  useEffect(() => {
    setBuildingId("")
    setClassroomId("")
  }, [cascadeKey])

  const hasOrphanClassrooms = useMemo(
    () => classrooms.some((c) => !c.buildingId),
    [classrooms]
  )

  const sortedBuildings = useMemo(
    () => [...buildings].sort((a, b) => a.name.localeCompare(b.name, "ru")),
    [buildings]
  )

  const classroomsInBuilding = useMemo(() => {
    if (!buildingId) return []
    if (buildingId === UNASSIGNED_BUILDING) {
      return [...classrooms.filter((c) => !c.buildingId)].sort((a, b) =>
        a.number.localeCompare(b.number, "ru", { numeric: true })
      )
    }
    return [...classrooms.filter((c) => c.buildingId === buildingId)].sort((a, b) =>
      a.number.localeCompare(b.number, "ru", { numeric: true })
    )
  }, [buildingId, classrooms])

  const workstationsInClassroom = useMemo(() => {
    if (!classroomId) return []
    return [...workstations.filter((w) => w.classroomId === classroomId)].sort((a, b) =>
      a.code.localeCompare(b.code, "ru", { numeric: true })
    )
  }, [classroomId, workstations])

  useEffect(() => {
    if (!form.workstationId) return
    const ws = workstations.find((w) => w.id === form.workstationId)
    if (!ws) return
    setClassroomId(ws.classroomId)
    const cls = classrooms.find((c) => c.id === ws.classroomId)
    setBuildingId(cls?.buildingId ?? UNASSIGNED_BUILDING)
  }, [form.workstationId, workstations, classrooms])

  const onBuildingChange = (bid: string) => {
    setBuildingId(bid)
    setClassroomId("")
    setForm((f) => ({ ...f, workstationId: "", name: "" }))
  }

  const onClassroomChange = (cid: string) => {
    setClassroomId(cid)
    setForm((f) => ({ ...f, workstationId: "", name: "" }))
  }

  const onWorkstationChange = (wid: string) => {
    const ws = workstations.find((w) => w.id === wid)
    setForm((f) => ({
      ...f,
      workstationId: wid,
      name: ws ? pcNameFromWorkstationCode(ws.code) : f.name,
    }))
  }

  return (
    <div className="space-y-6 py-2 max-h-[65vh] overflow-y-auto pr-1">
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Основное</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={pid("building")}>Корпус</Label>
            <Select value={buildingId || undefined} onValueChange={onBuildingChange}>
              <SelectTrigger id={pid("building")}>
                <SelectValue placeholder="Например: Главный корпус" />
              </SelectTrigger>
              <SelectContent>
                {hasOrphanClassrooms && (
                  <SelectItem value={UNASSIGNED_BUILDING}>Без корпуса</SelectItem>
                )}
                {sortedBuildings.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={pid("classroom")}>Аудитория</Label>
            <Select
              value={classroomId || undefined}
              onValueChange={onClassroomChange}
              disabled={!buildingId}
            >
              <SelectTrigger id={pid("classroom")}>
                <SelectValue
                  placeholder={
                    buildingId ? "Например: 301 (Лекционная)" : "Сначала выберите корпус"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {classroomsInBuilding.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {classroomLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={pid("ws")}>Рабочее место</Label>
            <Select
              value={form.workstationId || undefined}
              onValueChange={onWorkstationChange}
              disabled={!classroomId}
            >
              <SelectTrigger id={pid("ws")}>
                <SelectValue
                  placeholder={
                    classroomId
                      ? "Например: RM-222-01 — Рабочее место"
                      : "Сначала выберите аудиторию"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {workstationsInClassroom.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {wsLabel(ws)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={pid("name")}>Имя ПК</Label>
            <Input
              id={pid("name")}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Например: PC-222-01 (подставляется из кода места)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={pid("inv")}>Инвентарный номер</Label>
            <Input
              id={pid("inv")}
              value={form.inventoryNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, inventoryNumber: e.target.value }))
              }
              placeholder="Например: INV-2024-0001"
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Статус оборудования задаётся автоматически по неисправностям и ремонтам (как на вкладке
            «Оборудование»).
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Процессор</h4>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={pid("cpu")}>Модель</Label>
            <Input
              id={pid("cpu")}
              value={form.cpuModel}
              onChange={(e) => setForm((f) => ({ ...f, cpuModel: e.target.value }))}
              placeholder="Например: Intel Core i5-12400"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={pid("cores")}>Ядра</Label>
            <Input
              id={pid("cores")}
              type="number"
              min={0}
              value={form.cpuCores}
              onChange={(e) =>
                setForm((f) => ({ ...f, cpuCores: Number(e.target.value) || 0 }))
              }
              placeholder="6"
            />
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor={pid("freq")}>Частота</Label>
            <Input
              id={pid("freq")}
              value={form.cpuFrequency}
              onChange={(e) =>
                setForm((f) => ({ ...f, cpuFrequency: e.target.value }))
              }
              placeholder="Например: 2.5 GHz"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Оперативная память</h4>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={pid("ram")}>Объём, ГБ</Label>
            <Input
              id={pid("ram")}
              type="number"
              min={0}
              value={form.ramSize}
              onChange={(e) =>
                setForm((f) => ({ ...f, ramSize: Number(e.target.value) || 0 }))
              }
              placeholder="16"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={pid("ramt")}>Тип</Label>
            <Input
              id={pid("ramt")}
              value={form.ramType}
              onChange={(e) => setForm((f) => ({ ...f, ramType: e.target.value }))}
              placeholder="Например: DDR4"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={pid("ramf")}>Частота</Label>
            <Input
              id={pid("ramf")}
              value={form.ramFrequency}
              onChange={(e) =>
                setForm((f) => ({ ...f, ramFrequency: e.target.value }))
              }
              placeholder="Например: 3200 MHz"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Накопители</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Тип основного</Label>
            <Select
              value={form.storageType}
              onValueChange={(v) => setForm((f) => ({ ...f, storageType: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Тип диска" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SSD NVMe">SSD NVMe</SelectItem>
                <SelectItem value="SSD">SSD</SelectItem>
                <SelectItem value="HDD">HDD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={pid("stor1")}>Объём основного, ГБ</Label>
            <Input
              id={pid("stor1")}
              type="number"
              min={0}
              value={form.storageSize}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  storageSize: Number(e.target.value) || 0,
                }))
              }
              placeholder="512"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={pid("stor2en")}
            checked={form.hasSecondaryStorage}
            onCheckedChange={(c) =>
              setForm((f) => ({ ...f, hasSecondaryStorage: c === true }))
            }
          />
          <Label htmlFor={pid("stor2en")} className="font-normal">
            Дополнительный накопитель
          </Label>
        </div>
        {form.hasSecondaryStorage && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Тип дополнительного</Label>
              <Select
                value={form.secondaryStorageType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, secondaryStorageType: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Тип диска" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SSD NVMe">SSD NVMe</SelectItem>
                  <SelectItem value="SSD">SSD</SelectItem>
                  <SelectItem value="HDD">HDD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={pid("stor2")}>Объём, ГБ</Label>
              <Input
                id={pid("stor2")}
                type="number"
                min={0}
                value={form.secondaryStorageSize}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    secondaryStorageSize: Number(e.target.value) || 0,
                  }))
                }
                placeholder="1000"
              />
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">
          Видеокарта и материнская плата
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={pid("gpu")}>Видеокарта</Label>
            <Input
              id={pid("gpu")}
              value={form.gpuModel}
              onChange={(e) => setForm((f) => ({ ...f, gpuModel: e.target.value }))}
              placeholder="Например: Intel UHD Graphics 730"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={pid("gpum")}>Видеопамять, ГБ</Label>
            <Input
              id={pid("gpum")}
              type="number"
              min={0}
              value={form.gpuMemory}
              onChange={(e) =>
                setForm((f) => ({ ...f, gpuMemory: Number(e.target.value) || 0 }))
              }
              placeholder="0"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={pid("mb")}>Материнская плата</Label>
            <Input
              id={pid("mb")}
              value={form.motherboardModel}
              onChange={(e) =>
                setForm((f) => ({ ...f, motherboardModel: e.target.value }))
              }
              placeholder="Например: ASUS PRIME B660M-K"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Сеть</h4>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={pid("net")}>Тип</Label>
            <Input
              id={pid("net")}
              value={form.networkType}
              onChange={(e) =>
                setForm((f) => ({ ...f, networkType: e.target.value }))
              }
              placeholder="Например: Ethernet 1Gbps"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={pid("ip")}>IP</Label>
            <Input
              id={pid("ip")}
              value={form.ipAddress}
              onChange={(e) => setForm((f) => ({ ...f, ipAddress: e.target.value }))}
              placeholder="192.168.1.101"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={pid("mac")}>MAC</Label>
            <Input
              id={pid("mac")}
              value={form.macAddress}
              onChange={(e) =>
                setForm((f) => ({ ...f, macAddress: e.target.value }))
              }
              placeholder="AA:BB:CC:DD:EE:01"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Операционная система</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={pid("os")}>Семейство ОС</Label>
            <Select
              value={form.osName}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  osName: v as PcConfigSavePayload["osName"],
                }))
              }
            >
              <SelectTrigger id={pid("os")}>
                <SelectValue placeholder="Windows, macOS или Linux" />
              </SelectTrigger>
              <SelectContent>
                {OS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={pid("osv")}>Версия</Label>
            <Input
              id={pid("osv")}
              value={form.osVersion}
              onChange={(e) =>
                setForm((f) => ({ ...f, osVersion: e.target.value }))
              }
              placeholder="Например: 11 Pro"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Прочее</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={pid("purch")}>Дата покупки</Label>
            <Input
              id={pid("purch")}
              type="date"
              value={form.purchaseDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, purchaseDate: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={pid("war")}>Гарантия до</Label>
            <Input
              id={pid("war")}
              type="date"
              value={form.warrantyEnd}
              onChange={(e) =>
                setForm((f) => ({ ...f, warrantyEnd: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={pid("notes")}>Примечания</Label>
            <Textarea
              id={pid("notes")}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Дополнительные заметки по этому ПК"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
