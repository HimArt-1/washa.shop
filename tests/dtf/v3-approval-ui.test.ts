import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const v3Source = readFileSync(
    "washa-dtf-studio/src/components/dev-v2/WashaDevStudioV2.tsx",
    "utf8",
);

const termsSource = readFileSync(
    "washa-dtf-studio/src/components/WashaDesignTermsModal.tsx",
    "utf8",
);

const contextSource = readFileSync(
    "washa-dtf-studio/src/context/DesignContext.tsx",
    "utf8",
);

describe("WASHA AI V3 approval experience", () => {
    it("requires terms acceptance and moves directly to the cart after success", () => {
        expect(v3Source).toContain("<WashaDesignTermsModal");
        expect(v3Source).toContain("submitOrder({ termsAccepted: true })");
        expect(v3Source).toContain("window.location.assign('/cart')");
    });

    it("keeps the transparent print asset out of the V3 result interface", () => {
        expect(v3Source).not.toContain("setResultAssetView('artwork')");
        expect(v3Source).not.toContain("تحميل أصل الطباعة PNG");
        expect(v3Source).not.toContain("أصل الطباعة الشفاف");
        expect(v3Source).toContain("generationResult.previewKind === 'mockup'");
        expect(v3Source).toContain("const displayImage = hasInternalOnlyArtwork ? previewImage");
        expect(contextSource).toContain("hidePromptNativeSourcePreview");
        expect(contextSource).toContain("setMockupImage(customerPreviewUrl)");
    });

    it("explains that approval saves the design request before opening the cart", () => {
        expect(termsSource).toContain("حفظ التصميم في طلبات التصميم");
        expect(termsSource).toContain("الانتقال مباشرة إلى السلة");
        expect(termsSource).toContain("أوافق على الشروط والأحكام");
    });

    it("does not redirect to an empty cart when browser storage fails", () => {
        expect(contextSource).toContain("لن ننقلك إلى سلة فارغة");
        expect(contextSource).not.toContain("Non-fatal — the user can still retry");
    });
});
