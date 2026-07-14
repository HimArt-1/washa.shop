import type { NotificationPreferences, UserNotificationType } from "@/types/database";

export type NotificationPreferenceCategory =
    | "order_updates"
    | "support_replies"
    | "design_updates"
    | "artist_updates";

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, "profile_id" | "updated_at"> = {
    push_enabled: true,
    email_enabled: true,
    order_updates: true,
    support_replies: true,
    design_updates: true,
    artist_updates: true,
    marketing: false,
    quiet_hours_start: null,
    quiet_hours_end: null,
    timezone: "Asia/Riyadh",
};

export function getNotificationPreferenceCategory(
    type: UserNotificationType | string
): NotificationPreferenceCategory | null {
    if (type === "order_update") return "order_updates";
    if (type === "support_reply") return "support_replies";
    if (type === "design_order_update") return "design_updates";
    if (type === "artwork_update" || type === "artist_sale" || type === "artist_social") {
        return "artist_updates";
    }
    return null;
}

function timeToMinutes(value: string | null | undefined) {
    if (!value || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) return null;
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
}

export function isWithinQuietHours(
    preferences: Pick<NotificationPreferences, "quiet_hours_start" | "quiet_hours_end" | "timezone">,
    now = new Date()
) {
    const start = timeToMinutes(preferences.quiet_hours_start);
    const end = timeToMinutes(preferences.quiet_hours_end);
    if (start === null || end === null || start === end) return false;

    let parts: Intl.DateTimeFormatPart[];
    try {
        parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: preferences.timezone || "Asia/Riyadh",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
        }).formatToParts(now);
    } catch {
        return false;
    }

    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
    const current = hour * 60 + minute;

    return start < end
        ? current >= start && current < end
        : current >= start || current < end;
}

export function shouldSendUserPush(
    preferences: NotificationPreferences,
    type: UserNotificationType | string,
    now = new Date()
) {
    if (!preferences.push_enabled || isWithinQuietHours(preferences, now)) return false;
    const category = getNotificationPreferenceCategory(type);
    return category ? preferences[category] : true;
}
