import { Role } from '@prisma/client';

/** True for admins and for the super admin (the super admin can do everything an admin can). */
export function isAdminRole(role: Role): boolean {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN;
}
