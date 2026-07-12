"use client";

// عناصر واجهة مشتركة لنظام البوث — بثيم التطبيق (ذهبي/زجاجي، RTL)

import type { LucideIcon } from "lucide-react";
import { Info, CheckCircle2, AlertTriangle } from "lucide-react";

// ── لوحة/بطاقة ────────────────────────────────────────────────
export function Panel({
    title,
    icon: Icon,
    action,
    children,
    className = "",
}: {
    title?: string;
    icon?: LucideIcon;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`theme-surface-panel rounded-2xl p-5 ${className}`}>
            {(title || action) && (
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-theme-soft">
                        {Icon && <Icon className="w-4 h-4 text-gold" />}
                        {title}
                    </div>
                    {action}
                </div>
            )}
            {children}
        </div>
    );
}

// ── بطاقة مؤشر (KPI) ─────────────────────────────────────────
export function KpiCard({
    icon: Icon,
    label,
    value,
    sub,
    tone,
}: {
    icon?: LucideIcon;
    label: string;
    value: React.ReactNode;
    sub?: React.ReactNode;
    tone?: "up" | "down";
}) {
    return (
        <div className="rounded-xl border border-theme-subtle bg-surface-2/40 backdrop-blur-xl px-4 py-3">
            <div className="flex items-center gap-1.5 text-[11px] text-theme-faint mb-1.5">
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {label}
            </div>
            <div className="text-xl font-bold text-theme tabular-nums">{value}</div>
            {sub !== undefined && (
                <div className={`text-[11px] mt-0.5 ${tone === "up" ? "text-forest" : tone === "down" ? "text-red-400" : "text-theme-faint"}`}>
                    {sub}
                </div>
            )}
        </div>
    );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">{children}</div>;
}

// ── حقل إدخال ────────────────────────────────────────────────
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="block text-xs text-theme-soft mb-1.5">{label}</span>
            {children}
        </label>
    );
}

export const inputCls = "input-theme !py-2.5 !text-sm";
export const selectCls = "input-theme !py-2.5 !text-sm cursor-pointer";

// ── شريط تقدّم ───────────────────────────────────────────────
export function Bar({ value, color = "var(--wusha-gold)" }: { value: number; color?: string }) {
    return (
        <div className="h-1.5 rounded-full bg-theme-subtle overflow-hidden mt-1">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
        </div>
    );
}

// ── شارة حالة ────────────────────────────────────────────────
type PillTone = "gold" | "forest" | "blue" | "amber" | "red" | "violet" | "gray";
const pillTones: Record<PillTone, string> = {
    gold: "bg-gold/10 text-gold border-gold/20",
    forest: "bg-forest/10 text-forest border-forest/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    gray: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

export function Pill({ children, tone = "gray" }: { children: React.ReactNode; tone?: PillTone }) {
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${pillTones[tone]}`}>
            {children}
        </span>
    );
}

// ── تنبيه مضمّن ──────────────────────────────────────────────
type AlertTone = "g" | "b" | "r" | "a";
const alertTones: Record<AlertTone, string> = {
    g: "bg-forest/10 text-forest border-forest/20",
    b: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    r: "bg-red-500/10 text-red-400 border-red-500/20",
    a: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export function Alert({ tone, children }: { tone: AlertTone; children: React.ReactNode }) {
    const Icon = tone === "g" ? CheckCircle2 : tone === "r" || tone === "a" ? AlertTriangle : Info;
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${alertTones[tone]}`}>
            <Icon className="w-4 h-4 shrink-0" />
            <span>{children}</span>
        </div>
    );
}

// ── صف حساب (سطر مالي) ───────────────────────────────────────
export function AccRow({
    label,
    value,
    valueClass = "text-theme",
    strong,
}: {
    label: React.ReactNode;
    value: React.ReactNode;
    valueClass?: string;
    strong?: boolean;
}) {
    return (
        <div className={`flex justify-between items-center py-1.5 text-xs ${strong ? "border-t border-theme-soft mt-1 pt-2" : "border-b border-theme-subtle last:border-0"}`}>
            <span className={strong ? "font-bold text-theme" : "text-theme-soft"}>{label}</span>
            <span className={`${valueClass} ${strong ? "font-bold text-sm" : "font-medium"}`}>{value}</span>
        </div>
    );
}

// ── مفتاح تبديل ──────────────────────────────────────────────
export function Toggle({
    on,
    onToggle,
    title,
    sub,
}: {
    on: boolean;
    onToggle: () => void;
    title: string;
    sub: string;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-right transition-colors ${on ? "border-forest/40 bg-forest/10" : "border-theme-subtle bg-surface-2/40"}`}
        >
            <span className={`relative w-8 h-[18px] rounded-full transition-colors shrink-0 ${on ? "bg-forest" : "bg-theme-strong"}`}>
                <span className={`absolute top-[3px] w-3 h-3 rounded-full bg-white transition-all ${on ? "left-[3px]" : "right-[3px]"}`} />
            </span>
            <span>
                <span className="block text-[13px] font-bold text-theme">{title}</span>
                <span className="block text-[11px] text-theme-faint">{sub}</span>
            </span>
        </button>
    );
}

// ── أزرار ────────────────────────────────────────────────────
export function BtnPrimary({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-forest text-white hover:bg-forest/90 transition-colors disabled:opacity-50 ${props.className ?? ""}`}
        >
            {children}
        </button>
    );
}

export function BtnGhost({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm border border-theme-subtle bg-surface-2/40 text-theme-soft hover:bg-surface-2/70 transition-colors ${props.className ?? ""}`}
        >
            {children}
        </button>
    );
}

export function BtnDanger({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50 ${props.className ?? ""}`}
        >
            {children}
        </button>
    );
}

// ── جدول قابل للتمرير أفقياً ─────────────────────────────────
export function TableWrap({ children }: { children: React.ReactNode }) {
    return (
        <div className="theme-surface-panel rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">{children}</div>
        </div>
    );
}
