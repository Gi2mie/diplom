import { ClassroomListingStatus } from "@prisma/client"

export function isActiveFromListingStatus(status: ClassroomListingStatus): boolean {
  return status !== ClassroomListingStatus.INACTIVE
}
