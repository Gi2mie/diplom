import { db } from "@/lib/db"
import type {
  CreateRepairDTO,
  UpdateRepairDTO,
  PaginationParams,
  PaginatedResponse,
  RepairWithRelations,
  RepairFilters,
} from "@/lib/types"
import { RepairStatus, EquipmentStatus, Prisma } from "@prisma/client"

export class RepairService {
  /**
   * Получить все ремонты с фильтрами и пагинацией
   */
  static async getAll(
    params: PaginationParams & RepairFilters = {}
  ): Promise<PaginatedResponse<RepairWithRelations>> {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      status,
      equipmentId,
      assignedToId,
      createdById,
    } = params

    const where: Prisma.RepairWhereInput = {
      ...(status && {
        status: Array.isArray(status) ? { in: status } : status,
      }),
      ...(equipmentId && { equipmentId }),
      ...(assignedToId && { assignedToId }),
      ...(createdById && { createdById }),
    }

    const [data, total] = await Promise.all([
      db.repair.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          equipment: {
            include: {
              workstation: {
                include: { classroom: true },
              },
            },
          },
          issueReport: true,
          assignedTo: true,
          createdBy: true,
        },
      }),
      db.repair.count({ where }),
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
   * Получить ремонт по ID
   */
  static async getById(id: string): Promise<RepairWithRelations | null> {
    return db.repair.findUnique({
      where: { id },
      include: {
        equipment: {
          include: {
            workstation: {
              include: { classroom: true },
            },
          },
        },
        issueReport: true,
        assignedTo: true,
        createdBy: true,
      },
    })
  }

  /**
   * Создать ремонт
   */
  static async create(data: CreateRepairDTO) {
    // Создаём ремонт в транзакции с обновлением статуса оборудования
    return db.$transaction(async (tx) => {
      // Обновляем статус оборудования на "В ремонте"
      await tx.equipment.update({
        where: { id: data.equipmentId },
        data: { status: EquipmentStatus.IN_REPAIR },
      })

      // Создаём запись о ремонте
      return tx.repair.create({
        data: {
          ...data,
          status: RepairStatus.IN_PROGRESS,
          startedAt: new Date(),
        },
        include: {
          equipment: true,
          issueReport: true,
          assignedTo: true,
          createdBy: true,
        },
      })
    })
  }

  /**
   * Обновить ремонт
   */
  static async update(id: string, data: UpdateRepairDTO) {
    return db.repair.update({
      where: { id },
      data,
      include: {
        equipment: true,
        assignedTo: true,
      },
    })
  }

  /**
   * Завершить ремонт
   */
  static async complete(
    id: string,
    workPerformed: string,
    partsUsed?: string,
    cost?: number
  ) {
    return db.$transaction(async (tx) => {
      // Получаем ремонт
      const repair = await tx.repair.findUnique({
        where: { id },
        include: { equipment: true },
      })

      if (!repair) throw new Error("Ремонт не найден")

      // Обновляем статус оборудования на "Исправно"
      await tx.equipment.update({
        where: { id: repair.equipmentId },
        data: { status: EquipmentStatus.OPERATIONAL },
      })

      // Завершаем ремонт
      return tx.repair.update({
        where: { id },
        data: {
          status: RepairStatus.COMPLETED,
          workPerformed,
          partsUsed,
          cost,
          completedAt: new Date(),
        },
        include: {
          equipment: true,
          assignedTo: true,
          createdBy: true,
        },
      })
    })
  }

  /**
   * Отменить ремонт
   */
  static async cancel(id: string) {
    return db.$transaction(async (tx) => {
      const repair = await tx.repair.findUnique({
        where: { id },
      })

      if (!repair) throw new Error("Ремонт не найден")

      // Возвращаем статус оборудования на "Требует проверки"
      await tx.equipment.update({
        where: { id: repair.equipmentId },
        data: { status: EquipmentStatus.NEEDS_CHECK },
      })

      return tx.repair.update({
        where: { id },
        data: { status: RepairStatus.CANCELLED },
      })
    })
  }

  /**
   * Получить статистику по ремонтам
   */
  static async getStatistics() {
    const statusCounts = await db.repair.groupBy({
      by: ["status"],
      _count: { status: true },
    })

    const total = await db.repair.count()

    // Общая стоимость завершённых ремонтов
    const totalCost = await db.repair.aggregate({
      where: { status: RepairStatus.COMPLETED },
      _sum: { cost: true },
    })

    // Среднее время ремонта (в днях)
    const completedRepairs = await db.repair.findMany({
      where: {
        status: RepairStatus.COMPLETED,
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
    })

    const avgRepairTime =
      completedRepairs.length > 0
        ? completedRepairs.reduce((sum, repair) => {
            const diff = repair.completedAt!.getTime() - repair.startedAt!.getTime()
            return sum + diff / (1000 * 60 * 60 * 24)
          }, 0) / completedRepairs.length
        : 0

    return {
      total,
      byStatus: Object.fromEntries(
        statusCounts.map((s) => [s.status, s._count.status])
      ),
      totalCost: Number(totalCost._sum.cost) || 0,
      avgRepairTimeDays: Math.round(avgRepairTime * 10) / 10,
    }
  }
}
