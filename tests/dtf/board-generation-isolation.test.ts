import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SERVICE_PATH = path.join(
    process.cwd(),
    "src/app/api/washa-dtf-studio/services/board-generation.service.ts"
);
const PROVIDER_ADAPTER_PATH = path.join(
    process.cwd(),
    "src/app/api/washa-dtf-studio/services/board-image-provider.adapter.ts"
);
const PROMPT_PATH = path.join(process.cwd(), "src/lib/washa-board-prompt.ts");

const serviceSource = readFileSync(SERVICE_PATH, "utf8");
const providerAdapterSource = readFileSync(PROVIDER_ADAPTER_PATH, "utf8");
const promptSource = readFileSync(PROMPT_PATH, "utf8");
const b1Source = [serviceSource, providerAdapterSource, promptSource].join("\n");

describe("board generation isolation contract", () => {
    it("keeps every primary artwork service and asset table outside B1", () => {
        for (const forbiddenReference of [
            "DesignAssetService",
            "generateIsolatedArtwork",
            "washDtfRoutedGenerateMockup",
            "persistMasterAsset",
            "normalizeGeneratedArtworkForPrint",
            "verifyArtworkTextPolicy",
            "buildPlacementTransform",
            "washa_design_requests",
            "washa_design_master_assets",
            "washa_design_asset_derivatives",
        ]) {
            expect(b1Source).not.toContain(forbiddenReference);
        }
        expect(b1Source).not.toMatch(/from\s+["']@\/lib\/washa-artwork(?:\/|["'])/);
        expect(b1Source).not.toMatch(/from\s+["'][^"']*design-asset\.service["']/);
        expect(b1Source).not.toMatch(/from\s+["'][^"']*storage\.service["']/);
    });

    it("resolves provider configuration directly in the board service only", () => {
        expect(serviceSource).toMatch(
            /import\s*\{\s*resolveWashaDtfProviderConfiguration\s*\}\s*from\s*["']@\/lib\/washa-dtf-provider-config["']/
        );
        expect(serviceSource.match(/\bresolveWashaDtfProviderConfiguration\s*\(/g))
            .toHaveLength(1);
        expect(providerAdapterSource).not.toMatch(
            /\bresolveWashaDtfProviderConfiguration\s*\(/
        );
        expect(providerAdapterSource).not.toContain("washa-dtf-image-router");
    });

    it("contains no quota, primary-route, or type-suppression escape hatch", () => {
        for (const forbiddenReference of [
            "shouldChargeQuota",
            "reserveDailyQuota",
            "releaseDailyQuota",
            "claimDtfGenerationRequest",
            "@ts-ignore",
            "@ts-expect-error",
        ]) {
            expect(b1Source).not.toContain(forbiddenReference);
        }
        expect(b1Source).not.toMatch(/\bas\s+any\b/);
        expect(b1Source).not.toMatch(/:\s*any\b/);
    });
});
