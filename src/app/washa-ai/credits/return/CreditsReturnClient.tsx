"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type VerifyState =
    | { status: "verifying" }
    | { status: "canceled" }
    | { status: "success"; credits: number; balance: number | null; alreadyProcessed: boolean }
    | { status: "error"; message: string };

const GOLD = "#c8a15a";
const BG = "#0c0a08";
const CARD = "#14110d";

export default function CreditsReturnClient() {
    const params = useSearchParams();
    const orderNumber = params.get("order") || "";
    const canceled = params.get("canceled") === "1";
    const [state, setState] = useState<VerifyState>({ status: "verifying" });
    const startedRef = useRef(false);

    const verify = useCallback(async () => {
        if (!orderNumber) {
            setState({ status: "error", message: "رقم الطلب غير متاح." });
            return;
        }
        setState({ status: "verifying" });
        try {
            const res = await fetch("/api/washa-ai/credits/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderNumber }),
            });
            const data = await res.json();
            if (!res.ok) {
                setState({ status: "error", message: data?.error || "تعذّر التحقق من الدفع." });
                return;
            }
            setState({
                status: "success",
                credits: data.credits,
                balance: typeof data.balance === "number" ? data.balance : null,
                alreadyProcessed: data.alreadyProcessed === true,
            });
        } catch {
            setState({ status: "error", message: "تعذّر الاتصال بالخادم." });
        }
    }, [orderNumber]);

    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;
        if (canceled) {
            setState({ status: "canceled" });
            return;
        }
        void verify();
    }, [canceled, verify]);

    return (
        <main
            dir="rtl"
            style={{
                minHeight: "100dvh",
                display: "grid",
                placeItems: "center",
                background: `radial-gradient(1200px 600px at 50% -10%, #1b1815, ${BG})`,
                color: "#e7ddc8",
                fontFamily: "system-ui, sans-serif",
                padding: "24px",
            }}
        >
            <section
                style={{
                    width: "min(440px, 100%)",
                    background: CARD,
                    border: "1px solid rgba(200,161,90,0.22)",
                    borderRadius: "20px",
                    padding: "40px 28px",
                    textAlign: "center",
                    boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
                }}
            >
                {state.status === "verifying" && (
                    <>
                        <Spinner />
                        <h1 style={{ fontSize: "1.35rem", margin: "20px 0 8px" }}>جارٍ تأكيد الدفع…</h1>
                        <p style={{ opacity: 0.7, fontSize: "0.95rem" }}>لحظات ونضيف رصيدك.</p>
                    </>
                )}

                {state.status === "success" && (
                    <>
                        <Badge symbol="✓" color={GOLD} />
                        <h1 style={{ fontSize: "1.5rem", margin: "20px 0 10px", color: GOLD }}>
                            {state.alreadyProcessed ? "الرصيد مضاف مسبقاً" : "تم شحن رصيدك"}
                        </h1>
                        <p style={{ opacity: 0.85, lineHeight: 1.9 }}>
                            أضفنا <strong style={{ color: "#fff" }}>{state.credits}</strong> حصة توليد إلى محفظتك.
                            {state.balance !== null && (
                                <>
                                    {" "}
                                    رصيدك الآن: <strong style={{ color: "#fff" }}>{state.balance}</strong> حصة.
                                </>
                            )}
                        </p>
                        <ReturnButton />
                    </>
                )}

                {state.status === "canceled" && (
                    <>
                        <Badge symbol="⁠×" color="#b98a4a" />
                        <h1 style={{ fontSize: "1.4rem", margin: "20px 0 10px" }}>أُلغيت عملية الدفع</h1>
                        <p style={{ opacity: 0.8, lineHeight: 1.9 }}>لم يتم خصم أي مبلغ. يمكنك المحاولة مجدداً في أي وقت.</p>
                        <ReturnButton />
                    </>
                )}

                {state.status === "error" && (
                    <>
                        <Badge symbol="!" color="#c76b5a" />
                        <h1 style={{ fontSize: "1.35rem", margin: "20px 0 10px" }}>تعذّر تأكيد الدفع</h1>
                        <p style={{ opacity: 0.85, lineHeight: 1.9 }}>{state.message}</p>
                        <button onClick={() => void verify()} style={buttonStyle}>
                            إعادة المحاولة
                        </button>
                        <ReturnButton subtle />
                    </>
                )}
            </section>
        </main>
    );
}

function ReturnButton({ subtle }: { subtle?: boolean }) {
    return (
        <a
            href="/design/washa-ai/app"
            style={{
                ...buttonStyle,
                marginTop: subtle ? "10px" : "22px",
                background: subtle ? "transparent" : buttonStyle.background,
                border: subtle ? "1px solid rgba(200,161,90,0.3)" : buttonStyle.border,
                color: subtle ? "#c8a15a" : buttonStyle.color,
            }}
        >
            العودة إلى الاستوديو
        </a>
    );
}

const buttonStyle: React.CSSProperties = {
    display: "inline-block",
    marginTop: "22px",
    padding: "12px 28px",
    borderRadius: "12px",
    background: "linear-gradient(180deg, #d8b978, #c8a15a)",
    color: "#1a1409",
    fontWeight: 700,
    textDecoration: "none",
    border: "1px solid rgba(200,161,90,0.5)",
    cursor: "pointer",
    fontSize: "0.98rem",
};

function Badge({ symbol, color }: { symbol: string; color: string }) {
    return (
        <div
            style={{
                width: "64px",
                height: "64px",
                margin: "0 auto",
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: "1.8rem",
                color,
                border: `2px solid ${color}`,
                background: "rgba(255,255,255,0.03)",
            }}
        >
            {symbol}
        </div>
    );
}

function Spinner() {
    return (
        <>
            <div
                style={{
                    width: "48px",
                    height: "48px",
                    margin: "0 auto",
                    border: "3px solid rgba(200,161,90,0.25)",
                    borderTopColor: GOLD,
                    borderRadius: "50%",
                    animation: "washa-spin 0.8s linear infinite",
                }}
            />
            <style>{`@keyframes washa-spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}
