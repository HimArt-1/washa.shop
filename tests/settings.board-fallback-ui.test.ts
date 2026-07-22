// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockUpdateSiteSetting } = vi.hoisted(() => ({
    mockUpdateSiteSetting: vi.fn(),
}));

vi.mock("@/app/actions/settings", () => ({
    updateSiteSetting: mockUpdateSiteSetting,
}));

import { BoardFallbackSettingsCard } from "@/app/(protected)/dashboard/settings/BoardFallbackSettingsCard";

function findButton(container: HTMLElement, label: string) {
    const button = [...container.querySelectorAll("button")]
        .find((candidate) => candidate.textContent?.includes(label));
    if (!button) throw new Error(`Button not found: ${label}`);
    return button as HTMLButtonElement;
}

describe("board fallback settings controls", () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(async () => {
        Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
        mockUpdateSiteSetting.mockReset();
        mockUpdateSiteSetting.mockResolvedValue({ success: true });
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
        await act(async () => {
            root.render(createElement(BoardFallbackSettingsCard, {
                initialGenerationMode: "primary",
                initialQuotaCharging: { auto: true, manual_override: null },
            }));
        });
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
    });

    it("starts from props and never saves while editing either draft", async () => {
        const modeSwitch = container.querySelector('[role="switch"][aria-label="وضع التوليد الاحتياطي"]') as HTMLButtonElement;
        const autoCheckbox = container.querySelector('input[aria-label="احتساب الحصة تلقائيًا"]') as HTMLInputElement;

        expect(modeSwitch.getAttribute("aria-checked")).toBe("false");
        expect(autoCheckbox.checked).toBe(true);
        expect(container.textContent).toContain("عند التفعيل، التوليد يتحول لمعاينة مبدئية، الطلبات تحتاج تركيب يدوي");
        expect(container.textContent).toContain("الأصل: لا تُحتسب في الوضع الاحتياطي");

        await act(async () => modeSwitch.click());
        await act(async () => autoCheckbox.click());

        expect(mockUpdateSiteSetting).not.toHaveBeenCalled();
        expect(container.textContent).toContain("احتساب الحصة: معطّل");
    });

    it("saves generation mode independently with the exact scalar value", async () => {
        const modeSwitch = container.querySelector('[role="switch"][aria-label="وضع التوليد الاحتياطي"]') as HTMLButtonElement;
        await act(async () => modeSwitch.click());
        await act(async () => findButton(container, "حفظ وضع التوليد").click());

        expect(mockUpdateSiteSetting).toHaveBeenCalledOnce();
        expect(mockUpdateSiteSetting).toHaveBeenCalledWith("generation_mode", "fallback");
    });

    it("turns an initial fallback draft off and saves primary explicitly", async () => {
        await act(async () => {
            root.render(createElement(BoardFallbackSettingsCard, {
                key: "initial-fallback",
                initialGenerationMode: "fallback",
                initialQuotaCharging: { auto: true, manual_override: null },
            }));
        });
        const modeSwitch = container.querySelector('[role="switch"][aria-label="وضع التوليد الاحتياطي"]') as HTMLButtonElement;
        expect(modeSwitch.getAttribute("aria-checked")).toBe("true");

        await act(async () => modeSwitch.click());
        await act(async () => findButton(container, "حفظ وضع التوليد").click());

        expect(mockUpdateSiteSetting).toHaveBeenCalledWith("generation_mode", "primary");
    });

    it("defaults manual charging to disabled in fallback and saves the exact quota shape", async () => {
        const modeSwitch = container.querySelector('[role="switch"][aria-label="وضع التوليد الاحتياطي"]') as HTMLButtonElement;
        await act(async () => modeSwitch.click());

        const autoCheckbox = container.querySelector('input[aria-label="احتساب الحصة تلقائيًا"]') as HTMLInputElement;
        await act(async () => autoCheckbox.click());
        expect(container.textContent).toContain("احتساب الحصة: معطّل");

        await act(async () => findButton(container, "حفظ سياسة الحصة").click());
        expect(mockUpdateSiteSetting).toHaveBeenLastCalledWith("quota_charging", {
            auto: false,
            manual_override: "disabled",
        });

        const manualSwitch = container.querySelector('[role="switch"][aria-label="احتساب الحصة يدويًا"]') as HTMLButtonElement;
        await act(async () => manualSwitch.click());
        await act(async () => findButton(container, "حفظ سياسة الحصة").click());
        expect(mockUpdateSiteSetting).toHaveBeenLastCalledWith("quota_charging", {
            auto: false,
            manual_override: "enabled",
        });
    });

    it("hides the manual override in auto mode and persists the normalized auto shape", async () => {
        expect(container.querySelector('[aria-label="احتساب الحصة يدويًا"]')).toBeNull();

        await act(async () => findButton(container, "حفظ سياسة الحصة").click());

        expect(mockUpdateSiteSetting).toHaveBeenCalledWith("quota_charging", {
            auto: true,
            manual_override: null,
        });
    });

    it("defaults manual charging to enabled when auto is disabled in primary mode", async () => {
        const autoCheckbox = container.querySelector('input[aria-label="احتساب الحصة تلقائيًا"]') as HTMLInputElement;
        await act(async () => autoCheckbox.click());

        expect(container.textContent).toContain("احتساب الحصة: مُفعّل");
        await act(async () => findButton(container, "حفظ سياسة الحصة").click());
        expect(mockUpdateSiteSetting).toHaveBeenCalledWith("quota_charging", {
            auto: false,
            manual_override: "enabled",
        });
    });

    it("reports action failure without claiming a successful save", async () => {
        mockUpdateSiteSetting.mockResolvedValue({ success: false, error: "فشل الحفظ" });

        await act(async () => findButton(container, "حفظ وضع التوليد").click());

        const alert = container.querySelector('[role="alert"]');
        expect(alert?.textContent).toContain("فشل الحفظ");
        expect(container.textContent).not.toContain("تم حفظ وضع التوليد");
    });
});
