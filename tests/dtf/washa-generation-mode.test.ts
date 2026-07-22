import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateClient } = vi.hoisted(() => ({
    mockCreateClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
    createClient: mockCreateClient,
}));

import {
    getBoardPromptTemplate,
    getGenerationMode,
    getQuotaChargingConfig,
    shouldChargeQuota,
} from "@/lib/washa-generation-mode";
import {
    DEFAULT_BOARD_PROMPT_TEMPLATE,
    REQUIRED_BOARD_PROMPT_PLACEHOLDERS,
} from "@/lib/washa-board-prompt";

function mockSettingLookup(result: unknown, error: unknown = null, rejection?: unknown) {
    const maybeSingle = rejection === undefined
        ? vi.fn().mockResolvedValue({
            data: result === undefined ? null : { value: result },
            error,
        })
        : vi.fn().mockRejectedValue(rejection);
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    mockCreateClient.mockReturnValue({ from });
    return { maybeSingle, eq, select, from };
}

describe("WASHA generation mode", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("keeps primary mode when the settings database is unavailable", async () => {
        await expect(getGenerationMode()).resolves.toBe("primary");
        expect(mockCreateClient).not.toHaveBeenCalled();
    });

    it("reads fallback mode directly from its site setting", async () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
        const { maybeSingle, eq, select, from } = mockSettingLookup("fallback");

        await expect(getGenerationMode()).resolves.toBe("fallback");
        expect(from).toHaveBeenCalledWith("site_settings");
        expect(select).toHaveBeenCalledWith("value");
        expect(eq).toHaveBeenCalledWith("key", "generation_mode");
        expect(maybeSingle).toHaveBeenCalledTimes(1);
    });

    it("reads a complete board prompt template without cache", async () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
        const customTemplate = REQUIRED_BOARD_PROMPT_PLACEHOLDERS.join(" | ");
        const { eq, maybeSingle } = mockSettingLookup(customTemplate);

        await expect(getBoardPromptTemplate()).resolves.toBe(customTemplate);
        await expect(getBoardPromptTemplate()).resolves.toBe(customTemplate);

        expect(eq).toHaveBeenCalledWith("key", "board_prompt_template");
        expect(maybeSingle).toHaveBeenCalledTimes(2);
        expect(mockCreateClient).toHaveBeenCalledTimes(2);
    });

    it("uses the approved board template when its operational read is unavailable or invalid", async () => {
        await expect(getBoardPromptTemplate()).resolves.toBe(DEFAULT_BOARD_PROMPT_TEMPLATE);

        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
        mockSettingLookup("template missing controls");
        await expect(getBoardPromptTemplate()).resolves.toBe(DEFAULT_BOARD_PROMPT_TEMPLATE);

        mockSettingLookup(undefined, { message: "read failed" });
        await expect(getBoardPromptTemplate()).resolves.toBe(DEFAULT_BOARD_PROMPT_TEMPLATE);
    });

    it("returns primary when the Supabase client constructor throws", async () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-valid-url";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
        mockCreateClient.mockImplementation(() => {
            throw new Error("invalid Supabase URL");
        });

        await expect(getGenerationMode()).resolves.toBe("primary");
    });

    it("aborts a hung uncached lookup and returns primary", async () => {
        vi.useFakeTimers();
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";

        const hangingFetch = vi.fn((
            _input: Parameters<typeof fetch>[0],
            init?: Parameters<typeof fetch>[1]
        ) => new Promise<Response>((_resolve, reject) => {
            if (!init?.signal) {
                reject(new Error("missing abort signal"));
                return;
            }
            init.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }));
        vi.stubGlobal("fetch", hangingFetch);

        type SupabaseClientOptions = {
            global: { fetch: typeof fetch };
        };
        mockCreateClient.mockImplementation((
            _url: string,
            _key: string,
            options: SupabaseClientOptions
        ) => {
            const maybeSingle = vi.fn(() => options.global.fetch("https://example.supabase.co/rest/v1/site_settings"));
            const eq = vi.fn(() => ({ maybeSingle }));
            const select = vi.fn(() => ({ eq }));
            return { from: vi.fn(() => ({ select })) };
        });

        const decision = getGenerationMode();
        await vi.advanceTimersByTimeAsync(2_000);

        await expect(decision).resolves.toBe("primary");
        expect(hangingFetch).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) })
        );
    });

    it("uses automatic quota charging when the settings database is unavailable", async () => {
        await expect(getQuotaChargingConfig()).resolves.toEqual({
            auto: true,
            manual_override: null,
        });
    });

    it("reads a complete manual quota policy directly from its site setting", async () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
        const { eq } = mockSettingLookup({
            auto: false,
            manual_override: "enabled",
        });

        await expect(getQuotaChargingConfig()).resolves.toEqual({
            auto: false,
            manual_override: "enabled",
        });
        expect(eq).toHaveBeenCalledWith("key", "quota_charging");
    });

    it("charges primary generation under the automatic fail-safe policy", async () => {
        await expect(shouldChargeQuota("primary")).resolves.toBe(true);
    });

    it("does not charge fallback generation under the automatic policy", async () => {
        await expect(shouldChargeQuota("fallback")).resolves.toBe(false);
    });

    it.each([
        ["primary", "enabled", true],
        ["fallback", "enabled", true],
        ["primary", "disabled", false],
        ["fallback", "disabled", false],
    ] as const)(
        "applies the manual quota override for %s mode when it is %s",
        async (mode, manualOverride, expected) => {
            process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
            process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
            mockSettingLookup({
                auto: false,
                manual_override: manualOverride,
            });

            await expect(shouldChargeQuota(mode)).resolves.toBe(expected);
        }
    );

    it.each(["primary", "fallback"] as const)(
        "falls back by mode for invalid or incomplete manual quota policies in %s mode",
        async (mode) => {
            process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
            process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
            for (const invalidPolicy of [
                { auto: false, manual_override: "invalid" },
                { auto: false },
                { manual_override: "enabled" },
            ]) {
                mockSettingLookup(invalidPolicy);
                await expect(shouldChargeQuota(mode)).resolves.toBe(mode === "primary");
            }
        }
    );

    it.each(["primary", "fallback"] as const)(
        "falls back by mode when the quota lookup fails in %s mode",
        async (mode) => {
            process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
            process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
            mockSettingLookup(undefined, null, new Error("database unavailable"));

            await expect(shouldChargeQuota(mode)).resolves.toBe(mode === "primary");
        }
    );

    it("uses a fresh settings lookup for every mode decision", async () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
        const { maybeSingle } = mockSettingLookup("fallback");

        await expect(getGenerationMode()).resolves.toBe("fallback");
        await expect(getGenerationMode()).resolves.toBe("fallback");

        expect(maybeSingle).toHaveBeenCalledTimes(2);
        expect(mockCreateClient).toHaveBeenCalledTimes(2);
    });

    it("returns primary for missing, invalid, or errored mode rows", async () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";

        mockSettingLookup(undefined);
        await expect(getGenerationMode()).resolves.toBe("primary");

        mockSettingLookup("unexpected");
        await expect(getGenerationMode()).resolves.toBe("primary");

        mockSettingLookup(undefined, { message: "read failed" });
        await expect(getGenerationMode()).resolves.toBe("primary");
    });
});
