"use server"

import { prisma } from "@/lib/db"

export type DashboardStats = {
  equipment: {
    total: number
    operational: number
    needsCheck: number
    inRepair: number
    decommissioned: number
    notInUse: number
  }
  classrooms: {
    total: number
    active: number
  }
  issueReports: {
    total: number
    new: number
    inProgress: number
    resolved: number
  }
  repairs: {
    total: number
    planned: number
    inProgress: number
    completed: number
  }
  users: {
    total: number
    admins: number
    teachers: number
  }
}

export type GetDashboardStatsResult = {
  success: boolean
  data?: DashboardStats
  error?: string
}

export async function getDashboardStats(): Promise<GetDashboardStatsResult> {
  try {
    // Параллельные запросы для статистики
    const [
      equipmentTotal,
      equipmentOperational,
      equipmentNeedsCheck,
      equipmentInRepair,
      equipmentDecommissioned,
      equipmentNotInUse,
      classroomsTotal,
      classroomsActive,
      issueReportsTotal,
      issueReportsNew,
      issueReportsInProgress,
      issueReportsResolved,
      repairsTotal,
      repairsPlanned,
      repairsInProgress,
      repairsCompleted,
      usersTotal,
      usersAdmins,
      usersTeachers,
    ] = await Promise.all([
      // Equipment
      prisma.equipment.count(),
      prisma.equipment.count({ where: { status: "OPERATIONAL" } }),
      prisma.equipment.count({ where: { status: "NEEDS_CHECK" } }),
      prisma.equipment.count({ where: { status: "IN_REPAIR" } }),
      prisma.equipment.count({ where: { status: "DECOMMISSIONED" } }),
      prisma.equipment.count({ where: { status: "NOT_IN_USE" } }),
      // Classrooms
      prisma.classroom.count(),
      prisma.classroom.count({ where: { isActive: true } }),
      // Issue Reports
      prisma.issueReport.count(),
      prisma.issueReport.count({ where: { status: "NEW" } }),
      prisma.issueReport.count({ where: { status: "IN_PROGRESS" } }),
      prisma.issueReport.count({ where: { status: "RESOLVED" } }),
      // Repairs
      prisma.repair.count(),
      prisma.repair.count({ where: { status: "PLANNED" } }),
      prisma.repair.count({ where: { status: "IN_PROGRESS" } }),
      prisma.repair.count({ where: { status: "COMPLETED" } }),
      // Users
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: "ADMIN", isActive: true } }),
      prisma.user.count({ where: { role: "TEACHER", isActive: true } }),
    ])

    return {
      success: true,
      data: {
        equipment: {
          total: equipmentTotal,
          operational: equipmentOperational,
          needsCheck: equipmentNeedsCheck,
          inRepair: equipmentInRepair,
          decommissioned: equipmentDecommissioned,
          notInUse: equipmentNotInUse,
        },
        classrooms: {
          total: classroomsTotal,
          active: classroomsActive,
        },
        issueReports: {
          total: issueReportsTotal,
          new: issueReportsNew,
          inProgress: issueReportsInProgress,
          resolved: issueReportsResolved,
        },
        repairs: {
          total: repairsTotal,
          planned: repairsPlanned,
          inProgress: repairsInProgress,
          completed: repairsCompleted,
        },
        users: {
          total: usersTotal,
          admins: usersAdmins,
          teachers: usersTeachers,
        },
      },
    }
  } catch (error) {
    console.error("getDashboardStats error:", error)
    return {
      success: false,
      error: "Ошибка при получении статистики",
    }
  }
}
