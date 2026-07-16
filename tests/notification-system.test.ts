import { describe, expect, it } from "vitest";
import { canReceiveAdminNotifications } from "@/lib/notification-roles";
import {
    getNotificationPreferenceCategory,
    isWithinQuietHours,
    shouldSendUserPush,
} from "@/lib/notification-preferences";
import { mergePushScopes, removePushScope } from "@/lib/push-subscription-scope";
import { requireAdminNotificationDelivery } from "@/lib/notifications";
import type { NotificationPreferences } from "@/types/database";

const preferences: NotificationPreferences = {
    profile_id: "profile-1",
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
    updated_at: "2026-07-14T00:00:00.000Z",
};

describe("admin notification audience", () => {
    it.each(["admin", "dev", "support_agent", "shipping_manager", "financial_manager"])(
        "allows the %s role to subscribe to operational push",
        (role) => expect(canReceiveAdminNotifications(role)).toBe(true)
    );

    it.each(["subscriber", "wushsha", "booth", null])(
        "does not expose admin push to %s",
        (role) => expect(canReceiveAdminNotifications(role)).toBe(false)
    );
});

describe("user notification delivery preferences", () => {
    it("maps transactional and artist events to independently controllable categories", () => {
        expect(getNotificationPreferenceCategory("order_update")).toBe("order_updates");
        expect(getNotificationPreferenceCategory("support_reply")).toBe("support_replies");
        expect(getNotificationPreferenceCategory("design_order_update")).toBe("design_updates");
        expect(shouldSendUserPush({ ...preferences, order_updates: false }, "design_order_update")).toBe(true);
        expect(getNotificationPreferenceCategory("artist_sale")).toBe("artist_updates");
    });

    it("suppresses only the disabled push category", () => {
        const changed = { ...preferences, artist_updates: false };
        expect(shouldSendUserPush(changed, "artist_sale")).toBe(false);
        expect(shouldSendUserPush(changed, "order_update")).toBe(true);
    });

    it("respects overnight quiet hours in the configured timezone", () => {
        const quiet = {
            ...preferences,
            quiet_hours_start: "22:00",
            quiet_hours_end: "07:00",
        };
        expect(isWithinQuietHours(quiet, new Date("2026-07-14T21:30:00.000Z"))).toBe(true); // 00:30 Riyadh
        expect(isWithinQuietHours(quiet, new Date("2026-07-14T09:00:00.000Z"))).toBe(false); // 12:00 Riyadh
    });

    it("keeps the in-app event eligible while global push is disabled", () => {
        expect(shouldSendUserPush({ ...preferences, push_enabled: false }, "order_update")).toBe(false);
    });
});

describe("one browser subscription can serve user and admin channels", () => {
    it("merges scopes without discarding the existing user channel", () => {
        expect(mergePushScopes("user", "admin")).toBe("both");
    });

    it("removes one scope while retaining the other", () => {
        expect(removePushScope("both", "admin")).toBe("user");
        expect(removePushScope("both", "user")).toBe("admin");
    });
});

describe("admin webhook delivery result", () => {
    it("fails the tracked dispatch when every configured channel fails", () => {
        expect(() => requireAdminNotificationDelivery([
            { channel: "telegram", ok: false, status: 401, statusText: "Unauthorized" },
            { channel: "discord", ok: false, status: 500, statusText: "Server Error" },
        ])).toThrow("All configured admin notification channels failed");
    });

    it("accepts partial delivery and does not require an optional channel", () => {
        expect(() => requireAdminNotificationDelivery([
            { channel: "telegram", ok: true, status: 200 },
            { channel: "discord", ok: false, status: 500 },
        ])).not.toThrow();
        expect(() => requireAdminNotificationDelivery([])).not.toThrow();
    });
});
