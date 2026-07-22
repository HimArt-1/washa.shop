import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    createWashaAiDevGenerationHeaders,
    createWashaAiDevGenerationMetaTags,
    WASHA_AI_DEV_SIGNATURE_META_NAME,
    WASHA_AI_DEV_SURFACE_META_NAME,
} from "@/lib/washa-ai-dev-access";
import { getWashaAiDevGenerationHeadersFromDocument } from "../../washa-dtf-studio/src/lib/devGenerationSurface";

function metaDocument(values: Record<string, string>) {
    return {
        querySelector(selector: string) {
            const match = selector.match(/^meta\[name="(.+)"\]$/);
            const value = match ? values[match[1]] : undefined;
            return value === undefined
                ? null
                : { getAttribute: (name: string) => name === "content" ? value : null };
        },
    };
}

describe("WASHA AI dev client generation identity", () => {
    beforeEach(() => {
        vi.stubEnv("WASHA_AI_DEV_SURFACE_SECRET", "test-dev-surface-secret");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it.each(["dev", "dev-v2", "dev-v3"] as const)(
        "carries the signed %s identity from server meta tags into request headers",
        (surface) => {
            const values = Object.fromEntries(
                createWashaAiDevGenerationMetaTags(surface).map((tag) => {
                    const match = tag.match(/name="([^"]+)" content="([^"]+)"/);
                    if (!match) throw new Error("Invalid generated meta tag");
                    return [match[1], match[2]];
                })
            );

            expect(getWashaAiDevGenerationHeadersFromDocument(metaDocument(values)))
                .toEqual(createWashaAiDevGenerationHeaders(surface));
        }
    );

    it("returns no privileged headers when either signed value is missing", () => {
        expect(getWashaAiDevGenerationHeadersFromDocument(metaDocument({}))).toEqual({});
        expect(getWashaAiDevGenerationHeadersFromDocument(metaDocument({
            [WASHA_AI_DEV_SURFACE_META_NAME]: "dev",
        }))).toEqual({});
        expect(getWashaAiDevGenerationHeadersFromDocument(metaDocument({
            [WASHA_AI_DEV_SIGNATURE_META_NAME]: "forged",
        }))).toEqual({});
    });
});
