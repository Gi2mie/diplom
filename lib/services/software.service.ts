import { db } from "@/lib/db"
import type {
  CreateSoftwareDTO,
  UpdateSoftwareDTO,
  CreateInstalledSoftwareDTO,
  UpdateInstalledSoftwareDTO,
  PaginationParams,
  PaginatedResponse,
} from "@/lib/types"
import { Software, InstalledSoftware } from "@prisma/client"

export class SoftwareService {
  /**
   * Получить весь каталог ПО с пагинацией
   */
  static async getAll(
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<Software>> {
    const { page = 1, limit = 10, sortBy = "name", sortOrder = "asc" } = params

    const [data, total] = await Promise.all([
      db.software.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      db.software.count(),
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
   * Получить ПО по ID
   */
  static async getById(id: string) {
    return db.software.findUnique({
      where: { id },
      include: {
        installations: {
          include: { equipment: true },
        },
      },
    })
  }

  /**
   * Создать запись о ПО
   */
  static async create(data: CreateSoftwareDTO) {
    return db.software.create({ data })
  }

  /**
   * Обновить ПО
   */
  static async update(id: string, data: UpdateSoftwareDTO) {
    return db.software.update({
      where: { id },
      data,
    })
  }

  /**
   * Удалить ПО
   */
  static async delete(id: string) {
    return db.software.delete({
      where: { id },
    })
  }

  // ==========================================
  // Установленное ПО
  // ==========================================

  /**
   * Установить ПО на оборудование
   */
  static async install(data: CreateInstalledSoftwareDTO) {
    return db.installedSoftware.create({
      data,
      include: {
        software: true,
        equipment: true,
      },
    })
  }

  /**
   * Обновить информацию об установленном ПО
   */
  static async updateInstallation(id: string, data: UpdateInstalledSoftwareDTO) {
    return db.installedSoftware.update({
      where: { id },
      data,
      include: {
        software: true,
        equipment: true,
      },
    })
  }

  /**
   * Удалить установленное ПО
   */
  static async uninstall(id: string) {
    return db.installedSoftware.delete({
      where: { id },
    })
  }

  /**
   * Получить все установки ПО на оборудовании
   */
  static async getInstallationsByEquipment(equipmentId: string) {
    return db.installedSoftware.findMany({
      where: { equipmentId },
      include: { software: true },
      orderBy: { installedAt: "desc" },
    })
  }

  /**
   * Получить все установки конкретного ПО
   */
  static async getInstallationsBySoftware(softwareId: string) {
    return db.installedSoftware.findMany({
      where: { softwareId },
      include: {
        equipment: {
          include: {
            workstation: {
              include: { classroom: true },
            },
          },
        },
      },
    })
  }

  /**
   * Получить ПО с истекающими лицензиями
   */
  static async getExpiringLicenses(daysAhead: number = 30) {
    return db.installedSoftware.findMany({
      where: {
        expiresAt: {
          lte: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
      },
      include: {
        software: true,
        equipment: {
          include: {
            workstation: {
              include: { classroom: true },
            },
          },
        },
      },
      orderBy: { expiresAt: "asc" },
    })
  }
}
