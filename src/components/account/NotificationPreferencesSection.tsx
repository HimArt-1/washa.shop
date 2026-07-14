"use client";

import { useState, useTransition } from "react";
import { BellRing, Clock3, Loader2, Palette, Package, Save, Store, TicketCheck } from "lucide-react";
import { updateNotificationPreferences } from "@/app/actions/user-notifications";
import { PushSubscribeButton } from "@/components/notifications/PushSubscribeButton";
import type { NotificationPreferences } from "@/types/database";

type ToggleKey = "push_enabled" | "order_updates" | "support_replies" | "design_updates" | "artist_updates";

const OPTIONS: Array<{
    key: ToggleKey;
    label: string;
    description: string;
    icon: typeof BellRing;
}> = [
    { key: "push_enabled", label: "الإشعارات الفورية", description: "إظهار التنبيهات المهمة خارج المنصة على هذا الجهاز.", icon: BellRing },
    { key: "order_updates", label: "الطلبات والشحن", description: "التأكيد والدفع والتجهيز والشحن والتسليم.", icon: Package },
    { key: "support_replies", label: "ردود الدعم", description: "إشعارك عندما يرد فريق الدعم على تذكرتك.", icon: TicketCheck },
    { key: "design_updates", label: "طلبات التصميم", description: "جاهزية التصميم والتسعير وطلبات المراجعة.", icon: Palette },
    { key: "artist_updates", label: "نشاط الوشّاي", description: "حالة الأعمال الفنية والمبيعات والتفاعلات المهنية.", icon: Store },
];

export function NotificationPreferencesSection({ initialPreferences }: { initialPreferences: NotificationPreferences }) {
    const [preferences, setPreferences] = useState(initialPreferences);
    const [message, setMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const toggle = (key: ToggleKey) => {
        setPreferences((current) => ({ ...current, [key]: !current[key] }));
        setMessage(null);
    };

    const save = () => {
        startTransition(async () => {
            setMessage(null);
            const result = await updateNotificationPreferences({
                push_enabled: preferences.push_enabled,
                order_updates: preferences.order_updates,
                support_replies: preferences.support_replies,
                design_updates: preferences.design_updates,
                artist_updates: preferences.artist_updates,
                quiet_hours_start: preferences.quiet_hours_start,
                quiet_hours_end: preferences.quiet_hours_end,
                timezone: preferences.timezone,
            });
            setMessage(result.success ? "تم حفظ تفضيلات الإشعارات." : result.error || "تعذر حفظ التفضيلات.");
        });
    };

    return (
        <section className="theme-surface-panel overflow-hidden rounded-[2rem]">
            <div className="flex flex-col gap-4 border-b border-theme-subtle px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <BellRing className="h-5 w-5 text-gold" />
                        <h2 className="text-lg font-bold text-theme">الإشعارات</h2>
                    </div>
                    <p className="mt-1 text-sm text-theme-subtle">اختر ما يصلك فورياً؛ يحتفظ سجل المنصة دائمًا بالتحديثات المهمة.</p>
                </div>
                <PushSubscribeButton />
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
                {OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const enabled = preferences[option.key];
                    return (
                        <button
                            key={option.key}
                            type="button"
                            role="switch"
                            aria-checked={enabled}
                            onClick={() => toggle(option.key)}
                            className="flex items-start gap-3 rounded-2xl border border-theme-subtle bg-theme-faint p-4 text-right transition-colors hover:border-gold/20"
                        >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                                <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-bold text-theme">{option.label}</span>
                                <span className="mt-1 block text-xs leading-5 text-theme-subtle">{option.description}</span>
                            </span>
                            <span className={`mt-1 flex h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${enabled ? "bg-gold" : "bg-theme-soft"}`}>
                                <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? "-translate-x-5" : "translate-x-0"}`} />
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="border-t border-theme-subtle px-5 py-5 sm:px-6">
                <div className="mb-3 flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-gold" />
                    <h3 className="text-sm font-bold text-theme">ساعات الهدوء</h3>
                    <span className="text-xs text-theme-faint">بتوقيت الرياض</span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="text-xs text-theme-subtle">
                        من
                        <input
                            type="time"
                            value={preferences.quiet_hours_start?.slice(0, 5) || ""}
                            onChange={(event) => setPreferences((current) => ({ ...current, quiet_hours_start: event.target.value || null }))}
                            className="mt-1 block rounded-xl border border-theme-subtle bg-theme-faint px-3 py-2 text-theme"
                        />
                    </label>
                    <label className="text-xs text-theme-subtle">
                        إلى
                        <input
                            type="time"
                            value={preferences.quiet_hours_end?.slice(0, 5) || ""}
                            onChange={(event) => setPreferences((current) => ({ ...current, quiet_hours_end: event.target.value || null }))}
                            className="mt-1 block rounded-xl border border-theme-subtle bg-theme-faint px-3 py-2 text-theme"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={() => setPreferences((current) => ({ ...current, quiet_hours_start: null, quiet_hours_end: null }))}
                        className="rounded-xl px-3 py-2 text-xs text-theme-subtle hover:text-theme"
                    >
                        إلغاء الوقت الهادئ
                    </button>
                    <button
                        type="button"
                        onClick={save}
                        disabled={isPending}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 sm:mr-auto"
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        حفظ التفضيلات
                    </button>
                </div>
                {message && <p className="mt-3 text-xs text-theme-subtle" role="status">{message}</p>}
            </div>
        </section>
    );
}
