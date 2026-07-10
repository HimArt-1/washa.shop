"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath, revalidateTag, unstable_cache, unstable_noStore as noStore } from "next/cache";
import { generateNextSKU } from "@/lib/product-identifiers";
import { getCurrentUserOrDevAdmin } from "@/lib/admin-access";
import {
    DEFAULT_OPERATIONAL_RULES,
    getOperationalRules,
    normalizeOperationalRules,
    type OperationalRulesConfig,
} from "@/lib/operational-rules";
import { getInventoryWithSales } from "@/app/actions/erp/inventory";
import { createTimeoutFetch, readPositiveIntegerEnv, withTimeout } from "@/lib/async-timeout";
import type { WashaAiControls, WashaAiCreditPackage } from "@/types/database";

const SITE_SETTINGS_CACHE_TAG = "site-settings";
const PUBLIC_VISIBILITY_CACHE_TAG = "public-visibility";
const SITE_SETTINGS_QUERY_TIMEOUT_MS = readPositiveIntegerEnv("SITE_SETTINGS_QUERY_TIMEOUT_MS", 1200, 500, 10000);
const SITE_SETTINGS_CACHE_REVALIDATE_SECONDS = readPositiveIntegerEnv("SITE_SETTINGS_CACHE_REVALIDATE_SECONDS", 120, 10, 3600);

export type WashaAiDevAccessMode = "disabled" | "admin" | "link";

// ─── Admin Supabase Client ──────────────────────────────────

function hasAdminSupabaseConfig() {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getAdminSupabase(options?: { timeoutMs?: number }) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured — admin operations require the service role key.");
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
    }

    const clientOptions: Parameters<typeof createClient>[2] = {
        auth: { persistSession: false },
    };

    if (options?.timeoutMs) {
        clientOptions.global = {
            fetch: createTimeoutFetch(options.timeoutMs),
        };
    }

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceKey,
        clientOptions
    );
}

async function requireAdmin() {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("clerk_id", user.id)
        .single();
    if (profile?.role !== "admin" && profile?.role !== "dev") throw new Error("Forbidden");
    return { user, profileId: profile.id as string | null };
}

export type SiteSettingsType = {
    visibility: {
        gallery?: boolean;
        store?: boolean;
        signup?: boolean;
        join?: boolean;
        join_artist?: boolean;
        ai_section?: boolean;
        hero_auth_buttons?: boolean;
        hero_washa_ai_button?: boolean;
        hero_join_artist_button?: boolean;
        design_piece?: boolean;
        design_piece_dtf_studio_switch?: boolean;
        design_piece_generation_public?: boolean;
        washa_ai_dev_access?: WashaAiDevAccessMode;
        washa_ai_dev_v2_access?: WashaAiDevAccessMode;
    };
    washa_ai?: {
        dtf_daily_quota_limit?: number;
        dtf_guest_daily_quota_limit?: number;
        dtf_booth_daily_quota_limit?: number;
        dtf_wushsha_daily_quota_limit?: number;
        credit_packages?: WashaAiCreditPackage[];
        controls?: WashaAiControls;
    };
    site_info: Record<string, string>;
    shipping: {
        flat_rate?: number;
        free_above?: number;
        tax_rate?: number;
        shipping_enabled?: boolean;
        tax_enabled?: boolean;
    };
    creation_prices?: { tshirt?: number; hoodie?: number; pullover?: number };
    product_identifiers?: { prefix?: string; product_code_template?: string; sku_template?: string; type_map?: Record<string, string> };
    ai_simulation?: {
        step1_image?: string;
        step1_color_name?: string;
        step1_pattern?: string;
        step2_prompt?: string;
        step2_art_style?: string;
        step2_result_image?: string;
        step3_final_image?: string;
    };
    brand_assets?: {
        business_card_name?: string;
        business_card_title?: string;
        business_card_phone?: string;
        business_card_email?: string;
        business_card_website?: string;
        thank_you_title?: string;
        thank_you_message?: string;
        thank_you_handle?: string;
        social_instagram?: string;
        social_twitter?: string;
        social_tiktok?: string;
        social_snapchat?: string;
        social_whatsapp?: string;
        linktree_title?: string;
        linktree_subtitle?: string;
        show_instagram?: boolean;
        show_twitter?: boolean;
        show_tiktok?: boolean;
        show_snapchat?: boolean;
        show_whatsapp?: boolean;
        show_website?: boolean;
    };
    operational_rules: OperationalRulesConfig;
};

const DEFAULT_SITE_SETTINGS: SiteSettingsType = {
    visibility: {
        gallery: false,
        store: true,
        signup: false,
        join: true,
        join_artist: true,
        ai_section: true,
        hero_auth_buttons: true,
        hero_washa_ai_button: true,
        hero_join_artist_button: false,
        design_piece: true,
        design_piece_dtf_studio_switch: true,
        design_piece_generation_public: false,
        washa_ai_dev_access: "admin",
        washa_ai_dev_v2_access: "admin",
    },
    washa_ai: {
        dtf_daily_quota_limit: 5,
        dtf_guest_daily_quota_limit: 3,
        dtf_booth_daily_quota_limit: 25,
        dtf_wushsha_daily_quota_limit: 15,
        credit_packages: [
            { id: "starter", label: "باقة البداية", credits: 20, price: 25, active: true },
            { id: "popular", label: "الباقة الرائجة", credits: 60, price: 60, popular: true, active: true },
            { id: "pro", label: "باقة المحترف", credits: 150, price: 120, active: true },
        ],
        controls: {
            quota_enabled: true,
            credits_enabled: true,
            audience: { guest: true, subscriber: true, wushsha: true, booth: true },
            purchase: { subscriber: true, wushsha: true },
        },
    },
    site_info: { name: "وشّى", description: "منصة الفن العربي الأصيل", email: "", phone: "", instagram: "", twitter: "", tiktok: "" },
    shipping: { flat_rate: 30, free_above: 500, tax_rate: 15, shipping_enabled: true, tax_enabled: true },
    creation_prices: { tshirt: 89, hoodie: 149, pullover: 129 },
    product_identifiers: {
        prefix: "WSH",
        product_code_template: "{PREFIX}-{SEQ:5}",
        sku_template: "{PREFIX}-{TYPE}-{SEQ:5}-{SIZE}-{COLOR}",
        type_map: {},
    },
    ai_simulation: {
        step1_image: "/images/design/heavy-tshirt-black-front.svg",
        step1_color_name: "أسود كلاسيك",
        step1_pattern: "بدون نمط",
        step2_prompt: "اكتب عبارة عربية أنيقة مستوحاة من الهوية السعودية مع تفاصيل ذهبية هادئة.",
        step2_art_style: "هوية وشّى للطباعة",
        step2_result_image: "/generated/washa_tshirt.png",
        step3_final_image: "/generated/washa_pos_front.png",
    },
    brand_assets: {
        business_card_name: "حمزة آرت",
        business_card_title: "المدير الإبداعي | Founder",
        business_card_phone: "+966 53 223 5005",
        business_card_email: "washaksa@hotmail.com",
        business_card_website: "www.washa.shop",
        thank_you_title: "شكراً لثقتكم",
        thank_you_message: "نحن في \"وشّى\" نصنع الفن بحُب وإتقان، \nونتمنى أن تنال هذه القطعة الفنية إعجابك كما نالت شغفنا بصنعها.\n\nيسعدنا مشاركتك لإطلالتك معنا!",
        thank_you_handle: "@washha.sa",
        social_instagram: "@wusha.art",
        social_twitter: "@wusha_art",
        social_tiktok: "@wusha.art",
        social_snapchat: "@wusha.art",
        social_whatsapp: "+966532235005",
        linktree_title: "وشّى منصة الفن",
        linktree_subtitle: "الإبداع بين يديك",
        show_instagram: true,
        show_twitter: true,
        show_tiktok: true,
        show_snapchat: true,
        show_whatsapp: true,
        show_website: true,
    },
    operational_rules: DEFAULT_OPERATIONAL_RULES,
};

export type OperationalRuleSignalState = "disabled" | "healthy" | "warning" | "critical";

export type OperationalRuleSignal = {
    id: string;
    title: string;
    description: string;
    currentLabel: string;
    thresholdLabel: string;
    state: OperationalRuleSignalState;
};

export type OperationalRulesDiagnostics = {
    defaults: OperationalRulesConfig;
    metrics: {
        support: {
            slaAtRisk: number;
            slaBreached: number;
        };
        inventory: {
            criticalStockouts: number;
            highPressureRestocks: number;
            lowStockTotal: number;
            fulfillmentQueue: number;
        };
        payments: {
            failedPayments: number;
            atRiskRevenue: number;
            pendingPayments: number;
            outstandingRevenue: number;
        };
        orders: {
            pendingReview: number;
            fulfillmentQueue: number;
            paymentPending: number;
        };
    };
    sections: {
        support: OperationalRuleSignal[];
        inventory: OperationalRuleSignal[];
        payments: OperationalRuleSignal[];
        orders: OperationalRuleSignal[];
    };
    recentChanges: Array<{
        id: string;
        createdAt: string;
        message: string;
        actor: string;
        changedKeys: string[];
    }>;
};

function formatThresholdNumber(value: number) {
    return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 }).format(Math.round(value));
}

function coerceDtfDailyQuotaLimit(value: unknown, fallback = 5) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(1, Math.round(parsed));
}

function normalizeCreditPackages(value: unknown, fallback: WashaAiCreditPackage[]): WashaAiCreditPackage[] {
    if (!Array.isArray(value)) return fallback;

    const seenIds = new Set<string>();
    const packages: WashaAiCreditPackage[] = [];

    for (const raw of value) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as Record<string, unknown>;

        const id = typeof item.id === "string" ? item.id.trim() : "";
        const credits = Math.round(Number(item.credits));
        const price = Math.round(Number(item.price) * 100) / 100;
        if (!id || seenIds.has(id) || !Number.isFinite(credits) || credits <= 0) continue;
        if (!Number.isFinite(price) || price < 0) continue;

        seenIds.add(id);
        packages.push({
            id,
            label: typeof item.label === "string" && item.label.trim() ? item.label.trim() : id,
            credits,
            price,
            popular: item.popular === true,
            active: item.active !== false,
        });
    }

    return packages.length > 0 ? packages : fallback;
}

function coerceBool(value: unknown, fallback: boolean) {
    return typeof value === "boolean" ? value : fallback;
}

function normalizeWashaAiControls(value: unknown, fallback: WashaAiControls): WashaAiControls {
    const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
    const audience = (raw.audience && typeof raw.audience === "object" ? raw.audience : {}) as Record<string, unknown>;
    const purchase = (raw.purchase && typeof raw.purchase === "object" ? raw.purchase : {}) as Record<string, unknown>;

    return {
        quota_enabled: coerceBool(raw.quota_enabled, fallback.quota_enabled),
        credits_enabled: coerceBool(raw.credits_enabled, fallback.credits_enabled),
        audience: {
            guest: coerceBool(audience.guest, fallback.audience.guest),
            subscriber: coerceBool(audience.subscriber, fallback.audience.subscriber),
            wushsha: coerceBool(audience.wushsha, fallback.audience.wushsha),
            booth: coerceBool(audience.booth, fallback.audience.booth),
        },
        purchase: {
            subscriber: coerceBool(purchase.subscriber, fallback.purchase.subscriber),
            wushsha: coerceBool(purchase.wushsha, fallback.purchase.wushsha),
        },
    };
}

function normalizeWashaAiSettings(value: unknown): Required<NonNullable<SiteSettingsType["washa_ai"]>> {
    const washaAi = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
    const fallback = DEFAULT_SITE_SETTINGS.washa_ai;

    return {
        dtf_daily_quota_limit: coerceDtfDailyQuotaLimit(
            washaAi.dtf_daily_quota_limit,
            fallback?.dtf_daily_quota_limit ?? 5
        ),
        dtf_guest_daily_quota_limit: coerceDtfDailyQuotaLimit(
            washaAi.dtf_guest_daily_quota_limit,
            fallback?.dtf_guest_daily_quota_limit ?? 3
        ),
        dtf_booth_daily_quota_limit: coerceDtfDailyQuotaLimit(
            washaAi.dtf_booth_daily_quota_limit,
            fallback?.dtf_booth_daily_quota_limit ?? 25
        ),
        dtf_wushsha_daily_quota_limit: coerceDtfDailyQuotaLimit(
            washaAi.dtf_wushsha_daily_quota_limit,
            fallback?.dtf_wushsha_daily_quota_limit ?? 15
        ),
        credit_packages: normalizeCreditPackages(
            washaAi.credit_packages,
            fallback?.credit_packages ?? []
        ),
        controls: normalizeWashaAiControls(
            washaAi.controls,
            fallback?.controls ?? DEFAULT_SITE_SETTINGS.washa_ai!.controls!
        ),
    };
}

function coerceBooleanSetting(value: unknown, fallback: boolean) {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "yes", "on"].includes(normalized)) {
            return true;
        }
        if (["false", "0", "no", "off"].includes(normalized)) {
            return false;
        }
    }

    if (typeof value === "number") {
        if (value === 1) return true;
        if (value === 0) return false;
    }

    return fallback;
}

function coerceWashaAiDevAccessMode(value: unknown, fallback: WashaAiDevAccessMode): WashaAiDevAccessMode {
    if (typeof value !== "string") return fallback;
    if (value === "disabled" || value === "admin" || value === "link") return value;
    return fallback;
}

function normalizeVisibilitySettings(value: unknown): SiteSettingsType["visibility"] {
    const visibility = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
    const fallback = DEFAULT_SITE_SETTINGS.visibility;

    return {
        gallery: coerceBooleanSetting(visibility.gallery, fallback.gallery ?? false),
        store: coerceBooleanSetting(visibility.store, fallback.store ?? false),
        signup: coerceBooleanSetting(visibility.signup, fallback.signup ?? false),
        join: coerceBooleanSetting(visibility.join, fallback.join ?? true),
        join_artist: coerceBooleanSetting(visibility.join_artist, fallback.join_artist ?? true),
        ai_section: coerceBooleanSetting(visibility.ai_section, fallback.ai_section ?? true),
        hero_auth_buttons: coerceBooleanSetting(visibility.hero_auth_buttons, fallback.hero_auth_buttons ?? true),
        hero_washa_ai_button: coerceBooleanSetting(visibility.hero_washa_ai_button, fallback.hero_washa_ai_button ?? true),
        hero_join_artist_button: coerceBooleanSetting(visibility.hero_join_artist_button, fallback.hero_join_artist_button ?? false),
        design_piece: coerceBooleanSetting(visibility.design_piece, fallback.design_piece ?? true),
        design_piece_dtf_studio_switch: coerceBooleanSetting(visibility.design_piece_dtf_studio_switch, fallback.design_piece_dtf_studio_switch ?? true),
        design_piece_generation_public: coerceBooleanSetting(
            visibility.design_piece_generation_public,
            fallback.design_piece_generation_public ?? false
        ),
        washa_ai_dev_access: coerceWashaAiDevAccessMode(
            visibility.washa_ai_dev_access,
            fallback.washa_ai_dev_access ?? "admin"
        ),
        washa_ai_dev_v2_access: coerceWashaAiDevAccessMode(
            visibility.washa_ai_dev_v2_access,
            fallback.washa_ai_dev_v2_access ?? "admin"
        ),
    };
}

function determineSignalState(options: {
    current: number;
    warningMin?: number | null;
    criticalMin?: number | null;
}) {
    const warningMin = typeof options.warningMin === "number" ? options.warningMin : null;
    const criticalMin = typeof options.criticalMin === "number" ? options.criticalMin : null;

    const warningEnabled = warningMin !== null && warningMin > 0;
    const criticalEnabled = criticalMin !== null && criticalMin > 0;

    if (!warningEnabled && !criticalEnabled) {
        return "disabled" as const;
    }

    if (criticalEnabled && options.current >= criticalMin) {
        return "critical" as const;
    }

    if (warningEnabled && options.current >= warningMin) {
        return "warning" as const;
    }

    return "healthy" as const;
}

function collectChangedRuleKeys(before: OperationalRulesConfig, after: OperationalRulesConfig) {
    const changedKeys: string[] = [];

    for (const [section, values] of Object.entries(after) as Array<[keyof OperationalRulesConfig, Record<string, number>]>) {
        const previousValues = before[section] as Record<string, number>;
        for (const [key, nextValue] of Object.entries(values)) {
            if (previousValues[key] !== nextValue) {
                changedKeys.push(`${section}.${key}`);
            }
        }
    }

    return changedKeys;
}

function buildSiteSettings(settings: Record<string, any>): SiteSettingsType {
    const visibility = normalizeVisibilitySettings(settings.visibility);
    const cp = settings.creation_prices || {};
    const pi = settings.product_identifiers || {};
    const aiSim = settings.ai_simulation || {};

    return {
        visibility,
        washa_ai: normalizeWashaAiSettings(settings.washa_ai),
        site_info: settings.site_info || DEFAULT_SITE_SETTINGS.site_info,
        shipping: {
            flat_rate: Number(settings.shipping?.flat_rate ?? DEFAULT_SITE_SETTINGS.shipping.flat_rate),
            free_above: Number(settings.shipping?.free_above ?? DEFAULT_SITE_SETTINGS.shipping.free_above),
            tax_rate: Number(settings.shipping?.tax_rate ?? DEFAULT_SITE_SETTINGS.shipping.tax_rate),
            shipping_enabled: coerceBooleanSetting(
                settings.shipping?.shipping_enabled,
                DEFAULT_SITE_SETTINGS.shipping.shipping_enabled ?? true
            ),
            tax_enabled: coerceBooleanSetting(
                settings.shipping?.tax_enabled,
                DEFAULT_SITE_SETTINGS.shipping.tax_enabled ?? true
            ),
        },
        creation_prices: {
            tshirt: cp.tshirt ?? DEFAULT_SITE_SETTINGS.creation_prices?.tshirt ?? 89,
            hoodie: cp.hoodie ?? DEFAULT_SITE_SETTINGS.creation_prices?.hoodie ?? 149,
            pullover: cp.pullover ?? DEFAULT_SITE_SETTINGS.creation_prices?.pullover ?? 129,
        },
        product_identifiers: {
            prefix: pi.prefix ?? DEFAULT_SITE_SETTINGS.product_identifiers?.prefix ?? "WSH",
            product_code_template: pi.product_code_template ?? DEFAULT_SITE_SETTINGS.product_identifiers?.product_code_template ?? "{PREFIX}-{SEQ:5}",
            sku_template: pi.sku_template ?? DEFAULT_SITE_SETTINGS.product_identifiers?.sku_template ?? "{PREFIX}-{TYPE}-{SEQ:5}-{SIZE}-{COLOR}",
            type_map: pi.type_map ?? DEFAULT_SITE_SETTINGS.product_identifiers?.type_map ?? { print: "P", apparel: "T", digital: "D", nft: "N", original: "O" },
        },
        ai_simulation: {
            step1_image: aiSim.step1_image ?? DEFAULT_SITE_SETTINGS.ai_simulation?.step1_image ?? "",
            step1_color_name: aiSim.step1_color_name ?? DEFAULT_SITE_SETTINGS.ai_simulation?.step1_color_name ?? "",
            step1_pattern: aiSim.step1_pattern ?? DEFAULT_SITE_SETTINGS.ai_simulation?.step1_pattern ?? "",
            step2_prompt: aiSim.step2_prompt ?? DEFAULT_SITE_SETTINGS.ai_simulation?.step2_prompt ?? "",
            step2_art_style: aiSim.step2_art_style ?? DEFAULT_SITE_SETTINGS.ai_simulation?.step2_art_style ?? "",
            step2_result_image: aiSim.step2_result_image ?? DEFAULT_SITE_SETTINGS.ai_simulation?.step2_result_image ?? "",
            step3_final_image: aiSim.step3_final_image ?? DEFAULT_SITE_SETTINGS.ai_simulation?.step3_final_image ?? "",
        },
        brand_assets: {
            business_card_name: settings.brand_assets?.business_card_name ?? DEFAULT_SITE_SETTINGS.brand_assets?.business_card_name ?? "",
            business_card_title: settings.brand_assets?.business_card_title ?? DEFAULT_SITE_SETTINGS.brand_assets?.business_card_title ?? "",
            business_card_phone: settings.brand_assets?.business_card_phone ?? DEFAULT_SITE_SETTINGS.brand_assets?.business_card_phone ?? "",
            business_card_email: settings.brand_assets?.business_card_email ?? DEFAULT_SITE_SETTINGS.brand_assets?.business_card_email ?? "",
            business_card_website: settings.brand_assets?.business_card_website ?? DEFAULT_SITE_SETTINGS.brand_assets?.business_card_website ?? "",
            thank_you_title: settings.brand_assets?.thank_you_title ?? DEFAULT_SITE_SETTINGS.brand_assets?.thank_you_title ?? "",
            thank_you_message: settings.brand_assets?.thank_you_message ?? DEFAULT_SITE_SETTINGS.brand_assets?.thank_you_message ?? "",
            thank_you_handle: settings.brand_assets?.thank_you_handle ?? DEFAULT_SITE_SETTINGS.brand_assets?.thank_you_handle ?? "",
            social_instagram: settings.brand_assets?.social_instagram ?? DEFAULT_SITE_SETTINGS.brand_assets?.social_instagram ?? "",
            social_twitter: settings.brand_assets?.social_twitter ?? DEFAULT_SITE_SETTINGS.brand_assets?.social_twitter ?? "",
            social_tiktok: settings.brand_assets?.social_tiktok ?? DEFAULT_SITE_SETTINGS.brand_assets?.social_tiktok ?? "",
            social_snapchat: settings.brand_assets?.social_snapchat ?? DEFAULT_SITE_SETTINGS.brand_assets?.social_snapchat ?? "",
            social_whatsapp: settings.brand_assets?.social_whatsapp ?? DEFAULT_SITE_SETTINGS.brand_assets?.social_whatsapp ?? "",
            linktree_title: settings.brand_assets?.linktree_title ?? DEFAULT_SITE_SETTINGS.brand_assets?.linktree_title ?? "",
            linktree_subtitle: settings.brand_assets?.linktree_subtitle ?? DEFAULT_SITE_SETTINGS.brand_assets?.linktree_subtitle ?? "",
            show_instagram: settings.brand_assets?.show_instagram ?? DEFAULT_SITE_SETTINGS.brand_assets?.show_instagram ?? true,
            show_twitter: settings.brand_assets?.show_twitter ?? DEFAULT_SITE_SETTINGS.brand_assets?.show_twitter ?? true,
            show_tiktok: settings.brand_assets?.show_tiktok ?? DEFAULT_SITE_SETTINGS.brand_assets?.show_tiktok ?? true,
            show_snapchat: settings.brand_assets?.show_snapchat ?? DEFAULT_SITE_SETTINGS.brand_assets?.show_snapchat ?? true,
            show_whatsapp: settings.brand_assets?.show_whatsapp ?? DEFAULT_SITE_SETTINGS.brand_assets?.show_whatsapp ?? true,
            show_website: settings.brand_assets?.show_website ?? DEFAULT_SITE_SETTINGS.brand_assets?.show_website ?? true,
        },
        operational_rules: normalizeOperationalRules(settings.operational_rules),
    };
}

// ═══════════════════════════════════════════════════════════
//  GET ALL SETTINGS
// ═══════════════════════════════════════════════════════════

async function getSiteSettingsUncached() {
    if (!hasAdminSupabaseConfig()) {
        return DEFAULT_SITE_SETTINGS;
    }

    try {
        const supabase = getAdminSupabase({ timeoutMs: SITE_SETTINGS_QUERY_TIMEOUT_MS });
        const { data, error } = await withTimeout(
            supabase
                .from("site_settings")
                .select("key, value"),
            SITE_SETTINGS_QUERY_TIMEOUT_MS + 250,
            "getSiteSettings"
        );

        if (error || !data) {
            return DEFAULT_SITE_SETTINGS;
        }

        const settings: Record<string, any> = {};
        for (const row of data) {
            settings[row.key] = row.value;
        }

        return buildSiteSettings(settings);
    } catch (error) {
        console.warn("getSiteSettings: returning defaults after settings lookup failed", error);
        return DEFAULT_SITE_SETTINGS;
    }
}

const getCachedSiteSettings = unstable_cache(getSiteSettingsUncached, [SITE_SETTINGS_CACHE_TAG], {
    revalidate: SITE_SETTINGS_CACHE_REVALIDATE_SECONDS,
    tags: [SITE_SETTINGS_CACHE_TAG],
});

export async function getSiteSettings() {
    return getCachedSiteSettings();
}

export async function getOperationalRulesDiagnostics(): Promise<OperationalRulesDiagnostics> {
    noStore();

    try {
        await requireAdmin();
        const supabase = getAdminSupabase();
        const rules = await getOperationalRules();

        const [
            supportActiveResult,
            pendingOrdersResult,
            fulfillmentQueueResult,
            pendingPaymentsResult,
            failedPaymentsResult,
            pendingPaymentTotalsResult,
            failedPaymentTotalsResult,
            changesResult,
            inventoryWithSales,
        ] = await Promise.all([
            supabase.from("support_tickets")
                .select("id, created_at, priority")
                .in("status", ["open", "in_progress"])
                .limit(40),
            supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "confirmed"]),
            supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["processing", "shipped"]),
            supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "pending").neq("status", "cancelled").neq("status", "refunded"),
            supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "failed").neq("status", "cancelled").neq("status", "refunded"),
            supabase.from("orders").select("total").eq("payment_status", "pending").neq("status", "cancelled").neq("status", "refunded"),
            supabase.from("orders").select("total").eq("payment_status", "failed").neq("status", "cancelled").neq("status", "refunded"),
            supabase.from("system_logs")
                .select("id, message, metadata, created_at, user:profiles!system_logs_user_id_fkey(display_name, username)")
                .eq("source", "settings.operational_rules.update")
                .order("created_at", { ascending: false })
                .limit(6),
            getInventoryWithSales(),
        ]);

        const supportActive = supportActiveResult.data ?? [];
        const supportQueue = supportActive.map((ticket) => {
            const ageHours = (Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60);
            const isHighPriority = ticket.priority === "high";
            const riskThreshold = isHighPriority ? 2 : 8;
            const breachThreshold = isHighPriority ? 6 : 24;

            return {
                id: ticket.id,
                ageHours,
                slaState: ageHours >= breachThreshold ? "breached" : ageHours >= riskThreshold ? "at_risk" : "healthy",
            };
        });

        const slaAtRisk = supportQueue.filter((ticket) => ticket.slaState === "at_risk").length;
        const slaBreached = supportQueue.filter((ticket) => ticket.slaState === "breached").length;

        const inventory = Array.isArray((inventoryWithSales as { inventory?: any[] })?.inventory)
            ? (inventoryWithSales as { inventory: any[] }).inventory
            : [];
        const inventoryStats = (inventoryWithSales as { stats?: { lowStock?: number } | null })?.stats ?? null;

        const criticalStockouts = inventory.filter((item: any) => {
            const quantity = Number(item.quantity) || 0;
            const soldCount = Number(item.sold_count) || 0;
            return quantity === 0 && soldCount > 0;
        }).length;

        const highPressureRestocks = inventory.filter((item: any) => {
            const quantity = Number(item.quantity) || 0;
            const soldCount = Number(item.sold_count) || 0;
            return quantity > 0 && quantity <= 2 && (soldCount > quantity || soldCount >= 4);
        }).length;

        const pendingReview = pendingOrdersResult.count ?? 0;
        const fulfillmentQueue = fulfillmentQueueResult.count ?? 0;
        const paymentPending = pendingPaymentsResult.count ?? 0;
        const failedPayments = failedPaymentsResult.count ?? 0;
        const outstandingRevenue = (pendingPaymentTotalsResult.data ?? []).reduce((sum, row: { total: number }) => sum + (Number(row.total) || 0), 0);
        const atRiskRevenue = (failedPaymentTotalsResult.data ?? []).reduce((sum, row: { total: number }) => sum + (Number(row.total) || 0), 0);

        const recentChanges = (changesResult.data ?? []).map((entry: any) => {
            const actorName = entry.user?.display_name || entry.user?.username || "أدمن";
            const changedKeys = Array.isArray(entry.metadata?.changed_keys) ? entry.metadata.changed_keys : [];

            return {
                id: entry.id,
                createdAt: entry.created_at,
                message: entry.message,
                actor: actorName,
                changedKeys,
            };
        });

        return {
            defaults: DEFAULT_OPERATIONAL_RULES,
            metrics: {
                support: {
                    slaAtRisk,
                    slaBreached,
                },
                inventory: {
                    criticalStockouts,
                    highPressureRestocks,
                    lowStockTotal: inventoryStats?.lowStock ?? 0,
                    fulfillmentQueue,
                },
                payments: {
                    failedPayments,
                    atRiskRevenue,
                    pendingPayments: paymentPending,
                    outstandingRevenue,
                },
                orders: {
                    pendingReview,
                    fulfillmentQueue,
                    paymentPending,
                },
            },
            sections: {
                support: [
                    {
                        id: "support.slaAtRiskMin",
                        title: "التذاكر القريبة من تجاوز SLA",
                        description: "يعرض التذاكر التي دخلت منطقة الخطر قبل التحول إلى تعثر فعلي.",
                        currentLabel: `${formatThresholdNumber(slaAtRisk)} تذكرة`,
                        thresholdLabel: rules.support.slaAtRiskMin > 0 ? `يتحرك عند ${formatThresholdNumber(rules.support.slaAtRiskMin)}+` : "معطل",
                        state: determineSignalState({ current: slaAtRisk, warningMin: rules.support.slaAtRiskMin }),
                    },
                    {
                        id: "support.slaBreachedMin",
                        title: "التذاكر المتجاوزة لـ SLA",
                        description: "يعرض الحالات التي تجاوزت نافذة الخدمة بالفعل وتحتاج تصعيدًا فوريًا.",
                        currentLabel: `${formatThresholdNumber(slaBreached)} تذكرة`,
                        thresholdLabel: rules.support.slaBreachedMin > 0 ? `يتحرك عند ${formatThresholdNumber(rules.support.slaBreachedMin)}+` : "معطل",
                        state: determineSignalState({ current: slaBreached, criticalMin: rules.support.slaBreachedMin }),
                    },
                ],
                inventory: [
                    {
                        id: "inventory.criticalStockoutsMin",
                        title: "نفاد المخزون الحرج",
                        description: "عناصر نافدة لديها سحب فعلي من المبيعات وقد تؤثر على التنفيذ.",
                        currentLabel: `${formatThresholdNumber(criticalStockouts)} عنصر`,
                        thresholdLabel: rules.inventory.criticalStockoutsMin > 0 ? `يتحرك عند ${formatThresholdNumber(rules.inventory.criticalStockoutsMin)}+` : "معطل",
                        state:
                            rules.inventory.criticalStockoutsMin === 0
                                ? "disabled"
                                : criticalStockouts >= rules.inventory.criticalStockoutsMin
                                  ? (rules.inventory.fulfillmentQueueCriticalMin > 0 && fulfillmentQueue >= rules.inventory.fulfillmentQueueCriticalMin ? "critical" : "warning")
                                  : "healthy",
                    },
                    {
                        id: "inventory.restockPressureItemsMin",
                        title: "ضغط إعادة التعبئة",
                        description: "ينظر إلى العناصر عالية الضغط وإجمالي منخفض المخزون معًا.",
                        currentLabel: `${formatThresholdNumber(highPressureRestocks)} عالي الضغط / ${formatThresholdNumber(inventoryStats?.lowStock ?? 0)} منخفض`,
                        thresholdLabel:
                            rules.inventory.restockPressureItemsMin > 0 || rules.inventory.lowStockTotalMin > 0
                                ? `عناصر ${formatThresholdNumber(rules.inventory.restockPressureItemsMin)}+ أو منخفض ${formatThresholdNumber(rules.inventory.lowStockTotalMin)}+`
                                : "معطل",
                        state:
                            rules.inventory.restockPressureItemsMin === 0 && rules.inventory.lowStockTotalMin === 0
                                ? "disabled"
                                : (
                                    (rules.inventory.restockPressureItemsMin > 0 && highPressureRestocks >= rules.inventory.restockPressureItemsMin) ||
                                    (rules.inventory.lowStockTotalMin > 0 && (inventoryStats?.lowStock ?? 0) >= rules.inventory.lowStockTotalMin)
                                  )
                                  ? "warning"
                                  : "healthy",
                    },
                ],
                payments: [
                    {
                        id: "payments.failedPaymentsWarningMin",
                        title: "المدفوعات المتعثرة",
                        description: "يراقب عدد المدفوعات المتعثرة والإيراد المعرض للخطر في نفس الإشارة.",
                        currentLabel: `${formatThresholdNumber(failedPayments)} متعثرة / ${formatThresholdNumber(atRiskRevenue)} ر.س معرض`,
                        thresholdLabel:
                            rules.payments.failedPaymentsWarningMin > 0 || rules.payments.atRiskRevenueWarning > 0
                                ? `تحذير: ${formatThresholdNumber(rules.payments.failedPaymentsWarningMin)} أو ${formatThresholdNumber(rules.payments.atRiskRevenueWarning)} ر.س`
                                : "معطل",
                        state:
                            (rules.payments.failedPaymentsWarningMin === 0 && rules.payments.atRiskRevenueWarning === 0)
                                ? "disabled"
                                : (
                                    (rules.payments.failedPaymentsCriticalMin > 0 && failedPayments >= rules.payments.failedPaymentsCriticalMin) ||
                                    (rules.payments.atRiskRevenueCritical > 0 && atRiskRevenue >= rules.payments.atRiskRevenueCritical)
                                  )
                                  ? "critical"
                                  : (
                                        (rules.payments.failedPaymentsWarningMin > 0 && failedPayments >= rules.payments.failedPaymentsWarningMin) ||
                                        (rules.payments.atRiskRevenueWarning > 0 && atRiskRevenue >= rules.payments.atRiskRevenueWarning)
                                    )
                                    ? "warning"
                                    : "healthy",
                    },
                    {
                        id: "payments.pendingPaymentsWarningMin",
                        title: "طابور التحصيل المعلق",
                        description: "يعرض عدد الطلبات بانتظار الدفع والإيراد المعلّق الذي يحتاج متابعة.",
                        currentLabel: `${formatThresholdNumber(paymentPending)} طلب / ${formatThresholdNumber(outstandingRevenue)} ر.س معلق`,
                        thresholdLabel:
                            rules.payments.pendingPaymentsWarningMin > 0 || rules.payments.outstandingRevenueWarning > 0
                                ? `تحذير: ${formatThresholdNumber(rules.payments.pendingPaymentsWarningMin)} أو ${formatThresholdNumber(rules.payments.outstandingRevenueWarning)} ر.س`
                                : "معطل",
                        state:
                            (rules.payments.pendingPaymentsWarningMin === 0 && rules.payments.outstandingRevenueWarning === 0)
                                ? "disabled"
                                : (
                                    (rules.payments.pendingPaymentsCriticalMin > 0 && paymentPending >= rules.payments.pendingPaymentsCriticalMin) ||
                                    (rules.payments.outstandingRevenueCritical > 0 && outstandingRevenue >= rules.payments.outstandingRevenueCritical)
                                  )
                                  ? "critical"
                                  : (
                                        (rules.payments.pendingPaymentsWarningMin > 0 && paymentPending >= rules.payments.pendingPaymentsWarningMin) ||
                                        (rules.payments.outstandingRevenueWarning > 0 && outstandingRevenue >= rules.payments.outstandingRevenueWarning)
                                    )
                                    ? "warning"
                                    : "healthy",
                    },
                ],
                orders: [
                    {
                        id: "orders.backlog",
                        title: "ضغط طابور الطلبات",
                        description: "مؤشر مركب يراقب المراجعات، التنفيذ، والطلبات بانتظار الدفع.",
                        currentLabel: `قرار ${formatThresholdNumber(pendingReview)} / تنفيذ ${formatThresholdNumber(fulfillmentQueue)} / دفع ${formatThresholdNumber(paymentPending)}`,
                        thresholdLabel:
                            `تحذير: ${formatThresholdNumber(rules.orders.pendingReviewWarningMin)}/${formatThresholdNumber(rules.orders.fulfillmentQueueWarningMin)}/${formatThresholdNumber(rules.orders.paymentPendingWarningMin)}`,
                        state:
                            (rules.orders.pendingReviewWarningMin === 0 &&
                                rules.orders.fulfillmentQueueWarningMin === 0 &&
                                rules.orders.paymentPendingWarningMin === 0)
                                ? "disabled"
                                : (
                                    (rules.orders.pendingReviewCriticalMin > 0 && pendingReview >= rules.orders.pendingReviewCriticalMin) ||
                                    (rules.orders.fulfillmentQueueCriticalMin > 0 && fulfillmentQueue >= rules.orders.fulfillmentQueueCriticalMin) ||
                                    (rules.orders.paymentPendingCriticalMin > 0 && paymentPending >= rules.orders.paymentPendingCriticalMin)
                                  )
                                  ? "critical"
                                  : (
                                        (rules.orders.pendingReviewWarningMin > 0 && pendingReview >= rules.orders.pendingReviewWarningMin) ||
                                        (rules.orders.fulfillmentQueueWarningMin > 0 && fulfillmentQueue >= rules.orders.fulfillmentQueueWarningMin) ||
                                        (rules.orders.paymentPendingWarningMin > 0 && paymentPending >= rules.orders.paymentPendingWarningMin)
                                    )
                                    ? "warning"
                                    : "healthy",
                    },
                ],
            },
            recentChanges,
        };
    } catch (error) {
        return {
            defaults: DEFAULT_OPERATIONAL_RULES,
            metrics: {
                support: {
                    slaAtRisk: 0,
                    slaBreached: 0,
                },
                inventory: {
                    criticalStockouts: 0,
                    highPressureRestocks: 0,
                    lowStockTotal: 0,
                    fulfillmentQueue: 0,
                },
                payments: {
                    failedPayments: 0,
                    atRiskRevenue: 0,
                    pendingPayments: 0,
                    outstandingRevenue: 0,
                },
                orders: {
                    pendingReview: 0,
                    fulfillmentQueue: 0,
                    paymentPending: 0,
                },
            },
            sections: {
                support: [],
                inventory: [],
                payments: [],
                orders: [],
            },
            recentChanges: [],
        };
    }
}

// ─── أسعار القطع (للتصميم — بدون صلاحية أدمن) ───

export async function getCreationPrices() {
    const settings = await getSiteSettings();
    return {
        tshirt: settings.creation_prices?.tshirt ?? 89,
        hoodie: settings.creation_prices?.hoodie ?? 149,
        pullover: settings.creation_prices?.pullover ?? 129,
    };
}

export async function getWashaAiSettings() {
    const settings = await getSiteSettings();
    return normalizeWashaAiSettings(settings.washa_ai);
}

/** الحزم النشطة فقط — لعرضها للمستخدم في نافذة الشراء. فارغة إن كان نظام الرصيد معطّلاً. */
export async function getActiveWashaAiCreditPackages(): Promise<WashaAiCreditPackage[]> {
    const settings = await getWashaAiSettings();
    if (settings.controls?.credits_enabled === false) return [];
    return (settings.credit_packages ?? []).filter((pkg) => pkg.active !== false);
}

// ─── Public visibility (للصفحات العامة — بدون صلاحية أدمن) ───

export async function getPublicVisibility() {
    const settings = await getSiteSettings();
    return settings.visibility;
}

// ═══════════════════════════════════════════════════════════
//  UPDATE A SETTING
// ═══════════════════════════════════════════════════════════

export async function updateSiteSetting(key: string, value: Record<string, any>) {
    const { profileId } = await requireAdmin();
    const supabase = getAdminSupabase();
    const nextValue = key === "operational_rules"
        ? normalizeOperationalRules(value)
        : key === "washa_ai"
            ? normalizeWashaAiSettings(value)
            : value;

    let changedRuleKeys: string[] = [];

    if (key === "operational_rules") {
        const { data: currentSetting } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", "operational_rules")
            .maybeSingle();

        const previousRules = normalizeOperationalRules((currentSetting?.value as Record<string, unknown> | undefined) ?? null);
        changedRuleKeys = collectChangedRuleKeys(previousRules, nextValue as OperationalRulesConfig);
    }

    const { error } = await supabase
        .from("site_settings")
        .upsert(
            { key, value: nextValue, updated_at: new Date().toISOString() },
            { onConflict: "key" }
        );

    if (error) {
        return { success: false, error: error.message };
    }

    revalidateTag(SITE_SETTINGS_CACHE_TAG, "max");
    if (key === "visibility") {
        revalidateTag(PUBLIC_VISIBILITY_CACHE_TAG, "max");
    }

    if (key === "operational_rules" && changedRuleKeys.length > 0) {
        await supabase.from("system_logs").insert({
            type: "info",
            source: "settings.operational_rules.update",
            message: "تم تحديث قواعد التشغيل والتصعيد",
            metadata: {
                changed_keys: changedRuleKeys,
                operational_rules: nextValue,
            },
            user_id: profileId,
        });
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/");
    revalidatePath("/account");
    revalidatePath("/design");
    revalidatePath("/design/preorder");
    revalidatePath("/design/washa-ai");
    revalidatePath("/design/washa-ai/dev");
    revalidatePath("/design/washa-ai/dev-v2");
    revalidatePath("/studio");
    if (key === "operational_rules") {
        revalidatePath("/dashboard/analytics");
        revalidatePath("/dashboard/orders");
        revalidatePath("/dashboard/support");
        revalidatePath("/dashboard/products-inventory");
        revalidatePath("/dashboard/notifications");
    }
    return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  CATEGORIES CRUD
// ═══════════════════════════════════════════════════════════

export async function getCategories() {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });

    return { data: data || [], error: error?.message };
}

export async function createCategory(formData: {
    name_ar: string;
    name_en: string;
    slug: string;
    description?: string;
    icon?: string;
    sort_order?: number;
}) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { error } = await supabase.from("categories").insert(formData);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/categories");
    return { success: true };
}

export async function updateCategory(id: string, formData: Partial<{
    name_ar: string;
    name_en: string;
    slug: string;
    description: string;
    icon: string;
    sort_order: number;
}>) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { error } = await supabase
        .from("categories")
        .update(formData)
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/categories");
    return { success: true };
}

export async function deleteCategory(id: string) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/categories");
    return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  PRODUCTS MANAGEMENT
// ═══════════════════════════════════════════════════════════

export async function getAdminProducts(page = 1, type = "all") {
    await requireAdmin();
    const supabase = getAdminSupabase();
    const perPage = 20;

    let query = supabase
        .from("products")
        .select("*, artist:profiles!products_artist_id_fkey(id, display_name, username)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

    if (type !== "all") {
        query = query.eq("type", type);
    }

    const { data, count, error } = await query;

    return {
        data: data || [],
        count: count || 0,
        totalPages: Math.ceil((count || 0) / perPage),
    };
}

/**
 * Fetch sold count per product from order_items table.
 * Returns a map: { [product_id]: sold_count }
 */
export async function getProductSalesMap() {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
        .from("order_items")
        .select("product_id, quantity");

    if (error || !data) return {};

    const map: Record<string, number> = {};
    for (const item of data) {
        const pid = item.product_id as string;
        if (pid) map[pid] = (map[pid] || 0) + (item.quantity || 1);
    }
    return map;
}

export async function updateProduct(id: string, updates: Partial<{
    title: string;
    description: string | null;
    type: string;
    price: number;
    image_url: string;
    images: string[];
    artist_id: string;
    in_stock: boolean;
    is_featured: boolean;
    stock_quantity: number | null;
    sizes: string[] | null;
    badge: string | null;
    store_name: string | null;
}>) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const validTypes = ["print", "apparel", "digital", "nft", "original"];
    if (updates.type && !validTypes.includes(updates.type)) {
        return { success: false, error: "نوع المنتج غير صالح" };
    }

    const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/products-inventory");
    revalidatePath("/store");
    return { success: true };
}

function normalizeVariantSize(value?: string | null) {
    const token = value?.trim().replace(/\s+/g, " ");
    if (!token) return null;
    return /^[a-z0-9]+$/i.test(token) ? token.toUpperCase() : token;
}

function normalizeVariantColor(value?: string | null) {
    const token = value?.trim();
    if (!token) return null;
    return token.startsWith("#") ? token.toLowerCase() : `#${token.toLowerCase()}`;
}

function variantKey(size?: string | null, color?: string | null) {
    return `${normalizeVariantSize(size) || "∅"}::${normalizeVariantColor(color) || "∅"}`;
}

function normalizeVariantQuantityMap(input?: Record<string, number>) {
    const map = new Map<string, number>();
    Object.entries(input || {}).forEach(([key, value]) => {
        const quantity = Number(value);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            map.set(key, 0);
            return;
        }
        map.set(key, Math.floor(quantity));
    });
    return map;
}

async function getDefaultWarehouseId(supabase: ReturnType<typeof getAdminSupabase>) {
    const { data: activeWarehouse } = await supabase
        .from("warehouses")
        .select("id")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (activeWarehouse?.id) return activeWarehouse.id as string;

    const { data: fallbackWarehouse } = await supabase
        .from("warehouses")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    return (fallbackWarehouse?.id as string | undefined) || null;
}

async function addInitialVariantInventory({
    supabase,
    skuId,
    warehouseId,
    quantity,
    profileId,
    notes,
}: {
    supabase: ReturnType<typeof getAdminSupabase>;
    skuId: string;
    warehouseId: string | null;
    quantity: number;
    profileId?: string | null;
    notes: string;
}) {
    if (!warehouseId || quantity <= 0) return false;

    const { data: currentLevel } = await supabase
        .from("inventory_levels")
        .select("quantity")
        .eq("sku_id", skuId)
        .eq("warehouse_id", warehouseId)
        .maybeSingle();

    const previousQuantity = Number(currentLevel?.quantity) || 0;
    const nextQuantity = previousQuantity + quantity;

    await supabase
        .from("inventory_levels")
        .upsert({
            sku_id: skuId,
            warehouse_id: warehouseId,
            quantity: nextQuantity,
        }, { onConflict: "sku_id,warehouse_id" });

    await supabase.from("inventory_transactions").insert({
        sku_id: skuId,
        warehouse_id: warehouseId,
        transaction_type: "addition",
        quantity_change: quantity,
        previous_quantity: previousQuantity,
        new_quantity: nextQuantity,
        notes,
        created_by: profileId ?? null,
    });

    return true;
}

async function syncProductStockSnapshot(supabase: ReturnType<typeof getAdminSupabase>, productId: string) {
    const { data: skuRows, error } = await supabase
        .from("product_skus")
        .select("is_active, inventory_levels(quantity)")
        .eq("product_id", productId);

    if (error) return false;

    const total = (skuRows || [])
        .filter((sku: any) => sku.is_active !== false)
        .reduce((productSum: number, sku: any) => {
            return productSum + ((sku.inventory_levels || []) as any[]).reduce((skuSum, level) => {
                return skuSum + (Number(level.quantity) || 0);
            }, 0);
        }, 0);

    const { error: updateError } = await supabase
        .from("products")
        .update({ in_stock: total > 0, stock_quantity: total })
        .eq("id", productId);

    return !updateError;
}

export async function syncProductVariantSkus(input: {
    product_id: string;
    sizes?: string[];
    colors?: string[];
    colorImages?: Record<string, string | null>;
    variantQuantities?: Record<string, number>;
}) {
    const { profileId } = await requireAdmin();
    const supabase = getAdminSupabase();

    const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, type")
        .eq("id", input.product_id)
        .single();

    if (productError || !product) {
        return { success: false, error: productError?.message || "المنتج غير موجود" };
    }

    const sizes = Array.from(new Set((input.sizes || []).map(normalizeVariantSize).filter(Boolean) as string[]));
    const colors = Array.from(new Set((input.colors || []).map(normalizeVariantColor).filter(Boolean) as string[]));
    const colorImageEntries = Object.entries(input.colorImages || {}).map(([color, imageUrl]) => [
        normalizeVariantColor(color),
        typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null,
    ] as const);
    const colorImages = new Map(colorImageEntries.filter(([color]) => Boolean(color)) as Array<[string, string | null]>);
    const variantQuantities = normalizeVariantQuantityMap(input.variantQuantities);
    const warehouseId = variantQuantities.size > 0 ? await getDefaultWarehouseId(supabase) : null;
    const sizesToSync = sizes.length > 0 ? sizes : [null];
    const colorsToSync = colors.length > 0 ? colors : [null];
    const desiredVariants = sizesToSync.flatMap((size) => colorsToSync.map((color) => ({ size, color })));
    const desiredKeys = new Set(desiredVariants.map((variant) => variantKey(variant.size, variant.color)));

    const { data: existingRows, error: existingError } = await supabase
        .from("product_skus")
        .select("id, sku, size, color_code, is_active")
        .eq("product_id", input.product_id);

    if (existingError) return { success: false, error: existingError.message };

    const existing = existingRows || [];
    const existingByKey = new Map<string, any>();
    existing.forEach((row: any) => {
        const key = variantKey(row.size, row.color_code);
        if (!existingByKey.has(key)) existingByKey.set(key, row);
    });

    let createdCount = 0;
    let reactivatedCount = 0;
    let disabledCount = 0;

    for (const variant of desiredVariants) {
        const key = variantKey(variant.size, variant.color);
        const row = existingByKey.get(key);
        const imageUpdate = variant.color ? colorImages.get(normalizeVariantColor(variant.color) || "") : undefined;
        const quantityToAdd = variantQuantities.get(key) || 0;
        if (row) {
            const updates: Record<string, any> = {};
            if (row.is_active === false) {
                updates.size = variant.size;
                updates.color_code = variant.color;
                updates.is_active = true;
            }
            if (imageUpdate !== undefined) {
                updates.color_image_url = imageUpdate;
            }
            if (Object.keys(updates).length > 0) {
                const { error } = await supabase
                    .from("product_skus")
                    .update(updates)
                    .eq("id", row.id);
                if (error) return { success: false, error: error.message };
                if (updates.is_active) reactivatedCount++;
            }
            if (quantityToAdd > 0) {
                await addInitialVariantInventory({
                    supabase,
                    skuId: row.id,
                    warehouseId,
                    quantity: quantityToAdd,
                    profileId,
                    notes: row.is_active === false
                        ? "Initial stock for reactivated product variant"
                        : "Stock addition from Admin Product Form",
                });
            }
            continue;
        }

        const skuResult = await generateNextSKU(product.type, variant.size || undefined, variant.color?.replace(/^#/, ""));
        if ("error" in skuResult) return { success: false, error: skuResult.error };

        const insertRow: Record<string, any> = {
            product_id: input.product_id,
            sku: skuResult.sku,
            size: variant.size,
            color_code: variant.color,
            is_active: true,
        };
        if (imageUpdate !== undefined) insertRow.color_image_url = imageUpdate;

        const { data: newSku, error } = await supabase.from("product_skus").insert(insertRow).select("id").single();

        if (error) return { success: false, error: error.message };
        if (newSku?.id && quantityToAdd > 0) {
            await addInitialVariantInventory({
                supabase,
                skuId: newSku.id,
                warehouseId,
                quantity: quantityToAdd,
                profileId,
                notes: "Initial stock for new product variant",
            });
        }
        createdCount++;
    }

    for (const row of existing) {
        if (row.is_active === false) continue;
        if (desiredKeys.has(variantKey(row.size, row.color_code))) continue;

        const { error } = await supabase
            .from("product_skus")
            .update({ is_active: false })
            .eq("id", row.id);
        if (error) return { success: false, error: error.message };
        disabledCount++;
    }

    await syncProductStockSnapshot(supabase, input.product_id);

    revalidatePath("/dashboard/products-inventory");
    revalidatePath("/store");
    revalidatePath(`/products/${input.product_id}`);
    return { success: true, createdCount, reactivatedCount, disabledCount };
}

export async function deleteProduct(id: string) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/products-inventory");
    revalidatePath("/store");
    return { success: true };
}

export async function createProductAdmin(data: {
    artist_id: string;
    title: string;
    description?: string;
    type: string;
    price: number;
    image_url: string;
    images?: string[];
    sizes?: string[];
    colors?: string[];
    colorImages?: Record<string, string | null>;
    variantQuantities?: Record<string, number>;
    in_stock?: boolean;
    stock_quantity?: number;
    store_name?: string;
}) {
    const { profileId } = await requireAdmin();
    const supabase = getAdminSupabase();

    const validTypes = ["print", "apparel", "digital", "nft", "original"];
    if (!validTypes.includes(data.type)) {
        return { success: false, error: "نوع المنتج غير صالح" };
    }

    const sizesToCreate = data.sizes && data.sizes.length > 0 ? data.sizes.map(normalizeVariantSize).filter(Boolean) as string[] : [null];
    const colorsToCreate = data.colors && data.colors.length > 0 ? data.colors.map(normalizeVariantColor).filter(Boolean) as string[] : [null];
    const variantCount = Math.max(1, sizesToCreate.length * colorsToCreate.length);
    const variantQuantities = normalizeVariantQuantityMap(data.variantQuantities);
    const hasExplicitVariantQuantities = variantQuantities.size > 0;
    const explicitTotalQty = sizesToCreate.reduce((sizeSum, size) => {
        return sizeSum + colorsToCreate.reduce((colorSum, color) => colorSum + (variantQuantities.get(variantKey(size, color)) || 0), 0);
    }, 0);
    const fallbackTotalQty = data.stock_quantity != null ? data.stock_quantity : (data.in_stock ? 100 : 0);
    const productStockQuantity = hasExplicitVariantQuantities ? explicitTotalQty : fallbackTotalQty;

    const { data: created, error } = await supabase
        .from("products")
        .insert({
            artist_id: data.artist_id,
            title: data.title.trim(),
            description: data.description?.trim() || null,
            type: data.type,
            price: Number(data.price),
            image_url: data.image_url.trim(),
            images: data.images && data.images.length > 0 ? data.images : [],
            sizes: data.sizes && data.sizes.length > 0 ? data.sizes : null,
            in_stock: (data.in_stock ?? true) && productStockQuantity > 0,
            stock_quantity: productStockQuantity,
            store_name: data.store_name?.trim() || null,
            currency: "SAR",
        })
        .select("id")
        .single();

    if (error) return { success: false, error: error.message };

    const productId = created?.id;

    // ERP: Auto-generate SKUs & Initial Inventory
    if (productId) {
        const totalQty = productStockQuantity;
        const qtyPerSku = Math.floor(totalQty / variantCount);
        const remainder = totalQty % variantCount;

        const warehouseId = totalQty > 0 ? await getDefaultWarehouseId(supabase) : null;

        let variantIndex = 0;
        for (const size of sizesToCreate) {
            for (const color of colorsToCreate) {
                const colorForSku = color ? color.replace(/^#/, "") : undefined;
                const skuResult = await generateNextSKU(data.type, size || undefined, colorForSku);
                if ("error" in skuResult) {
                    console.error("[createProductAdmin] SKU generation failed:", skuResult.error);
                    continue;
                }
                const finalSku = skuResult.sku;
                const key = variantKey(size, color);
                const quantity = hasExplicitVariantQuantities
                    ? (variantQuantities.get(key) || 0)
                    : qtyPerSku + (variantIndex < remainder ? 1 : 0);
                variantIndex++;

                const colorImageUrl = color ? data.colorImages?.[normalizeVariantColor(color) || ""] : undefined;
                const skuInsert: Record<string, any> = {
                    product_id: productId,
                    sku: finalSku,
                    size: size ? size.trim() : null,
                    color_code: color ?? null,
                    is_active: true,
                };
                if (colorImageUrl !== undefined) skuInsert.color_image_url = colorImageUrl || null;

                const { data: newSku } = await supabase.from("product_skus").insert(skuInsert).select("id").single();

                if (newSku && quantity > 0) {
                    await addInitialVariantInventory({
                        supabase,
                        skuId: newSku.id,
                        warehouseId,
                        quantity,
                        profileId,
                        notes: "Initial stock creation from Admin Product Form",
                    });
                }
            }
        }
    }

    if (productId) {
        await syncProductStockSnapshot(supabase, productId);
    }

    revalidatePath("/dashboard/products-inventory");
    revalidatePath("/store");
    revalidatePath("/dashboard/erp/inventory");
    return { success: true, productId };
}

export async function getAdminArtistsForSelect() {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("role", ["wushsha", "admin"])
        .order("display_name");

    if (error) return [];
    return (data || []) as { id: string; display_name: string; username: string }[];
}

// ═══════════════════════════════════════════════════════════
//  PRODUCT IMAGE UPLOAD — Supabase Storage
// ═══════════════════════════════════════════════════════════

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadProductImage(formData: FormData): Promise<{ success: true; url: string } | { success: false; error: string }> {
    await requireAdmin();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
        return { success: false, error: "لم يتم اختيار ملف" };
    }
    if (file.size > MAX_FILE_SIZE) {
        return { success: false, error: "حجم الملف يجب أن لا يتجاوز 5 ميجابايت" };
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
        return { success: false, error: "نوع الملف غير مدعوم (PNG, JPG, WebP, GIF فقط)" };
    }

    const supabase = getAdminSupabase();
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
        .from("products")
        .upload(fileName, buffer, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
        });

    if (error) {
        console.error("[uploadProductImage]", error);
        return { success: false, error: error.message };
    }

    const { data: { publicUrl } } = supabase.storage.from("products").getPublicUrl(data.path);
    return { success: true, url: publicUrl };
}

// ═══════════════════════════════════════════════════════════
//  NEWSLETTER MANAGEMENT
// ═══════════════════════════════════════════════════════════

export async function getNewsletterSubscribers() {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("subscribed_at", { ascending: false });

    return { data: data || [], error: error?.message };
}

// ═══════════════════════════════════════════════════════════
//  EXCLUSIVE DESIGNS — تصاميم وشّى الحصرية
// ═══════════════════════════════════════════════════════════

export async function getExclusiveDesigns() {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
        return [];
    }
    try {
        const supabase = getAdminSupabase();
        const { data, error } = await supabase
            .from("exclusive_designs")
            .select("*")
            .order("sort_order", { ascending: true });

        if (error) {
            console.error("[getExclusiveDesigns]", error);
            return [];
        }
        return (data || []) as { id: string; title: string; description: string | null; image_url: string; sort_order: number; is_active: boolean }[];
    } catch (err) {
        console.error("[getExclusiveDesigns]", err);
        return [];
    }
}

export async function getActiveExclusiveDesigns() {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
        .from("exclusive_designs")
        .select("id, title, description, image_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    if (error) return [];
    return (data || []) as { id: string; title: string; description: string | null; image_url: string }[];
}

export async function createExclusiveDesign(formData: {
    title: string;
    description?: string;
    image_url: string;
    sort_order?: number;
}) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { data, error } = await supabase.from("exclusive_designs").insert({
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        image_url: formData.image_url.trim(),
        sort_order: formData.sort_order ?? 0,
        is_active: true,
    }).select("id, title, description, image_url, sort_order, is_active").single();

    if (error || !data) return { success: false, error: error?.message || "تعذر إنشاء التصميم" };
    revalidatePath("/dashboard/exclusive-designs");
    revalidatePath("/design");
    revalidatePath("/design/preorder");
    return { success: true, design: data };
}

export async function updateExclusiveDesign(id: string, formData: Partial<{
    title: string;
    description: string;
    image_url: string;
    sort_order: number;
    is_active: boolean;
}>) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
        .from("exclusive_designs")
        .update(formData)
        .eq("id", id)
        .select("id, title, description, image_url, sort_order, is_active")
        .single();

    if (error || !data) return { success: false, error: error?.message || "تعذر تحديث التصميم" };
    revalidatePath("/dashboard/exclusive-designs");
    revalidatePath("/design");
    revalidatePath("/design/preorder");
    return { success: true, design: data };
}

export async function deleteExclusiveDesign(id: string) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { error } = await supabase.from("exclusive_designs").delete().eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/exclusive-designs");
    revalidatePath("/design");
    revalidatePath("/design/preorder");
    return { success: true };
}

export async function uploadExclusiveDesignImage(formData: FormData): Promise<{ success: true; url: string } | { success: false; error: string }> {
    await requireAdmin();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
        return { success: false, error: "لم يتم اختيار ملف" };
    }
    if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: "حجم الملف يجب أن لا يتجاوز 5 ميجابايت" };
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        return { success: false, error: "نوع الملف غير مدعوم" };
    }

    const supabase = getAdminSupabase();
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `exclusive-designs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
        .from("products")
        .upload(fileName, buffer, { cacheControl: "3600", upsert: false, contentType: file.type });

    if (error) {
        console.error("[uploadExclusiveDesignImage]", error);
        return { success: false, error: error.message };
    }

    const { data: { publicUrl } } = supabase.storage.from("products").getPublicUrl(data.path);
    return { success: true, url: publicUrl };
}

export async function deleteSubscriber(id: string) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { error } = await supabase
        .from("newsletter_subscribers")
        .delete()
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/newsletter");
    return { success: true };
}
