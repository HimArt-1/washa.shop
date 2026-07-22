import "server-only";

import { createClient } from "@supabase/supabase-js";
import { createTimeoutFetch, readPositiveIntegerEnv } from "@/lib/async-timeout";
import type { Database } from "@/types/database";
import {
    normalizeBoardPromptTemplate,
    type BoardPromptTemplate,
} from "@/lib/washa-board-prompt";

export type GenerationMode = "primary" | "fallback";
export type QuotaManualOverride = "enabled" | "disabled" | null;

export interface QuotaChargingConfig {
    /** When true, charging follows the active generation mode. */
    auto: boolean;
    /** Explicit charging state used only when auto is false. */
    manual_override: QuotaManualOverride;
}

export const DEFAULT_GENERATION_MODE: GenerationMode = "primary";
export const DEFAULT_QUOTA_CHARGING_CONFIG: Readonly<QuotaChargingConfig> = {
    auto: true,
    manual_override: null,
};

const GENERATION_SETTINGS_FETCH_TIMEOUT_MS = readPositiveIntegerEnv(
    "GENERATION_SETTINGS_FETCH_TIMEOUT_MS",
    1_200,
    500,
    10_000
);

function createUncachedTimeoutFetch(): typeof fetch {
    const timeoutFetch = createTimeoutFetch(GENERATION_SETTINGS_FETCH_TIMEOUT_MS);
    return (input, init) => timeoutFetch(input, { ...init, cache: "no-store" });
}

function getAdminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return null;

    return createClient<Database>(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
            fetch: createUncachedTimeoutFetch(),
        },
    });
}

async function readSiteSettingValue(
    key: "generation_mode" | "board_prompt_template" | "quota_charging"
): Promise<unknown> {
    try {
        const supabase = getAdminSupabase();
        if (!supabase) return undefined;

        const { data, error } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", key)
            .maybeSingle();

        return error ? undefined : data?.value;
    } catch {
        return undefined;
    }
}

export function normalizeGenerationMode(value: unknown): GenerationMode {
    return value === "fallback" ? "fallback" : DEFAULT_GENERATION_MODE;
}

export function normalizeQuotaChargingConfig(value: unknown): QuotaChargingConfig {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { ...DEFAULT_QUOTA_CHARGING_CONFIG };
    }

    const config = value as Record<string, unknown>;
    if (config.auto === true) {
        return { auto: true, manual_override: null };
    }
    if (
        config.auto === false
        && (config.manual_override === "enabled" || config.manual_override === "disabled")
    ) {
        return {
            auto: false,
            manual_override: config.manual_override,
        };
    }
    return { ...DEFAULT_QUOTA_CHARGING_CONFIG };
}

export async function getGenerationMode(): Promise<GenerationMode> {
    return normalizeGenerationMode(await readSiteSettingValue("generation_mode"));
}

export async function getBoardPromptTemplate(): Promise<BoardPromptTemplate> {
    return normalizeBoardPromptTemplate(
        await readSiteSettingValue("board_prompt_template")
    );
}

export async function getQuotaChargingConfig(): Promise<QuotaChargingConfig> {
    return normalizeQuotaChargingConfig(await readSiteSettingValue("quota_charging"));
}

export async function shouldChargeQuota(mode: GenerationMode): Promise<boolean> {
    const config = await getQuotaChargingConfig();
    if (config.auto) return mode === "primary";
    return config.manual_override === "enabled";
}
