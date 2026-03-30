"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { generateNextSKU } from "@/lib/product-identifiers";
import { getCurrentUserOrDevAdmin } from "@/lib/admin-access";
import {
    DEFAULT_OPERATIONAL_RULES,
    getOperationalRules,
    normalizeOperationalRules,
    type OperationalRulesConfig,
} from "@/lib/operational-rules";
import { getInventoryWithSales } from "@/app/actions/erp/inventory";

// ─── Admin Supabase Client ──────────────────────────────────

function getAdminSupabase() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured — admin operations require the service role key.");
    }
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey,
        { auth: { persistSession: false } }
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
    if (profile?.role !== "admin") throw new Error("Forbidden");
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
        design_piece?: boolean;
        design_piece_ai_switch?: boolean;
        design_piece_dtf_studio_switch?: boolean;
        design_piece_generation_public?: boolean;
    };
    site_info: Record<string, string>;
    shipping: Record<string, number>;
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
        store: false,
        signup: false,
        join: true,
        join_artist: true,
        ai_section: true,
        hero_auth_buttons: true,
        design_piece: true,
        design_piece_ai_switch: true,
        design_piece_dtf_studio_switch: true,
        design_piece_generation_public: false,
    },
    site_info: { name: "وشّى", description: "منصة الفن العربي الأصيل", email: "", phone: "", instagram: "", twitter: "", tiktok: "" },
    shipping: { flat_rate: 30, free_above: 500, tax_rate: 15 },
    creation_prices: { tshirt: 89, hoodie: 149, pullover: 129 },
    product_identifiers: {
        prefix: "WSH",
        product_code_template: "{PREFIX}-{SEQ:5}",
        sku_template: "{PREFIX}-{TYPE}-{SEQ:5}-{SIZE}-{COLOR}",
        type_map: {},
    },
    ai_simulation: {
        step1_image: "/images/design/heavy-tshirt-black-front.png",
        step1_color_name: "أسود كلاسيك",
        step1_pattern: "بدون نمط",
        step2_prompt: "صمم لي ذئب بستايل سايبربانك مع ألوان نيون وخلفية مظلمة...",
        step2_art_style: "رسم رقمي (Digital Art)",
        step2_result_image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80",
        step3_final_image: "",
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

// ═══════════════════════════════════════════════════════════
//  GET ALL SETTINGS
// ═══════════════════════════════════════════════════════════

export async function getSiteSettings() {
    // Check if Supabase is configured before attempting to use it
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return DEFAULT_SITE_SETTINGS;
    }
    
    try {
        const supabase = getAdminSupabase();
        const { data, error } = await supabase
            .from("site_settings")
            .select("key, value");

        if (error || !data) {
            return DEFAULT_SITE_SETTINGS;
        }

        const settings: Record<string, any> = {};
        for (const row of data) {
        settings[row.key] = row.value;
        }

        const v = settings.visibility || {};
        const cp = settings.creation_prices || {};
        const pi = settings.product_identifiers || {};
        const aiSim = settings.ai_simulation || {};

        return {
            visibility: {
                gallery: v.gallery ?? DEFAULT_SITE_SETTINGS.visibility.gallery,
                store: v.store ?? DEFAULT_SITE_SETTINGS.visibility.store,
                signup: v.signup ?? DEFAULT_SITE_SETTINGS.visibility.signup,
                join: v.join ?? DEFAULT_SITE_SETTINGS.visibility.join,
                join_artist: v.join_artist ?? DEFAULT_SITE_SETTINGS.visibility.join_artist,
                ai_section: v.ai_section ?? DEFAULT_SITE_SETTINGS.visibility.ai_section,
                hero_auth_buttons: v.hero_auth_buttons ?? DEFAULT_SITE_SETTINGS.visibility.hero_auth_buttons,
                design_piece: v.design_piece ?? DEFAULT_SITE_SETTINGS.visibility.design_piece,
                design_piece_ai_switch: v.design_piece_ai_switch ?? DEFAULT_SITE_SETTINGS.visibility.design_piece_ai_switch,
                design_piece_dtf_studio_switch: v.design_piece_dtf_studio_switch ?? DEFAULT_SITE_SETTINGS.visibility.design_piece_dtf_studio_switch,
                design_piece_generation_public: v.design_piece_generation_public ?? DEFAULT_SITE_SETTINGS.visibility.design_piece_generation_public,
            },
            site_info: settings.site_info || DEFAULT_SITE_SETTINGS.site_info,
            shipping: settings.shipping || DEFAULT_SITE_SETTINGS.shipping,
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
    } catch (error) {
        console.warn("getSiteSettings: Supabase not configured, returning defaults");
        return DEFAULT_SITE_SETTINGS;
    }
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
                .select("id, message, metadata, created_at, user:profiles(display_name, username)")
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
    // Check if Supabase is configured before attempting to use it
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return {
            tshirt: 89,
            hoodie: 149,
            pullover: 129,
        };
    }
    
    try {
        const supabase = getAdminSupabase();
        const { data } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", "creation_prices")
            .maybeSingle();

        const p = (data as { value?: Record<string, number> } | null)?.value;
        return {
            tshirt: p?.tshirt ?? 89,
            hoodie: p?.hoodie ?? 149,
            pullover: p?.pullover ?? 129,
        };
    } catch (error) {
        // Return defaults if Supabase is not configured
        return {
            tshirt: 89,
            hoodie: 149,
            pullover: 129,
        };
    }
}

// ─── Public visibility (للصفحات العامة — بدون صلاحية أدمن) ───

export async function getPublicVisibility() {
    // Check if Supabase is configured before attempting to use it
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return {
            gallery: false,
            store: false,
            signup: false,
            join: true,
            join_artist: true,
            ai_section: true,
            hero_auth_buttons: true,
            design_piece: true,
            design_piece_ai_switch: true,
            design_piece_dtf_studio_switch: true,
            design_piece_generation_public: false,
        };
    }
    
    try {
        const supabase = getAdminSupabase();
        const { data } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", "visibility")
            .maybeSingle();

        const visibility = (data as { value?: Record<string, boolean> } | null)?.value;
        return {
            gallery: visibility?.gallery ?? false,
            store: visibility?.store ?? false,
            signup: visibility?.signup ?? false,
            join: visibility?.join ?? true,
            join_artist: visibility?.join_artist ?? true,
            ai_section: visibility?.ai_section ?? true,
            hero_auth_buttons: visibility?.hero_auth_buttons ?? true,
            design_piece: visibility?.design_piece ?? true,
            design_piece_ai_switch: visibility?.design_piece_ai_switch ?? true,
            design_piece_dtf_studio_switch: visibility?.design_piece_dtf_studio_switch ?? true,
            design_piece_generation_public: visibility?.design_piece_generation_public ?? false,
        };
    } catch (error) {
        // Return defaults if Supabase is not configured
        return {
            gallery: false,
            store: false,
            signup: false,
            join: true,
            join_artist: true,
            ai_section: true,
            hero_auth_buttons: true,
            design_piece: true,
            design_piece_ai_switch: true,
            design_piece_dtf_studio_switch: true,
            design_piece_generation_public: false,
        };
    }
}

// ═══════════════════════════════════════════════════════════
//  UPDATE A SETTING
// ═══════════════════════════════════════════════════════════

export async function updateSiteSetting(key: string, value: Record<string, any>) {
    const { profileId } = await requireAdmin();
    const supabase = getAdminSupabase();
    const nextValue = key === "operational_rules" ? normalizeOperationalRules(value) : value;

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
    revalidatePath("/design/ai");
    revalidatePath("/design/dtf-studio");
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
        .select("*, artist:profiles!artist_id(id, display_name, username)", { count: "exact" })
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
    artist_id: string;
    in_stock: boolean;
    is_featured: boolean;
    stock_quantity: number | null;
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
    sizes?: string[];
    in_stock?: boolean;
    stock_quantity?: number;
    store_name?: string;
}) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const validTypes = ["print", "apparel", "digital", "nft", "original"];
    if (!validTypes.includes(data.type)) {
        return { success: false, error: "نوع المنتج غير صالح" };
    }

    const { data: created, error } = await supabase
        .from("products")
        .insert({
            artist_id: data.artist_id,
            title: data.title.trim(),
            description: data.description?.trim() || null,
            type: data.type,
            price: Number(data.price),
            image_url: data.image_url.trim(),
            sizes: data.sizes && data.sizes.length > 0 ? data.sizes : null,
            in_stock: data.in_stock ?? true,
            stock_quantity: data.stock_quantity ?? null,
            store_name: data.store_name?.trim() || null,
            currency: "SAR",
        })
        .select("id")
        .single();

    if (error) return { success: false, error: error.message };

    const productId = created?.id;

    // ERP: Auto-generate SKUs & Initial Inventory
    if (productId) {
        const sizesToCreate = data.sizes && data.sizes.length > 0 ? data.sizes : [null];
        const totalQty = data.stock_quantity != null ? data.stock_quantity : (data.in_stock ? 100 : 0);
        const qtyPerSku = Math.floor(totalQty / sizesToCreate.length);

        let warehouseId = null;
        const { data: wh } = await supabase.from("warehouses").select("id").limit(1).single();
        if (wh) warehouseId = wh.id;

        for (const size of sizesToCreate) {
            const skuResult = await generateNextSKU(data.type, size || undefined, undefined);
            if ("error" in skuResult) {
                console.error("[createProductAdmin] SKU generation failed:", skuResult.error);
                continue;
            }
            const finalSku = skuResult.sku;

            const { data: newSku } = await supabase.from("product_skus").insert({
                product_id: productId,
                sku: finalSku,
                size: size ? size.trim() : null,
            }).select("id").single();

            if (newSku && warehouseId && qtyPerSku > 0) {
                await supabase.from("inventory_levels").insert({
                    sku_id: newSku.id,
                    warehouse_id: warehouseId,
                    quantity: qtyPerSku
                });
                await supabase.from("inventory_transactions").insert({
                    sku_id: newSku.id,
                    warehouse_id: warehouseId,
                    transaction_type: 'addition',
                    quantity_change: qtyPerSku,
                    previous_quantity: 0,
                    new_quantity: qtyPerSku,
                    notes: 'Initial stock creation from Admin Product Form'
                });
            }
        }
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
    return { success: true, design: data };
}

export async function deleteExclusiveDesign(id: string) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { error } = await supabase.from("exclusive_designs").delete().eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/exclusive-designs");
    revalidatePath("/design");
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
