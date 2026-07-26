const JS_BARCODE_URL =
    "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js";

type JsBarcodeRenderer = (
    target: SVGSVGElement,
    value: string,
    options: {
        displayValue: boolean;
        fontSize: number;
        format: string;
        height: number;
        width: number;
    }
) => void;

type BarcodePopupWindow = Window & {
    JsBarcode?: JsBarcodeRenderer;
};

export function renderAndPrintBarcodeLabels(win: BarcodePopupWindow) {
    return new Promise<void>((resolve, reject) => {
        const script = win.document.createElement("script");
        script.src = JS_BARCODE_URL;
        script.async = true;
        script.onerror = () => reject(new Error("Unable to load JsBarcode."));
        script.onload = () => {
            const renderBarcode = win.JsBarcode;
            if (!renderBarcode) {
                reject(new Error("JsBarcode did not initialize."));
                return;
            }

            win.document
                .querySelectorAll<HTMLElement>(".label-container")
                .forEach((label) => {
                    const svg = label.querySelector<SVGSVGElement>("svg");
                    const code = label.getAttribute("data-code");
                    if (!svg || !code) return;

                    renderBarcode(svg, code, {
                        format: "CODE128",
                        width: 1.2,
                        height: 25,
                        displayValue: true,
                        fontSize: 10,
                    });
                });

            win.setTimeout(() => {
                win.focus();
                win.print();
                resolve();
            }, 300);
        };

        win.document.head.appendChild(script);
    });
}
