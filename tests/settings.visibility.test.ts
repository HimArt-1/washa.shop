import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateClient, mockGetInventoryWithSales, mockGetCurrentUserOrDevAdmin } = vi.hoisted(() => ({
    mockCreateClient: vi.fn(),
    mockGetInventoryWithSales: vi.fn(),
    mockGetCurrentUserOrDevAdmin: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
    createClient: mockCreateClient,
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    unstable_cache: vi.fn((fn) => fn),
    unstable_noStore: vi.fn(),
}));

vi.mock("@/lib/product-identifiers", () => ({
    generateNextSKU: vi.fn(),
}));

vi.mock("@/lib/admin-access", () => ({
    getCurrentUserOrDevAdmin: mockGetCurrentUserOrDevAdmin,
}));

vi.mock("@/lib/operational-rules", () => ({
    DEFAULT_OPERATIONAL_RULES: {
        support: {},
        inventory: {},
        payments: {},
        orders: {},
    },
    getOperationalRules: vi.fn(),
    normalizeOperationalRules: vi.fn((value) => value ?? {
        support: {},
        inventory: {},
        payments: {},
        orders: {},
    }),
}));

vi.mock("@/app/actions/erp/inventory", () => ({
    getInventoryWithSales: mockGetInventoryWithSales,
}));

import {
    getPublicVisibility,
    getSiteSettings,
    getWashaAiSettings,
    updateSiteSetting,
} from "@/app/actions/settings";
import { DEFAULT_BOARD_PROMPT_TEMPLATE as APPROVED_BOARD_PROMPT_TEMPLATE } from "@/lib/washa-board-prompt";

describe("settings visibility normalization", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    });

    it("coerces public visibility flags from string values", async () => {
        mockCreateClient.mockReturnValue({
            from: vi.fn(() => ({
                select: vi.fn(async () => ({
                    data: [
                        {
                            key: "visibility",
                            value: {
                                gallery: "false",
                                join: "1",
                                design_piece_generation_public: "true",
                                hero_washa_ai_v3_button: "1",
                                washa_ai_dev_v3_access: "link",
                                hero_washa_ai_v4_button: "1",
                                washa_ai_dev_v4_access: "link",
                            },
                        },
                    ],
                    error: null,
                })),
            })),
        });

        const visibility = await getPublicVisibility();

        expect(visibility.gallery).toBe(false);
        expect(visibility.join).toBe(true);
        expect(visibility.design_piece_generation_public).toBe(true);
        expect(visibility.hero_washa_ai_v3_button).toBe(true);
        expect(visibility.washa_ai_dev_v3_access).toBe("link");
        expect(visibility.hero_washa_ai_v4_button).toBe(true);
        expect(visibility.washa_ai_dev_v4_access).toBe("link");
    });

    it("normalizes visibility values in getSiteSettings too", async () => {
        mockCreateClient.mockReturnValue({
            from: vi.fn(() => ({
                select: vi.fn(async () => ({
                    data: [
                        {
                            key: "visibility",
                            value: {
                                gallery: "true",
                                store: "0",
                                design_piece_generation_public: "true",
                                hero_washa_ai_v3_button: "false",
                                washa_ai_dev_v3_access: "disabled",
                            },
                        },
                    ],
                    error: null,
                })),
            })),
        });

        const settings = await getSiteSettings();

        expect(settings.visibility.gallery).toBe(true);
        expect(settings.visibility.store).toBe(false);
        expect(settings.visibility.design_piece_generation_public).toBe(true);
        expect(settings.visibility.hero_washa_ai_v3_button).toBe(false);
        expect(settings.visibility.washa_ai_dev_v3_access).toBe("disabled");
    });

    it("hides the V3 hero entry when the V3 route is not public-by-link", async () => {
        mockCreateClient.mockReturnValue({
            from: vi.fn(() => ({
                select: vi.fn(async () => ({
                    data: [{
                        key: "visibility",
                        value: {
                            hero_washa_ai_v3_button: true,
                            washa_ai_dev_v3_access: "admin",
                        },
                    }],
                    error: null,
                })),
            })),
        });

        const visibility = await getPublicVisibility();

        expect(visibility.hero_washa_ai_v3_button).toBe(false);
        expect(visibility.washa_ai_dev_v3_access).toBe("admin");
    });

    it("keeps the V4 availability and hero entry independent from older WASHA AI settings", async () => {
        mockCreateClient.mockReturnValue({
            from: vi.fn(() => ({
                select: vi.fn(async () => ({
                    data: [{
                        key: "visibility",
                        value: {
                            design_piece: false,
                            design_piece_dtf_studio_switch: false,
                            hero_washa_ai_v3_button: false,
                            washa_ai_dev_v3_access: "disabled",
                            hero_washa_ai_v4_button: true,
                            washa_ai_dev_v4_access: "link",
                        },
                    }],
                    error: null,
                })),
            })),
        });

        const visibility = await getPublicVisibility();

        expect(visibility.design_piece).toBe(false);
        expect(visibility.washa_ai_dev_v3_access).toBe("disabled");
        expect(visibility.hero_washa_ai_v4_button).toBe(true);
        expect(visibility.washa_ai_dev_v4_access).toBe("link");
    });

    it("normalizes Washa AI subscriber, guest, and booth generation limits", async () => {
        mockCreateClient.mockReturnValue({
            from: vi.fn(() => ({
                select: vi.fn(async () => ({
                    data: [
                        {
                            key: "washa_ai",
                            value: {
                                dtf_daily_quota_limit: "7",
                                dtf_guest_daily_quota_limit: "3",
                                dtf_booth_daily_quota_limit: "18",
                            },
                        },
                    ],
                    error: null,
                })),
            })),
        });

        const settings = await getWashaAiSettings();

        expect(settings.dtf_daily_quota_limit).toBe(7);
        expect(settings.dtf_guest_daily_quota_limit).toBe(3);
        expect(settings.dtf_booth_daily_quota_limit).toBe(18);
    });

    it("drops Washa AI credit packages that cannot be purchased", async () => {
        mockCreateClient.mockReturnValue({
            from: vi.fn(() => ({
                select: vi.fn(async () => ({
                    data: [
                        {
                            key: "washa_ai",
                            value: {
                                credit_packages: [
                                    { id: "free", label: "حزمة صفرية", credits: 10, price: 0, active: true },
                                    { id: "starter", label: "بداية", credits: 20, price: "25", active: true },
                                ],
                            },
                        },
                    ],
                    error: null,
                })),
            })),
        });

        const settings = await getWashaAiSettings();

        expect(settings.credit_packages).toEqual([
            { id: "starter", label: "بداية", credits: 20, price: 25, popular: false, active: true },
        ]);
    });

    it("uses safe complete defaults when board fallback settings are absent", async () => {
        mockCreateClient.mockReturnValue({
            from: vi.fn(() => ({
                select: vi.fn(async () => ({ data: [], error: null })),
            })),
        });

        const settings = await getSiteSettings();

        expect(settings.visibility.hero_washa_ai_v3_button).toBe(false);
        expect(settings.visibility.washa_ai_dev_v3_access).toBe("admin");
        expect(settings.visibility.hero_washa_ai_v4_button).toBe(false);
        expect(settings.visibility.washa_ai_dev_v4_access).toBe("admin");
        expect(settings.generation_mode).toBe("primary");
        expect(settings.quota_charging).toEqual({
            auto: true,
            manual_override: null,
        });
        expect(settings.board_prompt_template).toBe(APPROVED_BOARD_PROMPT_TEMPLATE);
    });

    it("normalizes persisted board fallback settings without dropping them", async () => {
        const customTemplate = `${APPROVED_BOARD_PROMPT_TEMPLATE}\nOperator-approved suffix.`;
        mockCreateClient.mockReturnValue({
            from: vi.fn(() => ({
                select: vi.fn(async () => ({
                    data: [
                        { key: "generation_mode", value: "fallback" },
                        { key: "board_prompt_template", value: customTemplate },
                        {
                            key: "quota_charging",
                            value: { auto: false, manual_override: "disabled" },
                        },
                    ],
                    error: null,
                })),
            })),
        });

        const settings = await getSiteSettings();

        expect(settings.generation_mode).toBe("fallback");
        expect(settings.board_prompt_template).toBe(customTemplate);
        expect(settings.quota_charging).toEqual({
            auto: false,
            manual_override: "disabled",
        });
    });

    it("replaces malformed board fallback settings with safe defaults", async () => {
        mockCreateClient.mockReturnValue({
            from: vi.fn(() => ({
                select: vi.fn(async () => ({
                    data: [
                        { key: "generation_mode", value: "fallback-ish" },
                        { key: "board_prompt_template", value: "Missing required placeholders" },
                        {
                            key: "quota_charging",
                            value: { auto: false, manual_override: "unexpected" },
                        },
                    ],
                    error: null,
                })),
            })),
        });

        const settings = await getSiteSettings();

        expect(settings.generation_mode).toBe("primary");
        expect(settings.board_prompt_template).toBe(APPROVED_BOARD_PROMPT_TEMPLATE);
        expect(settings.quota_charging).toEqual({
            auto: true,
            manual_override: null,
        });
    });

    it("rejects an incomplete board prompt before updating site settings", async () => {
        mockGetCurrentUserOrDevAdmin.mockResolvedValue({ id: "clerk_admin" });
        const upsert = vi.fn();
        mockCreateClient.mockReturnValue({
            from: vi.fn((table: string) => {
                if (table === "profiles") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                single: vi.fn().mockResolvedValue({
                                    data: { id: "profile_admin", role: "admin" },
                                    error: null,
                                }),
                            })),
                        })),
                    };
                }
                return { upsert };
            }),
        });

        const result = await updateSiteSetting(
            "board_prompt_template",
            "{{GARMENT_COLOR}} only"
        );

        expect(result).toMatchObject({ success: false });
        expect(result.error).toContain("{{PLACEMENT}}");
        expect(upsert).not.toHaveBeenCalled();
    });

    it("persists the scalar generation mode through the guarded settings action", async () => {
        mockGetCurrentUserOrDevAdmin.mockResolvedValue({ id: "clerk_admin" });
        const upsert = vi.fn().mockResolvedValue({ error: null });
        mockCreateClient.mockReturnValue({
            from: vi.fn((table: string) => {
                if (table === "profiles") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                single: vi.fn().mockResolvedValue({
                                    data: { id: "profile_admin", role: "dev" },
                                    error: null,
                                }),
                            })),
                        })),
                    };
                }
                return { upsert };
            }),
        });

        await expect(updateSiteSetting("generation_mode", "fallback")).resolves.toMatchObject({
            success: true,
        });
        expect(upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                key: "generation_mode",
                value: "fallback",
            }),
            { onConflict: "key" }
        );
    });

    it("rejects board fallback setting updates when the caller is not admin or dev", async () => {
        mockGetCurrentUserOrDevAdmin.mockResolvedValue({ id: "clerk_subscriber" });
        const upsert = vi.fn();
        mockCreateClient.mockReturnValue({
            from: vi.fn((table: string) => {
                if (table === "profiles") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                single: vi.fn().mockResolvedValue({
                                    data: { id: "profile_subscriber", role: "subscriber" },
                                    error: null,
                                }),
                            })),
                        })),
                    };
                }
                return { upsert };
            }),
        });

        await expect(updateSiteSetting("generation_mode", "fallback"))
            .rejects.toThrow("Forbidden");
        await expect(updateSiteSetting("quota_charging", {
            auto: false,
            manual_override: "enabled",
        })).rejects.toThrow("Forbidden");
        expect(upsert).not.toHaveBeenCalled();
    });

    it("rejects non-JSON setting values before upsert", async () => {
        mockGetCurrentUserOrDevAdmin.mockResolvedValue({ id: "clerk_admin" });
        const upsert = vi.fn();
        mockCreateClient.mockReturnValue({
            from: vi.fn((table: string) => {
                if (table === "profiles") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                single: vi.fn().mockResolvedValue({
                                    data: { id: "profile_admin", role: "admin" },
                                    error: null,
                                }),
                            })),
                        })),
                    };
                }
                return { upsert };
            }),
        });

        const result = await updateSiteSetting("site_info", {
            launched_at: new Date("2026-07-22T00:00:00.000Z"),
        });

        expect(result).toMatchObject({ success: false });
        expect(upsert).not.toHaveBeenCalled();
    });
});
