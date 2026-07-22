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

const APPROVED_BOARD_PROMPT_TEMPLATE = `Create a premium streetwear apparel presentation board. Single image, square 1:1 composition, high resolution.

═══ LAYOUT — one square image split into two stacked zones ═══

TOP ZONE (upper ~55%):
A realistic premium oversized boxy t-shirt, front view, in color {{GARMENT_COLOR}}.
The custom design is printed on the {{PLACEMENT}} at an approximate size of {{WIDTH}}cm × {{HEIGHT}}cm.
The print must look genuinely integrated into the fabric — following folds, preserving cotton texture, clean DTF edges, NO white box, NO sticker effect, NO floating rectangle.
Studio lighting, soft shadows, neutral background.

BOTTOM ZONE (lower ~45%):
The SAME design shown flat and complete, isolated on a neutral background, centered, uncropped, no garment, no folds, no perspective.
This must be visually identical to the print in the top zone.

Below the flat design, show simple indicative measurement guides:
- horizontal line labeled with the width
- vertical line labeled with the height
Keep measurement text minimal and in Latin numerals only (e.g. "40 cm", "27 cm").
These measurements are INDICATIVE ONLY.

═══ THE DESIGN ═══

{{DESIGN_DESCRIPTION}}

Art style: {{STYLE}}
{{TEXT_BLOCK}}

═══ HARD RULES ═══
- The design in both zones must be identical.
- Do NOT invent extra graphics, logos, badges, or frames.
- Do NOT generate any text other than what is explicitly requested and the measurement labels.
- Do NOT write Arabic text as image content unless it is part of the requested design.
- Keep the whole board clean, minimal, editorial, premium.`;

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
