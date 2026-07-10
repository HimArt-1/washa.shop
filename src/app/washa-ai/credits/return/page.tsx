// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — صفحة العودة بعد دفع رصيد WASHA AI
//  /washa-ai/credits/return?order=...&success=1
//  تتحقق من الدفع وتشحن المحفظة، ثم تعرض النتيجة.
// ═══════════════════════════════════════════════════════════

import { Suspense } from "react";
import CreditsReturnClient from "./CreditsReturnClient";

export const dynamic = "force-dynamic";

export default function CreditsReturnPage() {
    return (
        <Suspense fallback={<CreditsReturnFallback />}>
            <CreditsReturnClient />
        </Suspense>
    );
}

function CreditsReturnFallback() {
    return (
        <main
            dir="rtl"
            style={{
                minHeight: "100dvh",
                display: "grid",
                placeItems: "center",
                background: "#0c0a08",
                color: "#e7ddc8",
                fontFamily: "system-ui, sans-serif",
            }}
        >
            <p>جارٍ التحقق من الدفع…</p>
        </main>
    );
}
