import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchDtfStudioConfig } from "../../washa-dtf-studio/src/services/configService";

function jsonResponse(body: unknown) {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
}

describe("DTF production configuration", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("rejects a partially empty catalog instead of mixing in demo identifiers", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({
            garments: [],
            styles: [{ id: "real-style" }],
            techniques: [{ id: "real-technique" }],
            palettes: [{ id: "real-palette" }],
            positions: [{ id: "real-position" }],
        })));

        await expect(fetchDtfStudioConfig()).rejects.toThrow("خيارات التصميم الإنتاجية غير مكتملة حالياً.");
    });
});
