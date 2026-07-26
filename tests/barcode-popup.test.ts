import { describe, expect, it, vi } from "vitest";

import { renderAndPrintBarcodeLabels } from "@/lib/barcode-popup";

describe("barcode popup printing", () => {
    it("loads JsBarcode as an allowed external script before rendering and printing", async () => {
        const svg = {};
        const label = {
            getAttribute: vi.fn(() => "UNIT-001"),
            querySelector: vi.fn(() => svg),
        };
        const appendedScript: {
            async?: boolean;
            onerror?: () => void;
            onload?: () => void;
            src?: string;
        } = {};
        const barcode = vi.fn();
        const focus = vi.fn();
        const print = vi.fn();
        const popupWindow = {
            JsBarcode: barcode,
            document: {
                createElement: vi.fn(() => appendedScript),
                head: {
                    appendChild: vi.fn(),
                },
                querySelectorAll: vi.fn(() => [label]),
            },
            focus,
            print,
            setTimeout: vi.fn((callback: () => void) => {
                callback();
                return 1;
            }),
        };

        const printing = renderAndPrintBarcodeLabels(popupWindow as never);

        expect(appendedScript.src).toBe(
            "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"
        );
        expect(popupWindow.document.head.appendChild).toHaveBeenCalledWith(appendedScript);

        appendedScript.onload?.();
        await printing;

        expect(barcode).toHaveBeenCalledWith(svg, "UNIT-001", {
            displayValue: true,
            fontSize: 10,
            format: "CODE128",
            height: 25,
            width: 1.2,
        });
        expect(focus).toHaveBeenCalledOnce();
        expect(print).toHaveBeenCalledOnce();
    });
});
