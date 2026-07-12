import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DesignState } from "../../washa-dtf-studio/src/types";
import {
    buildWashaAiSignInUrl,
    buildWashaAiSignUpUrl,
    consumeWashaAiAuthDraft,
    saveWashaAiAuthDraft,
} from "../../washa-dtf-studio/src/lib/authFlow";

describe("WASHA AI guest authentication gate", () => {
    const storage = new Map<string, string>();

    beforeEach(() => {
        storage.clear();
        vi.stubGlobal("localStorage", {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
            removeItem: (key: string) => storage.delete(key),
        });
    });

    it("preserves the result route for sign in and account creation", () => {
        const returnPath = "/design/washa-ai/app?step=result";

        expect(buildWashaAiSignInUrl(returnPath)).toBe(
            "/sign-in?redirect_url=%2Fdesign%2Fwasha-ai%2Fapp%3Fstep%3Dresult"
        );
        expect(buildWashaAiSignUpUrl(returnPath)).toBe(
            "/sign-up?redirect_url=%2Fdesign%2Fwasha-ai%2Fapp%3Fstep%3Dresult"
        );
    });

    it("restores a generated guest result after authentication", () => {
        const state = {
            prompt: "نخلة عربية هندسية",
            calligraphyText: "",
            customPalette: "",
            referenceImage: null,
            referenceImageMimeType: null,
            removeBackground: true,
            avoidHardEdges: true,
        } as DesignState;
        const mockupImage = "data:image/png;base64,iVBORw0KGgoAAA";

        expect(saveWashaAiAuthDraft(state, "submit", mockupImage)).toMatchObject({
            saved: true,
            resultOmitted: false,
        });
        expect(consumeWashaAiAuthDraft()).toMatchObject({
            intent: "submit",
            mockupImage,
            resultOmitted: false,
        });
    });

    it("falls back to saved choices when the generated image exceeds storage", () => {
        const state = {
            prompt: "صقر عربي هندسي",
            calligraphyText: "",
            customPalette: "",
            referenceImage: null,
            referenceImageMimeType: null,
        } as DesignState;
        const mockupImage = "data:image/png;base64,VERY_LARGE_RESULT";
        vi.stubGlobal("localStorage", {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => {
                if (value.includes("VERY_LARGE_RESULT")) throw new Error("quota exceeded");
                storage.set(key, value);
            },
            removeItem: (key: string) => storage.delete(key),
        });

        expect(saveWashaAiAuthDraft(state, "submit", mockupImage)).toMatchObject({
            saved: true,
            resultOmitted: true,
        });
        expect(consumeWashaAiAuthDraft()).toMatchObject({
            mockupImage: null,
            resultOmitted: true,
        });
    });

    it("reports failure when no authentication draft can be stored", () => {
        vi.stubGlobal("localStorage", {
            getItem: () => null,
            setItem: () => { throw new Error("storage unavailable"); },
            removeItem: () => undefined,
        });

        expect(saveWashaAiAuthDraft({
            prompt: "زخرفة عربية",
            calligraphyText: "",
            customPalette: "",
            referenceImage: null,
            referenceImageMimeType: null,
        } as DesignState, "submit", "data:image/png;base64,RESULT")).toMatchObject({
            saved: false,
        });
    });
});
