import { db } from "@/lib/db"
import type {
  CreateIssueReportDTO,
  UpdateIssueReportDTO,
  PaginationParams,
  PaginatedResponse,
  IssueReportWithRelations,
  IssueReportFilters,
} from "@/lib/types"
import { IssueStatus, Prisma } from "@prisma/client"

export class IssueReportService {
  /**
   * Получить все обращения с фильтрами и пагинацией
   */
  static async getAll(
    params: PaginationParams & IssueReportFilters = {}
  ): Promise<PaginatedResponse<IssueReportWithRelations>> {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      status,
      priority,
      equipmentId,
      reporterId,
      search,
    } = params

    const where: Prisma.IssueReportWhereInput = {
      ...(status && {
        status: Array.isArray(status) ? { in: status } : status,
      }),
      ...(priority && {
        priority: Array.isArray(priority) ? { in: priority } : priority,
      }),
      ...(equipmentId && { equipmentId }),
      ...(reporterId && { reporterId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
    }

    const [data, total] = await Promise.all([
      db.issueReport.findMany({
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
          reporter: true,
          repairs: true,
        },
      }),
      db.issueReport.count({ where }),
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
   * Получить обращение по ID
   */
  static async getById(id: string): Promise<IssueReportWithRelations | null> {
    return db.issueReport.findUnique({
      where: { id },
      include: {
        equipment: {
          include: {
            workstation: {
              include: { classroom: true },
            },
          },
        },
        reporter: true,
        repairs: {
          include: {
            assignedTo: true,
            createdBy: true,
          },
        },
      },
    })
  }

  /**
   * Создать обращение
   */
  static async create(data: CreateIssueReportDTO) {
    return db.issueReport.create({
      data,
      include: {
        equipment: true,
        reporter: true,
      },
    })
  }

  /**
   * Обновить обращение
   */
  static async update(id: string, data: UpdateIssueReportDTO) {
    const updateData: Prisma.IssueReportUpdateInput = { ...data }

    // Автоматически устанавливаем дату решения
    if (data.status === IssueStatus.RESOLVED && !data.resolution) {
      updateData.resolvedAt = new Date()
    }

    return db.issueReport.update({
      where: { id },
      data: updateData,
      include: {
        equipment: true,
        reporter: true,
      },
    })
  }

  /**
   * Изменить статус обращения
   */
  static async updateStatus(id: string, status: IssueStatus, resolution?: string) {
    return db.issueReport.update({
      where: { id },
      data: {
        status,
        ...(status === IssueStatus.RESOLVED && {
          resolvedAt: new Date(),
          resolution,
        }),
      },
    })
  }

  /**
   * Получить статистику по обращениям
   */
  static async getStatistics() {
    const statusCounts = await db.issueReport.groupBy({
      by: ["status"],
      _count: { status: true },
    })

    const priorityCounts = await db.issueReport.groupBy({
      by: ["priority"],
      _count: { priority: true },
    })

    const total = await db.issueReport.count()

    // Среднее время решения (в днях)
    const resolvedIssues = await db.issueReport.findMany({
      where: {
        status: IssueStatus.RESOLVED,
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    })

    const avgResolutionTime =
      resolvedIssues.length > 0
        ? resolvedIssues.reduce((sum, issue) => {
            const diff = issue.resolvedAt!.getTime() - issue.createdAt.getTime()
            return sum + diff / (1000 * 60 * 60 * 24) // в днях
          }, 0) / resolvedIssues.length
        : 0

    return {
      total,
      byStatus: Object.fromEntries(
        statusCounts.map((s) => [s.status, s._count.status])
      ),
      byPriority: Object.fromEntries(
        priorityCounts.map((p) => [p.priority, p._count.priority])
      ),
      avgResolutionTimeDays: Math.round(avgResolutionTime * 10) / 10,
    }
  }

  /**
   * Получить обращения пользователя
   */
  static async getByReporter(reporterId: string) {
    return db.issueReport.findMany({
      where: { reporterId },
      include: {
        equipment: {
          include: {
            workstation: {
              include: { classroom: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }
}
