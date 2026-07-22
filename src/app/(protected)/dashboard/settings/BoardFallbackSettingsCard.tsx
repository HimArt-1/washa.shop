"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, Save, Sparkles } from "lucide-react";
import { updateSiteSetting } from "@/app/actions/settings";
import type {
    GenerationMode,
    QuotaChargingConfig,
} from "@/lib/washa-generation-mode";

type Feedback = {
    kind: "success" | "error";
    message: string;
} | null;

function DraftSwitch({
    checked,
    onChange,
    ariaLabel,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    ariaLabel: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-label={ariaLabel}
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${checked ? "border-emerald-400/30 bg-emerald-500/80" : "border-theme-soft bg-theme-subtle"}`}
        >
            <span className={`absolute top-1 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${checked ? "right-6" : "right-1"}`} />
        </button>
    );
}

export function BoardFallbackSettingsCard({
    initialGenerationMode,
    initialQuotaCharging,
}: {
    initialGenerationMode: GenerationMode;
    initialQuotaCharging: QuotaChargingConfig;
}) {
    const [generationMode, setGenerationMode] = useState<GenerationMode>(
        initialGenerationMode
    );
    const [quotaCharging, setQuotaCharging] = useState<QuotaChargingConfig>(
        initialQuotaCharging
    );
    const [modeFeedback, setModeFeedback] = useState<Feedback>(null);
    const [quotaFeedback, setQuotaFeedback] = useState<Feedback>(null);
    const [isSavingMode, startModeTransition] = useTransition();
    const [isSavingQuota, startQuotaTransition] = useTransition();

    const chargeDecision = quotaCharging.auto
        ? generationMode === "primary"
        : quotaCharging.manual_override === "enabled";

    const saveGenerationMode = () => {
        setModeFeedback(null);
        startModeTransition(async () => {
            try {
                const result = await updateSiteSetting(
                    "generation_mode",
                    generationMode
                );
                setModeFeedback(result.success
                    ? { kind: "success", message: "تم حفظ وضع التوليد." }
                    : { kind: "error", message: result.error || "تعذّر حفظ وضع التوليد." });
            } catch {
                setModeFeedback({ kind: "error", message: "تعذّر حفظ وضع التوليد." });
            }
        });
    };

    const saveQuotaCharging = () => {
        setQuotaFeedback(null);
        startQuotaTransition(async () => {
            try {
                const value: QuotaChargingConfig = quotaCharging.auto
                    ? { auto: true, manual_override: null }
                    : {
                        auto: false,
                        manual_override: quotaCharging.manual_override === "enabled"
                            ? "enabled"
                            : "disabled",
                    };
                const result = await updateSiteSetting("quota_charging", value);
                setQuotaFeedback(result.success
                    ? { kind: "success", message: "تم حفظ سياسة الحصة." }
                    : { kind: "error", message: result.error || "تعذّر حفظ سياسة الحصة." });
            } catch {
                setQuotaFeedback({ kind: "error", message: "تعذّر حفظ سياسة الحصة." });
            }
        });
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-theme-subtle bg-surface/50 backdrop-blur-sm">
            <header className="flex items-center gap-2.5 border-b border-theme-subtle px-6 py-4">
                <div className="rounded-lg bg-gold/10 p-2">
                    <Sparkles className="h-4 w-4 text-gold" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-theme">Washa AI — التوليد الاحتياطي والحصة</h3>
                    <p className="mt-1 text-xs text-theme-subtle">مسودتان مستقلتان؛ لا يتغير التشغيل حتى تضغط زر الحفظ المناسب.</p>
                </div>
            </header>

            <div className="space-y-6 p-6">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                    <div className="flex items-start gap-2.5">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                        <p className="text-xs leading-6 text-amber-200">
                            عند التفعيل، التوليد يتحول لمعاينة مبدئية، الطلبات تحتاج تركيب يدوي
                        </p>
                    </div>
                </div>

                <div className="rounded-xl border border-theme-subtle bg-theme-faint/30 p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h4 className="text-sm font-bold text-theme">وضع التوليد الاحتياطي</h4>
                            <p className="mt-1 text-xs text-theme-subtle">
                                المسودة الحالية: {generationMode === "fallback" ? "معاينة احتياطية" : "المسار الأساسي"}
                            </p>
                        </div>
                        <DraftSwitch
                            checked={generationMode === "fallback"}
                            ariaLabel="وضع التوليد الاحتياطي"
                            onChange={(checked) => setGenerationMode(checked ? "fallback" : "primary")}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={saveGenerationMode}
                        disabled={isSavingMode}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-bg disabled:opacity-50"
                    >
                        {isSavingMode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        حفظ وضع التوليد
                    </button>
                    {modeFeedback ? (
                        <p
                            role={modeFeedback.kind === "error" ? "alert" : "status"}
                            className={`mt-3 rounded-xl border p-3 text-sm ${modeFeedback.kind === "error" ? "border-rose-500/25 bg-rose-500/10 text-rose-300" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"}`}
                        >
                            {modeFeedback.message}
                        </p>
                    ) : null}
                </div>

                <div className="rounded-xl border border-theme-subtle bg-theme-faint/30 p-4">
                    <label className="flex cursor-pointer items-start justify-between gap-4">
                        <span>
                            <strong className="block text-sm text-theme">احتساب الحصة تلقائيًا</strong>
                            <span className="mt-1 block text-xs leading-5 text-theme-subtle">الأصل: لا تُحتسب في الوضع الاحتياطي</span>
                        </span>
                        <input
                            type="checkbox"
                            aria-label="احتساب الحصة تلقائيًا"
                            checked={quotaCharging.auto}
                            onChange={(event) => {
                                const auto = event.target.checked;
                                setQuotaCharging(auto
                                    ? { auto: true, manual_override: null }
                                    : {
                                        auto: false,
                                        manual_override: generationMode === "fallback"
                                            ? "disabled"
                                            : "enabled",
                                    });
                            }}
                            className="mt-1 h-5 w-5 accent-amber-500"
                        />
                    </label>

                    {!quotaCharging.auto ? (
                        <div className="mt-4 flex items-center justify-between gap-4 border-t border-theme-subtle pt-4">
                            <div>
                                <strong className="text-sm text-theme">
                                    احتساب الحصة: {quotaCharging.manual_override === "enabled" ? "مُفعّل" : "معطّل"}
                                </strong>
                                <p className="mt-1 text-xs text-theme-subtle">تجاوز يدوي صريح لقرار الوضع الحالي.</p>
                            </div>
                            <DraftSwitch
                                checked={quotaCharging.manual_override === "enabled"}
                                ariaLabel="احتساب الحصة يدويًا"
                                onChange={(checked) => setQuotaCharging({
                                    auto: false,
                                    manual_override: checked ? "enabled" : "disabled",
                                })}
                            />
                        </div>
                    ) : null}

                    <p className="mt-4 rounded-lg bg-theme-subtle/40 px-3 py-2 text-xs text-theme-subtle">
                        قرار المسودة: {chargeDecision ? "تُحتسب الحصة" : "لا تُحتسب الحصة"}
                    </p>
                    <button
                        type="button"
                        onClick={saveQuotaCharging}
                        disabled={isSavingQuota}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-4 py-2.5 text-sm font-bold text-gold disabled:opacity-50"
                    >
                        {isSavingQuota ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        حفظ سياسة الحصة
                    </button>
                    {quotaFeedback ? (
                        <p
                            role={quotaFeedback.kind === "error" ? "alert" : "status"}
                            className={`mt-3 rounded-xl border p-3 text-sm ${quotaFeedback.kind === "error" ? "border-rose-500/25 bg-rose-500/10 text-rose-300" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"}`}
                        >
                            {quotaFeedback.message}
                        </p>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
