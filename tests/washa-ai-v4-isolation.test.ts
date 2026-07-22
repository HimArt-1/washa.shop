import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("WASHA AI v4 architectural isolation", () => {
    it("boots from its own Vite entry without the legacy DesignContext", () => {
        const entry = readFileSync(path.join(root, "washa-dtf-studio/src/main-v4.tsx"), "utf8");

        expect(entry).toContain("WashaAiV4");
        expect(entry).not.toContain("DesignProvider");
        expect(entry).not.toContain("CreditsProvider");
        expect(entry).not.toContain("./App");
    });

    it("uses a direct board API with no extraction, background removal, or recomposition", () => {
        const route = readFileSync(path.join(root, "src/app/api/washa-ai-v4/generate/route.ts"), "utf8");
        const client = readFileSync(path.join(root, "washa-dtf-studio/src/components/v4/WashaAiV4.tsx"), "utf8");
        const providerAdapter = readFileSync(path.join(
            root,
            "src/app/api/washa-dtf-studio/services/board-image-provider.adapter.ts"
        ), "utf8");
        const combined = `${route}\n${client}`;

        expect(route).toContain("generateBoardProviderImage");
        expect(route).toContain("genAiApiKey: resolveWashaAiV4ApiKey()");
        expect(providerAdapter).toContain("getWashaDtfGenAiClient(input.genAiApiKey)");
        expect(combined).not.toContain("removeBackground");
        expect(combined).not.toContain("extract-design");
        expect(combined).not.toContain("recompose-preview");
        expect(combined).not.toContain("generate-mockup");
        expect(client).toContain("ONE IMAGE");
        expect(client).not.toContain("4 SECTIONS");
        expect(client).toContain("الهيرو يسارًا والتفاصيل يمينًا");
        expect(client).not.toContain('<option value="right">يمين</option>');
        expect(client).toContain("previewGarmentColor");
        expect(client).toContain("previewBackgroundColor");
        expect(client).toContain("[0-9a-f]{3}|[0-9a-f]{6}");
    });

    it("does not cache an access-controlled shell beyond the admin switch", () => {
        const route = readFileSync(path.join(
            root,
            "src/app/(immersive)/design/washa-ai/dev-v4/[[...path]]/route.ts"
        ), "utf8");

        expect(route).toContain("ensureWashaAiV4PageAccess");
        expect(route).toContain('"Cache-Control": "no-store"');
        expect(route).not.toContain("serviceWorker");
        expect(route).not.toContain("caches.open");
    });
});
