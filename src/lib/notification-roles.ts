import type { UserRole } from "@/types/database";

export const ADMIN_NOTIFICATION_ROLES: readonly UserRole[] = [
    "admin",
    "dev",
    "support_agent",
    "shipping_manager",
    "financial_manager",
];

export function canReceiveAdminNotifications(role: UserRole | string | null | undefined) {
    return ADMIN_NOTIFICATION_ROLES.includes(role as UserRole);
}
