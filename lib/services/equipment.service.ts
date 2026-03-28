import { db } from "@/lib/db"
import type {
  CreateEquipmentDTO,
  UpdateEquipmentDTO,
  PaginationParams,
  PaginatedResponse,
  EquipmentWithRelations,
  EquipmentFilters,
} from "@/lib/types"
import { EquipmentStatus, Prisma } from "@prisma/client"

export class EquipmentService {
  /**
   * Получить всё оборудование с фильтрами и пагинацией
   */
  static async getAll(
    params: PaginationParams & EquipmentFilters = {}
  ): Promise<PaginatedResponse<EquipmentWithRelations>> {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      status,
      type,
      workstationId,
      classroomId,
      search,
      isActive = true,
    } = params

    const where: Prisma.EquipmentWhereInput = {
      isActive,
      ...(status && {
        status: Array.isArray(status) ? { in: status } : status,
      }),
      ...(type && {
        type: Array.isArray(type) ? { in: type } : type,
      }),
      ...(workstationId && { workstationId }),
      ...(classroomId && {
        workstation: { classroomId },
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { inventoryNumber: { contains: search, mode: "insensitive" } },
          { serialNumber: { contains: search, mode: "insensitive" } },
          { manufacturer: { contains: search, mode: "insensitive" } },
          { model: { contains: search, mode: "insensitive" } },
        ],
      }),
    }

    const [data, total] = await Promise.all([
      db.equipment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          workstation: {
            include: { classroom: true },
          },
          components: true,
          software: {
            include: { software: true },
          },
          customFields: {
            include: { definition: true },
          },
        },
      }),
      db.equipment.count({ where }),
    ])

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Получить оборудование по ID
   */
  static async getById(id: string): Promise<EquipmentWithRelations | null> {
    return db.equipment.findUnique({
      where: { id },
      include: {
        workstation: {
          include: { classroom: true },
        },
        components: true,
        software: {
          include: { software: true },
        },
        issueReports: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { reporter: true },
        },
        repairs: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { assignedTo: true, createdBy: true },
        },
        customFields: {
          include: { definition: true },
        },
      },
    })
  }

  /**
   * Получить оборудование по инвентарному номеру
   */
  static async getByInventoryNumber(inventoryNumber: string) {
    return db.equipment.findUnique({
      where: { inventoryNumber },
    })
  }

  /**
   * Создать оборудование
   */
  static async create(data: CreateEquipmentDTO) {
    const kind = await db.equipmentKind.findUnique({ where: { id: data.equipmentKindId } })
    if (!kind) {
      throw new Error("Тип оборудования не найден")
    }
    return db.equipment.create({
      data: {
        ...data,
        type: kind.mapsToEnum,
      },
      include: {
        workstation: {
          include: { classroom: true },
        },
      },
    })
  }

  /**
   * Обновить оборудование
   */
  static async update(id: string, data: UpdateEquipmentDTO) {
    let typePatch: { type?: import("@prisma/client").EquipmentType } = {}
    if (data.equipmentKindId) {
      const kind = await db.equipmentKind.findUnique({ where: { id: data.equipmentKindId } })
      if (!kind) {
        throw new Error("Тип оборудования не найден")
      }
      typePatch = { type: kind.mapsToEnum }
    }
    return db.equipment.update({
      where: { id },
      data: { ...data, ...typePatch },
      include: {
        workstation: {
          include: { classroom: true },
        },
      },
    })
  }

  /**
   * Изменить статус оборудования
   */
  static async updateStatus(id: string, status: EquipmentStatus) {
    return db.equipment.update({
      where: { id },
      data: { status },
    })
  }

  /**
   * Переместить оборудование на другое рабочее место
   */
  static async moveToWorkstation(id: string, workstationId: string | null) {
    return db.equipment.update({
      where: { id },
      data: { workstationId },
      include: {
        workstation: {
          include: { classroom: true },
        },
      },
    })
  }

  /**
   * Удалить оборудование (мягкое удаление)
   */
  static async delete(id: string) {
    return db.equipment.update({
      where: { id },
      data: { isActive: false },
    })
  }

  /**
   * Получить общую статистику по оборудованию
   */
  static async getStatistics() {
    const statusCounts = await db.equipment.groupBy({
      by: ["status"],
      where: { isActive: true },
      _count: { status: true },
    })

    const typeCounts = await db.equipment.groupBy({
      by: ["type"],
      where: { isActive: true },
      _count: { type: true },
    })

    const total = await db.equipment.count({ where: { isActive: true } })

    const expiringWarranty = await db.equipment.count({
      where: {
        isActive: true,
        warrantyUntil: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
          gte: new Date(),
        },
      },
    })

    return {
      total,
      byStatus: Object.fromEntries(
        statusCounts.map((s) => [s.status, s._count.status])
      ),
      byType: Object.fromEntries(
        typeCounts.map((t) => [t.type, t._count.type])
      ),
      expiringWarranty,
    }
  }

  /**
   * Получить оборудование с истекающей гарантией
   */
  static async getExpiringWarranty(daysAhead: number = 30) {
    return db.equipment.findMany({
      where: {
        isActive: true,
        warrantyUntil: {
          lte: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
      },
      include: {
        workstation: {
          include: { classroom: true },
        },
      },
      orderBy: { warrantyUntil: "asc" },
    })
  }
}
