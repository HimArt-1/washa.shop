import type { BoardRequestAdminRow } from "@/app/actions/board-requests";
import type { WashaBoardManualPrintStatus } from "@/types/database";

const PREVIEW_LENGTH = 240;

const MANUAL_STATUS_OPTIONS: Array<{
    value: WashaBoardManualPrintStatus;
    label: string;
}> = [
    { value: "pending", label: "بانتظار التنفيذ" },
    { value: "in_progress", label: "قيد التنفيذ" },
    { value: "completed", label: "مكتمل" },
];

function getManualStatusLabel(status: WashaBoardManualPrintStatus) {
    return MANUAL_STATUS_OPTIONS.find((option) => option.value === status)?.label
        ?? status;
}

export function truncateBoardText(value: unknown, maxLength = PREVIEW_LENGTH) {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    if (!text) return "—";
    const characters = Array.from(text);
    return characters.length > maxLength
        ? `${characters.slice(0, maxLength).join("")}…`
        : text;
}

export function getSafeBoardImageUrl(value: string | null) {
    if (!value) return null;
    try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:"
            ? parsed.toString()
            : null;
    } catch {
        return null;
    }
}

function formatContextValue(value: unknown) {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

function CustomerDetails({ row }: { row: BoardRequestAdminRow }) {
    if (!row.customer) {
        return <p className="text-sm text-theme-subtle">حساب محذوف</p>;
    }
    return (
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div><dt className="text-theme-faint">الاسم</dt><dd className="text-theme">{truncateBoardText(row.customer.displayName)}</dd></div>
            <div><dt className="text-theme-faint">اسم المستخدم</dt><dd className="text-theme" dir="ltr">{truncateBoardText(row.customer.username)}</dd></div>
            <div><dt className="text-theme-faint">البريد</dt><dd className="break-all text-theme" dir="ltr">{truncateBoardText(row.customer.email)}</dd></div>
            <div><dt className="text-theme-faint">الهاتف</dt><dd className="text-theme" dir="ltr">{truncateBoardText(row.customer.phone)}</dd></div>
        </dl>
    );
}

export function BoardRequestCard({
    row,
    onStatusChange,
    isPending,
}: {
    row: BoardRequestAdminRow;
    onStatusChange?: (status: WashaBoardManualPrintStatus) => void;
    isPending: boolean;
}) {
    const safeImageUrl = getSafeBoardImageUrl(row.boardImageUrl);
    const fullContext = JSON.stringify(row.generationContext, null, 2);
    const contextEntries = Object.entries(row.generationContext);
    const createdAt = new Intl.DateTimeFormat("ar-SA", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Riyadh",
    }).format(new Date(row.createdAt));

    return (
        <article className="overflow-hidden rounded-2xl border border-theme-subtle bg-surface/60">
            <header className="flex flex-col gap-3 border-b border-theme-subtle p-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${row.status === "ready" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-rose-500/25 bg-rose-500/10 text-rose-300"}`}>
                            {row.status === "ready" ? "جاهزة للتركيب" : "فشل التوليد"}
                        </span>
                        {row.status === "ready" ? (
                            <span className="rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 text-xs text-gold">
                                {getManualStatusLabel(row.manualPrintStatus)}
                            </span>
                        ) : null}
                    </div>
                    <p className="mt-3 break-all font-mono text-xs text-theme-subtle" dir="ltr">{row.id}</p>
                    <p className="mt-1 text-xs text-theme-faint">{createdAt}</p>
                </div>
                <div className="text-xs text-theme-subtle">
                    <p>المزوّد: <span dir="ltr">{truncateBoardText(row.provider)}</span></p>
                    <p>النموذج: <span dir="ltr">{truncateBoardText(row.generationModel)}</span></p>
                </div>
            </header>

            <div className="grid gap-6 p-5 lg:grid-cols-[280px_1fr]">
                <div>
                    {row.status === "ready" && safeImageUrl ? (
                        <div className="space-y-3">
                            <a href={safeImageUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-theme-subtle bg-black/20">
                                <img src={safeImageUrl} alt={`لوحة المعاينة ${row.id}`} className="aspect-square w-full object-contain" loading="lazy" referrerPolicy="no-referrer" />
                            </a>
                            <p className="text-center text-xs font-bold text-amber-300">معاينة فقط — ليست ملف طباعة نهائيًا</p>
                        </div>
                    ) : row.status === "ready" ? (
                        <div className="flex aspect-square items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center text-sm text-rose-300">
                            رابط اللوحة غير صالح
                        </div>
                    ) : (
                        <div className="flex aspect-square flex-col items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center">
                            <strong className="text-rose-300">لم تُنتج لوحة</strong>
                            <span className="mt-2 text-xs leading-5 text-theme-subtle">سبب الفشل غير محفوظ في هذا الإصدار؛ راجع traces باستخدام معرّف الطلب.</span>
                        </div>
                    )}
                </div>

                <div className="space-y-5">
                    <section>
                        <h3 className="mb-3 text-sm font-bold text-theme">بيانات العميل</h3>
                        <CustomerDetails row={row} />
                    </section>

                    <section>
                        <h3 className="mb-3 text-sm font-bold text-theme">سياق التوليد</h3>
                        <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {contextEntries.map(([key, value]) => (
                                <div key={key} className="rounded-xl border border-theme-subtle bg-theme-faint/30 p-3">
                                    <dt className="break-all font-mono text-[10px] text-theme-faint" dir="ltr">{key}</dt>
                                    <dd className="mt-1 break-words text-xs text-theme">{truncateBoardText(formatContextValue(value))}</dd>
                                </div>
                            ))}
                        </dl>
                        <details className="mt-3 rounded-xl border border-theme-subtle bg-theme-faint/20 p-3">
                            <summary className="cursor-pointer text-xs font-bold text-theme-subtle">generationContext الكامل</summary>
                            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-left text-xs text-theme" dir="ltr">{fullContext}</pre>
                        </details>
                    </section>

                    <details className="rounded-xl border border-theme-subtle bg-theme-faint/20 p-3">
                        <summary className="cursor-pointer text-xs font-bold text-theme-subtle">Prompt المزود — سجل تدقيق</summary>
                        <p className="mt-2 text-[11px] text-theme-faint">القالب بعد الملء، وليس بالضرورة وصف العميل الخام.</p>
                        <p className="mt-3 whitespace-pre-wrap break-words text-xs text-theme">{truncateBoardText(row.prompt)}</p>
                        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs text-theme">{row.prompt}</pre>
                    </details>
                </div>
            </div>

            {row.status === "ready" ? (
                <footer className="border-t border-theme-subtle p-5">
                    <p className="mb-3 text-xs font-bold text-theme-subtle">حالة التركيب اليدوي</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                        {MANUAL_STATUS_OPTIONS.map((option) => {
                            const current = row.manualPrintStatus === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    disabled={current || isPending}
                                    onClick={() => onStatusChange?.(option.value)}
                                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed ${current ? "border-gold/30 bg-gold/10 text-gold" : "border-theme-subtle text-theme-subtle hover:border-theme-soft hover:text-theme"}`}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </footer>
            ) : null}
        </article>
    );
}
