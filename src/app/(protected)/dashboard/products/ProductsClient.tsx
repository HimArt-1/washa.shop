"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Package, Star, StarOff, CheckCircle, XCircle, Loader2, Plus, Pencil, Trash2,
    X, Upload, Search, ArrowUpDown, ArrowUp, ArrowDown, Download, QrCode,
    Printer, CheckSquare, Square, MoreHorizontal, Filter, Tags, GripVertical, ImagePlus,
} from "lucide-react";
import {
    updateProduct, deleteProduct, createProductAdmin, uploadProductImage, syncProductVariantSkus,
} from "@/app/actions/settings";
import { createSKU, getUnitSerials, updateSKU } from "@/app/actions/erp/inventory";
import Image from "next/image";
import Link from "next/link";
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';

// ─── Types & Labels ─────────────────────────────────────────

const typeLabels: Record<string, string> = {
    all: "الكل", print: "مطبوعات", apparel: "ملابس", digital: "رقمي", nft: "NFT", original: "أصلي",
};
const typeOptions = [
    { value: "print", label: "مطبوعات" }, { value: "apparel", label: "ملابس" },
    { value: "digital", label: "رقمي" }, { value: "nft", label: "NFT" }, { value: "original", label: "أصلي" },
];

function parseCommaList(value: string) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function normalizeSizeToken(value: string) {
    const token = value.trim().replace(/\s+/g, " ");
    return /^[a-z0-9]+$/i.test(token) ? token.toUpperCase() : token;
}

function parseSizeList(value: string) {
    return parseCommaList(value).map(normalizeSizeToken);
}

const SIZE_PRESET_GROUPS = [
    { key: "apparel", label: "ملابس", sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"] },
    { key: "numeric", label: "أرقام", sizes: ["36", "38", "40", "42", "44", "46", "48", "50", "52", "54", "56", "58", "60"] },
    { key: "kids", label: "أطفال", sizes: ["2Y", "4Y", "6Y", "8Y", "10Y", "12Y", "14Y"] },
    { key: "prints", label: "طباعات", sizes: ["A5", "A4", "A3", "A2", "50x70", "70x100"] },
];

function sizeGroupForProductType(type: string) {
    return type === "print" ? "prints" : "apparel";
}

function uniqueSizes(sizes: string[]) {
    const seen = new Set<string>();
    return sizes
        .map((size) => normalizeSizeToken(size))
        .filter(Boolean)
        .filter((size) => {
            const key = size.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function sizesToFieldValue(sizes: string[]) {
    return uniqueSizes(sizes).join(", ");
}

function sameSize(a?: string | null, b?: string | null) {
    if (!a || !b) return false;
    return normalizeSizeToken(a).toLowerCase() === normalizeSizeToken(b).toLowerCase();
}

function addSizeToFieldValue(current: string, size: string) {
    return sizesToFieldValue([...parseSizeList(current), size]);
}

function removeSizeFromFieldValue(current: string, size: string) {
    return sizesToFieldValue(parseSizeList(current).filter((item) => !sameSize(item, size)));
}

function toggleSizeInFieldValue(current: string, size: string) {
    const sizes = parseSizeList(current);
    return sizes.some((item) => sameSize(item, size))
        ? removeSizeFromFieldValue(current, size)
        : sizesToFieldValue([...sizes, size]);
}

function SizePickerField({
    value,
    onChange,
    preferredGroupKey = "apparel",
    helperText,
}: {
    value: string;
    onChange: (value: string) => void;
    preferredGroupKey?: string;
    helperText?: string;
}) {
    const [activeGroupKey, setActiveGroupKey] = useState(preferredGroupKey);
    const [customSize, setCustomSize] = useState("");
    const selectedSizes = parseSizeList(value);
    const activeGroup = SIZE_PRESET_GROUPS.find((group) => group.key === activeGroupKey) || SIZE_PRESET_GROUPS[0];

    useEffect(() => {
        setActiveGroupKey(preferredGroupKey);
    }, [preferredGroupKey]);

    const addCustomSize = () => {
        const normalized = normalizeSizeToken(customSize);
        if (!normalized) return;
        onChange(addSizeToFieldValue(value, normalized));
        setCustomSize("");
    };

    return (
        <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-medium text-theme-subtle">المقاسات</label>
                <span className="rounded-full border border-theme-subtle bg-theme-subtle px-2 py-0.5 text-[10px] text-theme-subtle">
                    {selectedSizes.length || 0} مقاس
                </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SIZE_PRESET_GROUPS.map((group) => (
                    <button
                        key={group.key}
                        type="button"
                        onClick={() => setActiveGroupKey(group.key)}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all active:scale-[0.98] ${activeGroup.key === group.key
                            ? "border-gold/60 bg-gold/10 text-gold"
                            : "border-theme-subtle bg-theme-faint text-theme-subtle hover:border-gold/30 hover:text-theme"
                            }`}
                    >
                        {group.label}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {activeGroup.sizes.map((size) => {
                    const selected = selectedSizes.some((item) => sameSize(item, size));
                    return (
                        <button
                            key={size}
                            type="button"
                            onClick={() => onChange(toggleSizeInFieldValue(value, size))}
                            aria-pressed={selected}
                            className={`min-h-[42px] rounded-xl border px-2 py-2 text-xs font-bold transition-all active:scale-[0.98] ${selected
                                ? "border-gold/60 bg-gold/10 text-gold"
                                : "border-theme-subtle bg-theme-faint text-theme-subtle hover:border-gold/30 hover:text-theme"
                                }`}
                        >
                            {size}
                        </button>
                    );
                })}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
                <input
                    type="text"
                    value={customSize}
                    onChange={(event) => setCustomSize(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            addCustomSize();
                        }
                    }}
                    placeholder="مقاس مخصص"
                    className="input-dark min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm"
                    dir="ltr"
                />
                <button
                    type="button"
                    onClick={addCustomSize}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-theme-subtle bg-theme-faint px-4 py-2.5 text-xs font-bold text-theme-subtle transition-colors hover:border-gold/30 hover:text-gold"
                >
                    <Plus className="h-4 w-4" />
                    إضافة مقاس
                </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {selectedSizes.length === 0 ? (
                    <span className="rounded-lg border border-dashed border-theme-subtle px-2 py-1 text-[10px] text-theme-faint">لم يتم اختيار مقاسات</span>
                ) : selectedSizes.map((size) => (
                    <button
                        key={size}
                        type="button"
                        onClick={() => onChange(removeSizeFromFieldValue(value, size))}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-theme-subtle bg-theme-faint px-2 py-1 text-[10px] font-mono text-theme-subtle transition-colors hover:border-red-400/30 hover:text-red-300"
                        dir="ltr"
                        title={`إزالة ${size}`}
                    >
                        {size}
                        <X className="h-3 w-3" />
                    </button>
                ))}
            </div>
            {helperText && <p className="text-[10px] leading-5 text-theme-subtle">{helperText}</p>}
        </div>
    );
}

function normalizeColorToken(value: string) {
    const match = value.match(/#?[0-9a-fA-F]{3,8}/);
    const token = match ? match[0] : value.trim();
    if (/^#?[0-9a-fA-F]{3,8}$/.test(token)) {
        return `#${token.replace(/^#/, "").toLowerCase()}`;
    }
    return token;
}

function parseColorList(value: string) {
    return parseCommaList(value).map(normalizeColorToken);
}

const PRODUCT_COLOR_PALETTE = [
    { name: "أسود", hex: "#111111" },
    { name: "أبيض", hex: "#f8f7f2" },
    { name: "كريمي", hex: "#eadfc8" },
    { name: "رمادي", hex: "#8b8f93" },
    { name: "كحلي", hex: "#172033" },
    { name: "أزرق", hex: "#2f6fbd" },
    { name: "أخضر", hex: "#2f7d54" },
    { name: "زيتوني", hex: "#6d7447" },
    { name: "أحمر", hex: "#b23a3a" },
    { name: "عنابي", hex: "#6f2436" },
    { name: "ذهبي", hex: "#c7a45b" },
    { name: "بني", hex: "#7b5336" },
    { name: "وردي", hex: "#d28ca3" },
    { name: "بنفسجي", hex: "#77619a" },
    { name: "برتقالي", hex: "#c96b3c" },
];

function uniqueColors(colors: string[]) {
    const seen = new Set<string>();
    return colors
        .map((color) => normalizeColorToken(color))
        .filter(Boolean)
        .filter((color) => {
            const key = color.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function colorsToFieldValue(colors: string[]) {
    return uniqueColors(colors).join(", ");
}

function sameColor(a?: string | null, b?: string | null) {
    if (!a || !b) return false;
    return normalizeColorToken(a).toLowerCase() === normalizeColorToken(b).toLowerCase();
}

function addColorToFieldValue(current: string, color: string) {
    return colorsToFieldValue([...parseColorList(current), color]);
}

function removeColorFromFieldValue(current: string, color: string) {
    return colorsToFieldValue(parseColorList(current).filter((item) => !sameColor(item, color)));
}

function toggleColorInFieldValue(current: string, color: string) {
    const colors = parseColorList(current);
    return colors.some((item) => sameColor(item, color))
        ? removeColorFromFieldValue(current, color)
        : colorsToFieldValue([...colors, color]);
}

function toColorInputValue(value?: string | null) {
    const normalized = value ? normalizeColorToken(value) : "";
    const hex = normalized.replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
        return `#${hex.split("").map((part) => part + part).join("").toLowerCase()}`;
    }
    if (/^[0-9a-fA-F]{6,8}$/.test(hex)) {
        return `#${hex.slice(0, 6).toLowerCase()}`;
    }
    return "#c7a45b";
}

function colorLabelFor(value?: string | null) {
    const match = PRODUCT_COLOR_PALETTE.find((color) => sameColor(color.hex, value));
    return match?.name || "لون مخصص";
}

function ColorPaletteField({
    value,
    onChange,
    label = "اللون",
    compact = false,
    allowClear = true,
}: {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    compact?: boolean;
    allowClear?: boolean;
}) {
    const selectedValue = value ? normalizeColorToken(value) : "";
    const customInputValue = toColorInputValue(selectedValue);

    return (
        <div className={compact ? "space-y-2" : "space-y-2.5"}>
            <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-medium text-theme-subtle">{label}</label>
                {selectedValue ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-theme-subtle bg-theme-subtle px-2 py-0.5 text-[10px] font-mono text-theme-subtle" dir="ltr">
                        <span className="h-3 w-3 rounded-full border border-theme-soft" style={{ backgroundColor: selectedValue }} aria-hidden />
                        {selectedValue}
                    </span>
                ) : (
                    <span className="text-[10px] text-theme-faint">بدون لون</span>
                )}
            </div>
            <div className={`grid gap-2 ${compact ? "grid-cols-5 sm:grid-cols-8" : "grid-cols-4 sm:grid-cols-6"}`}>
                {PRODUCT_COLOR_PALETTE.map((color) => {
                    const selected = sameColor(selectedValue, color.hex);
                    return (
                        <button
                            key={color.hex}
                            type="button"
                            onClick={() => onChange(color.hex)}
                            aria-pressed={selected}
                            title={color.name}
                            className={`group flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[10px] transition-all active:scale-[0.98] ${selected
                                ? "border-gold/60 bg-gold/10 text-gold"
                                : "border-theme-subtle bg-theme-faint text-theme-subtle hover:border-gold/30 hover:text-theme"
                                }`}
                        >
                            <span className={`h-5 w-5 rounded-full border ${selected ? "border-gold" : "border-theme-soft"}`} style={{ backgroundColor: color.hex }} aria-hidden />
                            <span className="max-w-full truncate">{color.name}</span>
                        </button>
                    );
                })}
                <label
                    title="لون مخصص"
                    className="relative flex min-h-[48px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-theme-subtle bg-theme-faint px-2 py-2 text-[10px] text-theme-subtle transition-all hover:border-gold/30 hover:text-theme active:scale-[0.98]"
                >
                    <input
                        type="color"
                        value={customInputValue}
                        onChange={(event) => onChange(event.target.value)}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        aria-label="اختيار لون مخصص"
                    />
                    <span className="h-5 w-5 rounded-full border border-theme-soft" style={{ backgroundColor: customInputValue }} aria-hidden />
                    <span>مخصص</span>
                </label>
                {allowClear && (
                    <button
                        type="button"
                        onClick={() => onChange("")}
                        className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl border border-theme-subtle bg-theme-faint px-2 py-2 text-[10px] text-theme-subtle transition-all hover:bg-theme-subtle active:scale-[0.98]"
                    >
                        <X className="h-4 w-4" />
                        <span>بدون</span>
                    </button>
                )}
            </div>
        </div>
    );
}

type ProductSkuRow = {
    id: string;
    sku?: string | null;
    size?: string | null;
    color_code?: string | null;
    color_image_url?: string | null;
    is_active?: boolean;
};

type VariantQuantityMap = Record<string, string>;

function variantMatrixKey(size?: string | null, color?: string | null) {
    return `${normalizeSizeToken(size || "") || "∅"}::${normalizeColorToken(color || "") || "∅"}`;
}

function buildVariantMatrix(sizes: string[], colors: string[]) {
    const matrixSizes = sizes.length > 0 ? sizes : [null];
    const matrixColors = colors.length > 0 ? colors : [null];
    return matrixSizes.flatMap((size) => matrixColors.map((color) => ({ size, color })));
}

function findSkuForVariant(skus: ProductSkuRow[], size?: string | null, color?: string | null) {
    const key = variantMatrixKey(size, color);
    return skus.find((sku) => sku.is_active !== false && variantMatrixKey(sku.size, sku.color_code) === key);
}

function normalizeQuantityInput(value?: string | null) {
    return String(value ?? "")
        .trim()
        .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
        .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
        .replace(/[^\d]/g, "");
}

function formatQuantityInput(value?: string | null) {
    const normalized = normalizeQuantityInput(value);
    if (!normalized) return "";
    const quantity = Number.parseInt(normalized, 10);
    if (!Number.isFinite(quantity)) return "";
    return String(Math.min(quantity, 999999));
}

function parseVariantQuantity(value?: string | null) {
    const quantity = Number.parseInt(normalizeQuantityInput(value), 10);
    return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
}

function sanitizeVariantQuantities(quantities: VariantQuantityMap, sizes: string[], colors: string[]) {
    const next: VariantQuantityMap = {};
    buildVariantMatrix(sizes, colors).forEach((variant) => {
        const key = variantMatrixKey(variant.size, variant.color);
        if (Object.prototype.hasOwnProperty.call(quantities, key)) {
            next[key] = quantities[key];
        }
    });
    return next;
}

function buildVariantQuantityPayload(quantities: VariantQuantityMap, sizes: string[], colors: string[]) {
    const payload: Record<string, number> = {};
    buildVariantMatrix(sizes, colors).forEach((variant) => {
        const key = variantMatrixKey(variant.size, variant.color);
        payload[key] = parseVariantQuantity(quantities[key]);
    });
    return payload;
}

function VariantInventoryPlanner({
    sizes,
    colors,
    skus = [],
    quantities,
    skuInventoryTotals = {},
    mode,
    onChange,
    onFillAll,
    onClearAll,
}: {
    sizes: string[];
    colors: string[];
    skus?: ProductSkuRow[];
    quantities: VariantQuantityMap;
    skuInventoryTotals?: Record<string, number>;
    mode: "add" | "edit";
    onChange: (key: string, value: string) => void;
    onFillAll: (value: string) => void;
    onClearAll: () => void;
}) {
    const [bulkValue, setBulkValue] = useState("");
    const variants = buildVariantMatrix(sizes, colors);
    const activeSkus = skus.filter((sku) => sku.is_active !== false);
    const editableVariants = variants.filter((variant) => mode === "add" || !findSkuForVariant(activeSkus, variant.size, variant.color));
    const plannedTotal = editableVariants.reduce((sum, variant) => sum + parseVariantQuantity(quantities[variantMatrixKey(variant.size, variant.color)]), 0);
    const existingTotal = variants.reduce((sum, variant) => {
        const sku = findSkuForVariant(activeSkus, variant.size, variant.color);
        return sum + (sku ? Number(skuInventoryTotals[sku.id] || 0) : 0);
    }, 0);

    const applyBulkValue = () => {
        const normalized = String(parseVariantQuantity(bulkValue));
        onFillAll(normalized);
    };

    return (
        <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold text-theme">كميات المتغيرات</p>
                    <p className="mt-1 text-[10px] leading-5 text-theme-subtle">
                        أدخل الكمية المتاحة لكل مقاس ولون. الكمية 0 تنشئ SKU لكنه يظهر نافداً في المتجر.
                    </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-gold/20 bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold">
                        مخطط: {plannedTotal}
                    </span>
                    {mode === "edit" && (
                        <span className="rounded-full border border-theme-subtle bg-theme-subtle px-2 py-0.5 text-[10px] text-theme-subtle">
                            موجود: {existingTotal}
                        </span>
                    )}
                </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={bulkValue}
                    onChange={(event) => setBulkValue(formatQuantityInput(event.target.value))}
                    placeholder="كمية لكل المتغيرات"
                    className="input-dark min-w-0 rounded-xl px-3 py-2 text-sm"
                    autoComplete="off"
                    dir="ltr"
                />
                <button
                    type="button"
                    onClick={applyBulkValue}
                    className="rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 text-xs font-bold text-gold transition-all hover:bg-gold/15 active:scale-[0.98]"
                >
                    تعبئة الكل
                </button>
                <button
                    type="button"
                    onClick={onClearAll}
                    className="rounded-xl border border-theme-subtle bg-theme-faint px-3 py-2 text-xs font-bold text-theme-subtle transition-all hover:bg-theme-subtle active:scale-[0.98]"
                >
                    تصفير
                </button>
            </div>

            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1 styled-scrollbar">
                {variants.map((variant) => {
                    const key = variantMatrixKey(variant.size, variant.color);
                    const sku = findSkuForVariant(activeSkus, variant.size, variant.color);
                    const isExisting = Boolean(mode === "edit" && sku);
                    const currentQuantity = sku ? Number(skuInventoryTotals[sku.id] || 0) : 0;

                    return (
                        <div key={key} className="grid grid-cols-[1fr_112px] items-center gap-3 rounded-xl border border-theme-subtle bg-[color:var(--wusha-surface)] px-3 py-2">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="rounded-md border border-theme-subtle bg-theme-faint px-2 py-0.5 text-[10px] font-mono text-theme-subtle" dir="ltr">
                                        {variant.size || "NO-SIZE"}
                                    </span>
                                    {variant.color ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-md border border-theme-subtle bg-theme-faint px-2 py-0.5 text-[10px] text-theme-subtle">
                                            <span className="h-3 w-3 rounded-full border border-theme-soft" style={{ backgroundColor: variant.color }} aria-hidden />
                                            {colorLabelFor(variant.color)}
                                        </span>
                                    ) : (
                                        <span className="rounded-md border border-theme-subtle bg-theme-faint px-2 py-0.5 text-[10px] text-theme-subtle">بدون لون</span>
                                    )}
                                    {isExisting && (
                                        <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                                            SKU موجود
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-[10px] text-theme-faint">
                                    {isExisting ? "تعديل كميته من تبويب المخزون والجرد للحفاظ على سجل الحركات." : "سيتم تسجيل هذه الكمية عند إنشاء SKU."}
                                </p>
                            </div>
                            {isExisting ? (
                                <div className="rounded-xl border border-theme-subtle bg-theme-faint px-3 py-2 text-center">
                                    <p className="text-[10px] text-theme-faint">المتوفر</p>
                                    <p className="mt-0.5 font-mono text-sm font-bold text-theme" dir="ltr">{currentQuantity}</p>
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={quantities[key] ?? ""}
                                    onChange={(event) => onChange(key, event.target.value)}
                                    placeholder="0"
                                    className="input-dark h-11 rounded-xl px-3 text-center text-sm font-mono"
                                    autoComplete="off"
                                    dir="ltr"
                                    aria-label="كمية المتغير"
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function VariantMatrixPreview({
    sizes,
    colors,
    skus = [],
    mode,
}: {
    sizes: string[];
    colors: string[];
    skus?: ProductSkuRow[];
    mode: "add" | "edit";
}) {
    const variants = buildVariantMatrix(sizes, colors);
    const desiredKeys = new Set(variants.map((variant) => variantMatrixKey(variant.size, variant.color)));
    const activeSkus = skus.filter((sku) => sku.is_active !== false);
    const inactiveSkus = skus.filter((sku) => sku.is_active === false);
    const outsideSkus = activeSkus.filter((sku) => !desiredKeys.has(variantMatrixKey(sku.size, sku.color_code)));
    const existingCount = variants.filter((variant) => findSkuForVariant(activeSkus, variant.size, variant.color)).length;
    const missingCount = variants.length - existingCount;

    return (
        <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold text-theme">شبكة المقاسات والألوان</p>
                    <p className="mt-1 text-[10px] leading-5 text-theme-subtle">
                        كل تقاطع بين مقاس ولون يمثل SKU واحداً يظهر في المتجر ويرتبط بالمخزون.
                    </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-theme-subtle bg-theme-subtle px-2 py-0.5 text-[10px] text-theme-subtle">{variants.length} متغير</span>
                    {mode === "edit" && (
                        <>
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">{existingCount} موجود</span>
                            {missingCount > 0 && <span className="rounded-full border border-gold/20 bg-gold/10 px-2 py-0.5 text-[10px] text-gold">{missingCount} جديد</span>}
                        </>
                    )}
                </div>
            </div>

            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 styled-scrollbar">
                {variants.map((variant) => {
                    const sku = findSkuForVariant(activeSkus, variant.size, variant.color);
                    const label = [
                        variant.size || "بدون مقاس",
                        variant.color ? colorLabelFor(variant.color) : "بدون لون",
                    ].join(" / ");
                    return (
                        <div key={variantMatrixKey(variant.size, variant.color)} className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-theme-subtle bg-[color:var(--wusha-surface)] px-3 py-2">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="rounded-md border border-theme-subtle bg-theme-faint px-2 py-0.5 text-[10px] font-mono text-theme-subtle" dir="ltr">
                                        {variant.size || "NO-SIZE"}
                                    </span>
                                    {variant.color ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-md border border-theme-subtle bg-theme-faint px-2 py-0.5 text-[10px] text-theme-subtle">
                                            <span className="h-3 w-3 rounded-full border border-theme-soft" style={{ backgroundColor: variant.color }} aria-hidden />
                                            {colorLabelFor(variant.color)}
                                        </span>
                                    ) : (
                                        <span className="rounded-md border border-theme-subtle bg-theme-faint px-2 py-0.5 text-[10px] text-theme-subtle">بدون لون</span>
                                    )}
                                </div>
                                <p className="mt-1 truncate text-[10px] text-theme-faint">{label}</p>
                            </div>
                            <div className="flex items-center">
                                {sku ? (
                                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-mono text-emerald-300" dir="ltr">
                                        {sku.sku}
                                    </span>
                                ) : (
                                    <span className="rounded-full border border-gold/20 bg-gold/10 px-2 py-1 text-[10px] font-bold text-gold">
                                        {mode === "add" ? "سيُنشأ" : "سيُنشأ عند الحفظ"}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {mode === "edit" && outsideSkus.length > 0 && (
                <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                    <p className="text-[10px] font-bold text-amber-300">SKUs خارج الشبكة الحالية</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {outsideSkus.slice(0, 8).map((sku) => (
                            <span key={sku.id} className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-mono text-amber-200" dir="ltr">
                                {sku.sku}
                            </span>
                        ))}
                        {outsideSkus.length > 8 && <span className="text-[10px] text-amber-200">+{outsideSkus.length - 8}</span>}
                    </div>
                    <p className="mt-2 text-[10px] leading-5 text-amber-200/80">
                        سيتم تعطيلها من خيارات المتجر عند الحفظ، مع بقاء سجل الجرد والطلبات محفوظاً.
                    </p>
                </div>
            )}

            {mode === "edit" && inactiveSkus.length > 0 && (
                <p className="mt-2 text-[10px] text-theme-faint">
                    يوجد {inactiveSkus.length} SKU معطل محفوظ للأرشفة والجرد السابق.
                </p>
            )}
        </div>
    );
}

function ColorImagesManager({
    colors,
    imageUrls,
    previews,
    onPick,
    onRemove,
}: {
    colors: string[];
    imageUrls: Record<string, string | null>;
    previews: Record<string, string>;
    onPick: (color: string) => void;
    onRemove: (color: string) => void;
}) {
    if (colors.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-theme-subtle bg-theme-faint px-4 py-3 text-[10px] text-theme-faint">
                اختر لوناً أولاً حتى تتمكن من إضافة صورة خاصة به.
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-bold text-theme">صور الألوان</p>
                    <p className="mt-1 text-[10px] leading-5 text-theme-subtle">
                        عند اختيار العميل لوناً في المتجر ستنتقل صورة القطعة إلى صورة هذا اللون.
                    </p>
                </div>
                <span className="rounded-full border border-theme-subtle bg-theme-subtle px-2 py-0.5 text-[10px] text-theme-subtle">
                    {colors.length} لون
                </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {colors.map((color) => {
                    const imageUrl = previews[color] || imageUrls[color] || "";
                    return (
                        <div key={color} className="grid grid-cols-[64px_1fr] gap-3 rounded-xl border border-theme-subtle bg-[color:var(--wusha-surface)] p-2">
                            <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-theme-subtle bg-theme-subtle">
                                {imageUrl ? (
                                    <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <span className="h-7 w-7 rounded-full border border-theme-soft" style={{ backgroundColor: color }} aria-hidden />
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-3 w-3 rounded-full border border-theme-soft" style={{ backgroundColor: color }} aria-hidden />
                                    <span className="truncate text-[10px] font-mono text-theme-subtle" dir="ltr">{color}</span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => onPick(color)}
                                        className="rounded-lg border border-theme-subtle bg-theme-faint px-2 py-1 text-[10px] font-bold text-theme-subtle transition-colors hover:border-gold/30 hover:text-gold"
                                    >
                                        {imageUrl ? "تغيير الصورة" : "إضافة صورة"}
                                    </button>
                                    {imageUrl && (
                                        <button
                                            type="button"
                                            onClick={() => onRemove(color)}
                                            className="rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-300 transition-colors hover:bg-red-500/15"
                                        >
                                            إزالة
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

type SortKey = "title" | "price" | "stock_quantity" | "created_at" | "type" | "sold";
type SortDir = "asc" | "desc";

interface ProductsClientProps {
    products: any[];
    count: number;
    totalPages: number;
    currentPage: number;
    currentType: string;
    artists?: { id: string; display_name: string; username: string }[];
    categories?: { id: string; name_ar: string; name_en: string; slug: string }[];
    skus?: any[];
    inventory?: any[];
    /** Base path for links (e.g. /dashboard/products-inventory for unified view) */
    basePath?: string;
    /** Callback to open Smart Import modal (products-inventory page) */
    onSmartImportClick?: () => void;
    /** Sales data: productId → sold count */
    salesMap?: Record<string, number>;
}

// ─── Main Component ─────────────────────────────────────────

export function ProductsClient({
    products,
    count,
    totalPages,
    currentPage,
    currentType,
    artists = [],
    categories = [],
    skus = [],
    inventory = [],
    basePath = "/dashboard/products",
    onSmartImportClick,
    salesMap = {},
}: ProductsClientProps) {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // ─── Inline Editing State
    const [inlineEditing, setInlineEditing] = useState<{ id: string, field: "price" | "stock_quantity", value: string } | null>(null);
    const [inlineSaving, setInlineSaving] = useState(false);

    // ─── Advanced Features State
    const [searchQuery, setSearchQuery] = useState("");
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);
    const [barcodeProductId, setBarcodeProductId] = useState<string | null>(null);
    const [bulkDeleteRequested, setBulkDeleteRequested] = useState(false);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

    // ─── Filtered + Sorted Products
    const filteredProducts = useMemo(() => {
        let result = [...products];

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((p) =>
                p.title?.toLowerCase().includes(q) ||
                p.store_name?.toLowerCase().includes(q) ||
                p.artist?.display_name?.toLowerCase().includes(q) ||
                String(p.price).includes(q)
            );
        }

        // Sort
        if (sortKey) {
            result.sort((a, b) => {
                let aVal: any, bVal: any;
                if (sortKey === "sold") {
                    aVal = salesMap[a.id] || 0;
                    bVal = salesMap[b.id] || 0;
                } else {
                    aVal = a[sortKey];
                    bVal = b[sortKey];
                }
                if (sortKey === "price" || sortKey === "stock_quantity" || sortKey === "sold") {
                    aVal = Number(aVal) || 0;
                    bVal = Number(bVal) || 0;
                } else {
                    aVal = String(aVal || "").toLowerCase();
                    bVal = String(bVal || "").toLowerCase();
                }
                if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
                if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [products, searchQuery, sortKey, sortDir, salesMap]);

    // ─── Sort Handler
    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
        return sortDir === "asc"
            ? <ArrowUp className="w-3 h-3 text-gold" />
            : <ArrowDown className="w-3 h-3 text-gold" />;
    };

    // ─── Selection
    const allSelected = filteredProducts.length > 0 && filteredProducts.every((p) => selectedIds.has(p.id));
    const someSelected = selectedIds.size > 0;

    const toggleAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
        }
    };

    const toggleOne = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // ─── Bulk Actions
    const bulkToggleStock = async (inStock: boolean) => {
        setBulkLoading(true);
        const ids = Array.from(selectedIds);
        for (const id of ids) {
            await updateProduct(id, { in_stock: inStock });
        }
        setBulkLoading(false);
        setSelectedIds(new Set());
        showToast(`تم تحديث ${selectedIds.size} منتج ✓`);
        router.refresh();
    };

    const bulkDelete = async () => {
        setBulkLoading(true);
        const ids = Array.from(selectedIds);
        for (const id of ids) {
            await deleteProduct(id);
        }
        setBulkLoading(false);
        setBulkDeleteRequested(false);
        setSelectedIds(new Set());
        showToast(`تم حذف ${selectedIds.size} منتج ✓`);
        router.refresh();
    };

    // ─── CSV Export
    const exportCSV = () => {
        const headers = ["المنتج", "النوع", "السعر", "المخزون", "المباع", "متوفر", "مميز", "المتجر"];
        const rows = filteredProducts.map((p) => [
            p.title, typeLabels[p.type] || p.type, p.price, p.stock_quantity ?? "∞",
            salesMap[p.id] || 0,
            p.in_stock ? "نعم" : "لا", p.is_featured ? "نعم" : "لا", p.store_name || "",
        ]);
        const bom = "\uFEFF"; // UTF-8 BOM for Arabic
        const csv = bom + [headers, ...rows].map((r) => r.map((c: any) => `"${c}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `wusha-products-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("تم تصدير CSV ✓");
    };

    // ─── Toggle & Inline Handlers
    const handleToggle = async (id: string, field: "in_stock" | "is_featured", currentValue: boolean) => {
        setLoadingId(id);
        const result = await updateProduct(id, { [field]: !currentValue });
        setLoadingId(null);
        if (result.success) { showToast("تم التحديث ✓"); router.refresh(); }
        else setError(result.error || "فشل التحديث");
    };

    const handleInlineSave = async (item: any) => {
        if (!inlineEditing || inlineEditing.id !== item.id) return;
        const { field, value } = inlineEditing;
        
        let numValue: number | null = null;
        if (field === "price") {
            numValue = parseFloat(value);
            if (isNaN(numValue)) { setError("سعر غير صالح"); return; }
        } else if (field === "stock_quantity") {
            if (value.trim() === "" || value.toLowerCase() === "inf") numValue = null;
            else {
                numValue = parseInt(value, 10);
                if (isNaN(numValue) || numValue < 0) { setError("كمية غير صالحة"); return; }
            }
        }

        if (item[field] === numValue) { setInlineEditing(null); return; }

        setInlineSaving(true);
        setError(null);
        const result = await updateProduct(item.id, { [field]: numValue });
        setInlineSaving(false);

        if (result.success) { 
            showToast("تم التحديث ✓"); 
            setInlineEditing(null);
            router.refresh(); 
        } else {
            setError(result.error || "فشل التحديث");
        }
    };

    const confirmDelete = async (productId: string) => {
        setConfirmDeleteId(null);
        setLoadingId(productId);
        const result = await deleteProduct(productId);
        setLoadingId(null);
        if (result.success) { showToast("تم حذف المنتج ✓"); router.refresh(); }
        else setError(result.error || "فشل الحذف");
    };

    const setFilter = (type: string) => {
        const params = new URLSearchParams();
        if (type !== "all") params.set("type", type);
        if (basePath.includes("products-inventory")) params.set("tab", "products");
        router.push(`${basePath}?${params.toString()}`);
    };

    // ─── Get SKUs for product
    const getProductSkus = (productId: string) => skus.filter((s: any) => s.product_id === productId);
    const skuInventoryTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        inventory.forEach((item: any) => {
            const skuId = item.sku_id || item.sku?.id;
            if (!skuId) return;
            totals[skuId] = (totals[skuId] || 0) + (Number(item.quantity) || 0);
        });
        skus.forEach((sku: any) => {
            if (!sku?.id || !Array.isArray(sku.inventory_levels)) return;
            totals[sku.id] = sku.inventory_levels.reduce((sum: number, level: any) => sum + (Number(level.quantity) || 0), totals[sku.id] || 0);
        });
        return totals;
    }, [inventory, skus]);

    return (
        <div className="space-y-4">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-sm shadow-lg backdrop-blur">
                        {toast}
                    </motion.div>
                )}
                {error && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                        <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/20 rounded"><X className="w-4 h-4" /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Top Toolbar ─── */}
            <div className="space-y-3">
                {/* Row 1: Filters + Search + Actions */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    {/* Type Filters */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {Object.entries(typeLabels).map(([key, label]) => (
                            <button key={key} onClick={() => setFilter(key)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${currentType === key ? "bg-gold text-[var(--wusha-bg)] shadow-[0_2px_10px_rgba(206,174,127,0.3)]" : "bg-theme-faint text-theme-subtle hover:text-theme-soft hover:bg-theme-subtle border border-theme-faint"}`}>
                                {label}
                            </button>
                        ))}
                        <span className="text-[10px] text-theme-faint mr-2">{count} منتج</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {onSmartImportClick && (
                            <button onClick={onSmartImportClick}
                                className="flex items-center gap-2 px-4 py-2 bg-gold text-[var(--wusha-bg)] border border-gold/40 rounded-lg text-sm font-bold hover:bg-gold-light transition-all shadow-[0_12px_26px_rgba(154,123,61,0.16)]">
                                <Upload className="w-4 h-4" /> الاستيراد الذكي
                            </button>
                        )}
                        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-subtle border border-theme-subtle rounded-lg text-xs text-theme-subtle hover:text-theme-strong hover:bg-theme-soft transition-all" title="تصدير CSV">
                            <Download className="w-3.5 h-3.5" /> CSV
                        </button>
                        <button onClick={() => { setShowAddModal(true); setError(null); }}
                            className="flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold border border-gold/20 rounded-lg text-sm font-bold hover:bg-gold/20 transition-all">
                            <Plus className="w-4 h-4" /> إضافة منتج
                        </button>
                    </div>
                </div>

                {/* Row 2: Search + Bulk Actions */}
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-faint" />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="بحث بالاسم، المتجر، الوشّاي..."
                            className="w-full pr-10 pl-4 py-2 bg-theme-subtle border border-theme-subtle rounded-lg text-sm text-theme placeholder:text-theme-faint focus:outline-none focus:border-gold/30 transition-all" />
                    </div>

                    {/* Bulk Actions (shown when items selected) */}
                    <AnimatePresence>
                        {someSelected && (
                            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gold/5 border border-gold/15 rounded-lg">
                                <span className="text-xs text-gold font-bold">{selectedIds.size} محدد</span>
                                <div className="w-px h-4 bg-gold/20" />
                                <button onClick={() => bulkToggleStock(true)} disabled={bulkLoading}
                                    className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50">
                                    متوفر
                                </button>
                                <button onClick={() => bulkToggleStock(false)} disabled={bulkLoading}
                                    className="text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-50">
                                    غير متوفر
                                </button>
                                <button onClick={() => setBulkDeleteRequested(true)} disabled={bulkLoading}
                                    className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50">
                                    حذف
                                </button>
                                <button onClick={() => setSelectedIds(new Set())} className="p-0.5 text-theme-faint hover:text-theme-soft">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                                {bulkLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gold" />}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ─── Products Table ─── */}
            <div className="theme-surface-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-theme-subtle bg-theme-faint">
                                {/* Checkbox Header */}
                                <th className="w-10 px-3 py-3">
                                    <button onClick={toggleAll} className="p-1 rounded hover:bg-theme-subtle transition-colors">
                                        {allSelected ? <CheckSquare className="w-4 h-4 text-gold" /> : <Square className="w-4 h-4 text-theme-faint" />}
                                    </button>
                                </th>
                                <th className="text-right px-4 py-3 text-theme-faint font-medium text-xs">
                                    <button onClick={() => handleSort("title")} className="flex items-center gap-1.5 hover:text-theme-soft transition-colors">
                                        المنتج <SortIcon col="title" />
                                    </button>
                                </th>
                                <th className="text-right px-4 py-3 text-theme-faint font-medium text-xs">الوشّاي</th>
                                <th className="text-right px-4 py-3 text-theme-faint font-medium text-xs">
                                    <button onClick={() => handleSort("type")} className="flex items-center gap-1.5 hover:text-theme-soft transition-colors">
                                        النوع <SortIcon col="type" />
                                    </button>
                                </th>
                                <th className="text-right px-4 py-3 text-theme-faint font-medium text-xs">
                                    <button onClick={() => handleSort("price")} className="flex items-center gap-1.5 hover:text-theme-soft transition-colors">
                                        السعر <SortIcon col="price" />
                                    </button>
                                </th>
                                <th className="text-right px-4 py-3 text-theme-faint font-medium text-xs">
                                    <button onClick={() => handleSort("stock_quantity")} className="flex items-center gap-1.5 hover:text-theme-soft transition-colors">
                                        المخزون <SortIcon col="stock_quantity" />
                                    </button>
                                </th>
                                <th className="text-center px-3 py-3 text-theme-faint font-medium text-xs">SKU</th>
                                <th className="text-center px-3 py-3 text-theme-faint font-medium text-xs">
                                    <button onClick={() => handleSort("sold")} className="flex items-center gap-1.5 justify-center hover:text-theme-soft transition-colors">
                                        المباع <SortIcon col="sold" />
                                    </button>
                                </th>
                                <th className="text-center px-3 py-3 text-theme-faint font-medium text-xs">متوفر</th>
                                <th className="text-center px-3 py-3 text-theme-faint font-medium text-xs">مميز</th>
                                <th className="text-right px-4 py-3 text-theme-faint font-medium text-xs">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.length > 0 ? filteredProducts.map((product: any) => {
                                const productSkus = getProductSkus(product.id);
                                const firstSku = productSkus[0];
                                return (
                                    <tr key={product.id} className={`border-b border-theme-faint transition-colors ${selectedIds.has(product.id) ? "bg-gold/[0.03]" : "hover:bg-theme-faint"}`}>
                                        {/* Checkbox */}
                                        <td className="w-10 px-3 py-3">
                                            <button onClick={() => toggleOne(product.id)} className="p-1 rounded hover:bg-theme-subtle transition-colors">
                                                {selectedIds.has(product.id)
                                                    ? <CheckSquare className="w-4 h-4 text-gold" />
                                                    : <Square className="w-4 h-4 text-theme-faint" />}
                                            </button>
                                        </td>
                                        {/* Product */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-theme-subtle overflow-hidden shrink-0 relative">
                                                    {product.image_url && (
                                                        <Image src={product.image_url} alt="" fill className="object-cover" sizes="40px" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-medium text-theme-strong truncate block max-w-[180px]">{product.title}</span>
                                                    {product.product_code && (
                                                        <span className="text-[9px] font-mono text-gold/70" dir="ltr">{product.product_code}</span>
                                                    )}
                                                    {product.sizes?.length > 0 && (
                                                        <span className="text-[10px] text-theme-faint">{product.sizes.join(" · ")}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        {/* Artist */}
                                        <td className="px-4 py-3 text-theme-subtle text-xs">{product.store_name || product.artist?.display_name || "—"}</td>
                                        {/* Type */}
                                        <td className="px-4 py-3">
                                            <span className="text-[10px] bg-theme-subtle px-2 py-1 rounded-lg text-theme-subtle">{typeLabels[product.type] || product.type}</span>
                                        </td>
                                        {/* Price */}
                                        <td className="px-4 py-3">
                                            {inlineEditing?.id === product.id && inlineEditing?.field === "price" ? (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <input 
                                                        type="number" min="0" step="0.01" autoFocus
                                                        value={inlineEditing?.value || ""}
                                                        onChange={(e) => setInlineEditing(prev => prev ? { ...prev, value: e.target.value } : null)}
                                                        onKeyDown={(e) => { if (e.key === "Enter") handleInlineSave(product); if (e.key === "Escape") setInlineEditing(null); }}
                                                        className="w-16 text-left text-xs font-bold bg-theme-subtle border border-gold/30 rounded py-1 px-1.5 text-gold focus:outline-none"
                                                    />
                                                    <button onClick={() => handleInlineSave(product)} disabled={inlineSaving} className="text-emerald-400 hover:text-emerald-300">
                                                        {inlineSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setInlineEditing({ id: product.id, field: "price", value: product.price?.toString() || "0" })}
                                                    className="font-bold text-gold text-xs hover:bg-gold/10 px-2 py-1 rounded transition-colors group flex items-center justify-end gap-1 w-full text-right">
                                                    {Number(product.price).toLocaleString()} ر.س
                                                    <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-theme-subtle" />
                                                </button>
                                            )}
                                        </td>
                                        {/* Stock */}
                                        <td className="px-4 py-3">
                                            {inlineEditing?.id === product.id && inlineEditing?.field === "stock_quantity" ? (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <input 
                                                        type="number" min="0" step="1" autoFocus
                                                        value={inlineEditing?.value || ""}
                                                        placeholder="∞"
                                                        onChange={(e) => setInlineEditing(prev => prev ? { ...prev, value: e.target.value } : null)}
                                                        onKeyDown={(e) => { if (e.key === "Enter") handleInlineSave(product); if (e.key === "Escape") setInlineEditing(null); }}
                                                        className="w-12 text-center text-xs font-mono bg-theme-subtle border border-gold/30 rounded py-1 text-theme focus:outline-none"
                                                    />
                                                    <button onClick={() => handleInlineSave(product)} disabled={inlineSaving} className="text-emerald-400 hover:text-emerald-300">
                                                        {inlineSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setInlineEditing({ id: product.id, field: "stock_quantity", value: product.stock_quantity?.toString() || "" })}
                                                    className={`font-mono text-xs w-full text-right flex items-center justify-end gap-1 hover:bg-theme-subtle px-2 py-1 rounded transition-colors group ${product.stock_quantity != null && product.stock_quantity <= 5 ? "text-amber-400 font-bold" : "text-theme-soft"}`}>
                                                    {product.stock_quantity == null ? "∞" : product.stock_quantity}
                                                    <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-theme-subtle" />
                                                </button>
                                            )}
                                        </td>
                                        {/* SKU / Barcode */}
                                        <td className="px-3 py-3 text-center">
                                            {firstSku ? (
                                                <button onClick={() => setBarcodeProductId(product.id)} className="group flex flex-col items-center gap-0.5" title="عرض الباركود">
                                                    <QrCode className="w-4 h-4 text-theme-faint group-hover:text-gold transition-colors" />
                                                    <span className="text-[9px] font-mono text-theme-faint group-hover:text-gold/60 transition-colors">
                                                        {productSkus.length} SKU
                                                    </span>
                                                </button>
                                            ) : (
                                                <button onClick={() => setBarcodeProductId(product.id)}
                                                    className="p-1.5 rounded-lg text-theme-faint hover:text-gold hover:bg-gold/10 transition-all" title="إنشاء SKU">
                                                    <QrCode className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                        {/* Sold Count */}
                                        <td className="px-3 py-3 text-center">
                                            <span className={`text-xs font-bold font-mono ${(salesMap[product.id] || 0) > 0 ? 'text-purple-400' : 'text-theme-faint'}`}>
                                                {salesMap[product.id] || 0}
                                            </span>
                                        </td>
                                        {/* In Stock */}
                                        <td className="px-3 py-3 text-center">
                                            <button onClick={() => handleToggle(product.id, "in_stock", product.in_stock)}
                                                disabled={loadingId === product.id}
                                                className="p-1.5 rounded-lg hover:bg-theme-subtle transition-colors disabled:opacity-50">
                                                {product.in_stock
                                                    ? <CheckCircle className="w-4 h-4 text-green-400" />
                                                    : <XCircle className="w-4 h-4 text-red-400/50" />}
                                            </button>
                                        </td>
                                        {/* Featured */}
                                        <td className="px-3 py-3 text-center">
                                            <button onClick={() => handleToggle(product.id, "is_featured", product.is_featured)}
                                                disabled={loadingId === product.id}
                                                className="p-1.5 rounded-lg hover:bg-theme-subtle transition-colors disabled:opacity-50">
                                                {product.is_featured
                                                    ? <Star className="w-4 h-4 text-gold fill-gold" />
                                                    : <StarOff className="w-4 h-4 text-theme-faint" />}
                                            </button>
                                        </td>
                                        {/* Actions */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 justify-end">
                                                <button onClick={() => { setEditingProduct(product); setError(null); }}
                                                    className="p-2 rounded-lg text-theme-subtle hover:text-gold hover:bg-gold/10 transition-all" title="تعديل">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                {confirmDeleteId === product.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => confirmDelete(product.id)}
                                                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all">
                                                            تأكيد
                                                        </button>
                                                        <button onClick={() => setConfirmDeleteId(null)}
                                                            className="px-2 py-1 rounded-lg text-[10px] text-theme-subtle hover:bg-theme-subtle transition-all">
                                                            إلغاء
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setConfirmDeleteId(product.id)}
                                                        disabled={loadingId === product.id}
                                                        className="p-2 rounded-lg text-theme-subtle hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50" title="حذف">
                                                        {loadingId === product.id
                                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            : <Trash2 className="w-3.5 h-3.5" />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={11} className="text-center py-16 text-theme-faint">
                                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">{searchQuery ? "لا توجد نتائج للبحث" : "لا توجد منتجات"}</p>
                                        {!searchQuery && (
                                            <button onClick={() => setShowAddModal(true)} className="mt-3 text-gold hover:text-gold-light text-sm font-medium">
                                                إضافة أول منتج
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── Pagination ─── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    {[...Array(totalPages)].map((_, i) => (
                        <Link key={i}
                            href={`${basePath}?page=${i + 1}${currentType !== "all" ? `&type=${currentType}` : ""}${basePath.includes("products-inventory") ? "&tab=products" : ""}`}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${currentPage === i + 1 ? "bg-gold text-[var(--wusha-bg)]" : "text-theme-faint hover:bg-theme-subtle"}`}>
                            {i + 1}
                        </Link>
                    ))}
                </div>
            )}

            {/* ─── Barcode Modal ─── */}
            <AnimatePresence>
                {barcodeProductId && (
                    <BarcodeModal
                        product={products.find((p) => p.id === barcodeProductId)}
                        skus={getProductSkus(barcodeProductId)}
                        onClose={() => setBarcodeProductId(null)}
                        onCreated={() => { showToast("تم إنشاء SKU ✓"); router.refresh(); }}
                        onError={(msg) => setError(msg)}
                    />
                )}
            </AnimatePresence>

            {/* ─── Add Modal ─── */}
            <ProductFormModal
                open={showAddModal} mode="add" artists={artists} categories={categories}
                skus={[]}
                skuInventoryTotals={skuInventoryTotals}
                onClose={() => setShowAddModal(false)}
                onSuccess={() => { setShowAddModal(false); showToast("تم إضافة المنتج ✓"); router.refresh(); }}
                onError={(msg) => setError(msg)}
            />

            {/* ─── Edit Modal ─── */}
            <ProductFormModal
                open={!!editingProduct} mode="edit" product={editingProduct} artists={artists} categories={categories}
                skus={editingProduct ? getProductSkus(editingProduct.id) : []}
                skuInventoryTotals={skuInventoryTotals}
                onClose={() => setEditingProduct(null)}
                onSuccess={() => { setEditingProduct(null); showToast("تم تحديث المنتج ✓"); router.refresh(); }}
                onError={(msg) => setError(msg)}
            />

            <AnimatePresence>
                {bulkDeleteRequested && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--wusha-bg)_68%,transparent)] p-4 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 16 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 16 }}
                            className="theme-surface-panel w-full max-w-sm rounded-2xl p-6 shadow-2xl"
                        >
                            <p className="text-xs uppercase tracking-[0.24em] text-theme-faint">Bulk Delete</p>
                            <h3 className="mt-2 text-lg font-bold text-theme">حذف المنتجات المحددة</h3>
                            <p className="mt-3 text-sm leading-relaxed text-theme-subtle">
                                سيتم حذف {selectedIds.size} منتجًا من القائمة الحالية.
                            </p>
                            <div className="mt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setBulkDeleteRequested(false)}
                                    disabled={bulkLoading}
                                    className="flex-1 rounded-xl border border-theme-subtle bg-theme-faint px-4 py-2.5 text-sm font-bold text-theme-subtle transition-colors hover:bg-theme-subtle hover:text-theme disabled:opacity-40"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    onClick={bulkDelete}
                                    disabled={bulkLoading}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-40"
                                >
                                    {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    حذف المحدد
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
//  Barcode Modal — عرض وإنشاء وطباعة الباركود
// ═══════════════════════════════════════════════════════════

function BarcodeModal({ product, skus, onClose, onCreated, onError }: {
    product: any; skus: any[]; onClose: () => void; onCreated: () => void; onError?: (msg: string) => void;
}) {
    const [loading, setLoading] = useState(false);
    const [codeType, setCodeType] = useState<"barcode" | "qr">("barcode");
    const [batchCount, setBatchCount] = useState("");
    const [batchPrinting, setBatchPrinting] = useState(false);
    const [savingSkuId, setSavingSkuId] = useState<string | null>(null);
    const [selectedSkuId, setSelectedSkuId] = useState<string | null>(skus[0]?.id ?? null);
    const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
    const [editSkuValue, setEditSkuValue] = useState("");
    const [editSize, setEditSize] = useState("");
    const [editColorCode, setEditColorCode] = useState("");
    const printRef = useRef<HTMLDivElement>(null);

    // For manual creation
    const [size, setSize] = useState("");
    const [colorCode, setColorCode] = useState("");
    const [customSku, setCustomSku] = useState("");
    const [initialQuantity, setInitialQuantity] = useState("");
    const sku = skus.find((item) => item.id === selectedSkuId) || skus[0] || null;

    const syncProductSizesFromSkus = async (rows: ProductSkuRow[]) => {
        const activeSizes = uniqueSizes(
            rows
                .filter((row) => row && row.is_active !== false && row.size)
                .map((row) => row.size as string)
        );
        const result = await updateProduct(product.id, {
            sizes: activeSizes.length > 0 ? activeSizes : null,
        });
        return result.success ? null : (result.error || "فشل مزامنة مقاسات المنتج مع SKU");
    };

    useEffect(() => {
        if (!skus.some((item) => item.id === selectedSkuId)) {
            setSelectedSkuId(skus[0]?.id ?? null);
        }
    }, [selectedSkuId, skus]);

    const handleCreate = async () => {
        setLoading(true);
        const result = await createSKU({
            product_id: product.id,
            sku: customSku.trim() || undefined,
            size: size || null,
            color_code: colorCode || null,
            initial_quantity: initialQuantity ? parseInt(initialQuantity, 10) : undefined,
        });
        setLoading(false);
        if (result.error) {
            onError?.(result.error);
            return;
        }
        const syncError = await syncProductSizesFromSkus([...skus, result.sku as ProductSkuRow].filter(Boolean));
        if (syncError) {
            onError?.(syncError);
            return;
        }
        setSize("");
        setColorCode("");
        setCustomSku("");
        setInitialQuantity("");
        onCreated();
    };

    const startEditSku = (row: any) => {
        setEditingSkuId(row.id);
        setEditSkuValue(row.sku || "");
        setEditSize(row.size || "");
        setEditColorCode(row.color_code || "");
    };

    const cancelEditSku = () => {
        setEditingSkuId(null);
        setEditSkuValue("");
        setEditSize("");
        setEditColorCode("");
    };

    const handleSaveSku = async () => {
        if (!editingSkuId) return;
        setSavingSkuId(editingSkuId);
        const result = await updateSKU({
            id: editingSkuId,
            sku: editSkuValue,
            size: editSize || null,
            color_code: editColorCode || null,
        });
        setSavingSkuId(null);
        if (result.error) {
            onError?.(result.error);
            return;
        }
        const syncError = await syncProductSizesFromSkus(
            skus.map((row) => row.id === editingSkuId ? result.sku as ProductSkuRow : row)
        );
        if (syncError) {
            onError?.(syncError);
            return;
        }
        cancelEditSku();
        onCreated();
    };

    const handlePrint = () => {
        const win = window.open("", "_blank", "width=400,height=400");
        if (!win) return;
        win.document.write(`
            <!DOCTYPE html>
            <html dir="rtl"><head><title>ملصق المنتجات — ${sku?.sku || ""}</title>
            <style>
                body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: #fff; width: 100%; height: 100%; font-family: system-ui, Tahoma, sans-serif; }
                .label-container { width: 50mm; height: 30mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-sizing: border-box; padding: 2mm; overflow: hidden; page-break-after: always; }
                @media print {
                    @page { size: 50mm 30mm; margin: 0; }
                    body { width: 50mm; height: 30mm; }
                    .label-container { border: none; }
                }
            </style></head><body>
            <div class="label-container" id="print-area"></div>
            </body></html>
        `);
        win.document.close();

        // Copy the react-rendered SVG into the print window
        setTimeout(() => {
            const sourceDiv = printRef.current;
            const targetDiv = win.document.getElementById('print-area');
            if (sourceDiv && targetDiv) {
                targetDiv.innerHTML = sourceDiv.innerHTML;
            }
            win.focus();
            win.print();
        }, 500);
    };

    const handleBatchPrint = async () => {
        if (!sku?.id) return;
        const count = parseInt(batchCount, 10);
        if (isNaN(count) || count < 1 || count > 999) {
            onError?.("أدخل عدداً بين 1 و 999");
            return;
        }
        setBatchPrinting(true);
        const result = await getUnitSerials(sku.id, count);
        setBatchPrinting(false);
        if ("error" in result) {
            onError?.(result.error);
            return;
        }
        const codes = result.codes;
        if (!codes.length) return;

        const win = window.open("", "_blank", "width=500,height=600");
        if (!win) return;
        const labelsHtml = codes.map((code) => `
            <div class="label-container" data-code="${String(code).replace(/"/g, "&quot;")}" style="width:50mm;height:30mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;box-sizing:border-box;padding:2mm;overflow:hidden;page-break-after:always;border:1px dashed #ccc;">
                <div style="font-size:8px;font-weight:bold;margin-bottom:2px;color:#000;">${(product?.title || "").replace(/</g, "&lt;")}</div>
                <div style="font-size:7px;margin-bottom:2px;color:#000;font-family:monospace;">${String(code).replace(/</g, "&lt;")}</div>
                <svg></svg>
            </div>
        `).join("");
        win.document.write(`
            <!DOCTYPE html><html dir="rtl"><head><title>ملصقات — ${count} قطعة</title>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
            <style>body{margin:0;padding:8px;background:#fff;font-family:Tahoma,sans-serif}@media print{body{padding:0}.label-container{border:none!important}}</style>
            </head><body>${labelsHtml}
            <script>
                document.querySelectorAll('.label-container').forEach(function(el){
                    var svg=el.querySelector('svg');
                    var code=el.getAttribute('data-code');
                    if(svg&&code){JsBarcode(svg,code,{format:"CODE128",width:1.2,height:25,displayValue:true,fontSize:10});}
                });
                setTimeout(function(){window.print();},300);
            <\/script></body></html>
        `);
        win.document.close();
    };

    if (!product) return null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--wusha-bg)_60%,transparent)] backdrop-blur-sm"
            onClick={onClose}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="theme-surface-panel styled-scrollbar w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-theme flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-gold" />
                        إدارة SKU والألوان
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-theme-subtle text-theme-subtle"><X className="w-5 h-5" /></button>
                </div>

                {/* Product Info */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-theme-subtle border border-theme-subtle">
                    {product.image_url && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 relative">
                            <Image src={product.image_url} alt="" fill className="object-cover" sizes="48px" />
                        </div>
                    )}
                    <div>
                        <p className="font-medium text-theme-strong text-sm">{product.title}</p>
                        <p className="text-xs text-gold font-bold">{Number(product.price).toLocaleString()} ر.س</p>
                    </div>
                </div>

                {/* Add SKU */}
                <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold text-theme">إضافة مقاس/لون</p>
                            <p className="mt-0.5 text-[10px] text-theme-subtle">كل صف هنا يظهر للعميل كلون أو مقاس قابل للاختيار في المتجر.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
                        <input type="text" value={size} onChange={e => setSize(e.target.value)}
                            placeholder="المقاس: XL"
                            className="input-dark rounded-xl px-4 py-2 text-sm" />
                        <input type="number" min="0" value={initialQuantity} onChange={e => setInitialQuantity(e.target.value)}
                            placeholder="كمية ابتدائية"
                            className="input-dark rounded-xl px-4 py-2 text-sm" dir="ltr" />
                        <button onClick={handleCreate} disabled={loading}
                            className="rounded-xl bg-gold px-4 py-2 text-sm font-bold text-[var(--wusha-bg)] transition-colors hover:bg-gold-light disabled:opacity-50">
                            {loading ? <Loader2 className="mx-auto w-4 h-4 animate-spin" /> : "إضافة SKU"}
                        </button>
                    </div>
                    <div className="mt-3">
                        <ColorPaletteField value={colorCode} onChange={setColorCode} label="لون SKU" />
                    </div>
                    <input type="text" value={customSku}
                        onChange={(e) => setCustomSku(e.target.value)} dir="ltr"
                        placeholder="SKU مخصص اختياري، اتركه فارغاً للتوليد التلقائي"
                        className="mt-3 w-full rounded-xl border border-gold/20 bg-gold/10 px-4 py-2.5 text-sm font-mono tracking-wider text-gold focus:outline-none focus:border-gold/40 placeholder:text-gold/35" />
                </div>

                {/* Existing SKUs */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-theme-faint tracking-widest uppercase">SKU Variants</p>
                        <span className="rounded-full border border-theme-subtle bg-theme-faint px-2 py-0.5 text-[10px] text-theme-subtle">{skus.length} متغير</span>
                    </div>
                    {skus.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-theme-subtle p-4 text-center text-xs text-theme-subtle">
                            لا توجد SKUs لهذا المنتج بعد. أضف مقاساً/لوناً من النموذج أعلاه.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {skus.map((row) => {
                                const isEditing = editingSkuId === row.id;
                                const isSelected = sku?.id === row.id;
                                return (
                                    <div key={row.id} className={`rounded-xl border p-3 ${isSelected ? "border-gold/30 bg-gold/5" : "border-theme-subtle bg-theme-faint"}`}>
                                        {isEditing ? (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr_0.8fr_auto_auto]">
                                                    <input value={editSkuValue} onChange={(e) => setEditSkuValue(e.target.value)} className="input-dark rounded-lg px-3 py-2 text-xs font-mono" dir="ltr" />
                                                    <input value={editSize} onChange={(e) => setEditSize(e.target.value)} className="input-dark rounded-lg px-3 py-2 text-xs" placeholder="المقاس" />
                                                    <button onClick={handleSaveSku} disabled={savingSkuId === row.id} className="rounded-lg bg-gold px-3 py-2 text-xs font-bold text-[var(--wusha-bg)] disabled:opacity-50">
                                                        {savingSkuId === row.id ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : "حفظ"}
                                                    </button>
                                                    <button onClick={cancelEditSku} className="rounded-lg border border-theme-subtle px-3 py-2 text-xs text-theme-subtle hover:bg-theme-subtle">إلغاء</button>
                                                </div>
                                                <ColorPaletteField value={editColorCode} onChange={setEditColorCode} label="لون SKU" compact />
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-mono font-bold text-theme" dir="ltr">{row.sku}</p>
                                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                        <span className="rounded-md border border-theme-subtle bg-theme-subtle px-2 py-0.5 text-[10px] text-theme-subtle">المقاس: {row.size || "—"}</span>
                                                        {row.color_code ? (
                                                            <span className="inline-flex items-center gap-1.5 rounded-md border border-theme-subtle bg-theme-subtle px-2 py-0.5 text-[10px] font-mono text-theme-subtle">
                                                                <span className="h-3 w-3 rounded-full border border-theme-soft" style={{ backgroundColor: row.color_code }} aria-hidden />
                                                                {row.color_code}
                                                            </span>
                                                        ) : (
                                                            <span className="rounded-md border border-theme-subtle bg-theme-subtle px-2 py-0.5 text-[10px] text-theme-subtle">بدون لون</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 gap-2">
                                                    <button onClick={() => setSelectedSkuId(row.id)} className="rounded-lg border border-theme-subtle px-3 py-2 text-xs text-theme-subtle hover:border-gold/30 hover:text-gold">معاينة</button>
                                                    <button onClick={() => startEditSku(row)} className="rounded-lg bg-gold/10 px-3 py-2 text-xs font-bold text-gold hover:bg-gold/20">تعديل</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {sku && (
                    <div className="space-y-4 border-t border-theme-faint pt-4">
                        <div className="flex gap-2">
                            <button onClick={() => setCodeType("barcode")}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors border ${codeType === "barcode" ? "bg-gold/10 text-gold border-gold/30" : "bg-theme-faint border-theme-subtle text-theme-subtle"}`}>
                                Code 128
                            </button>
                            <button onClick={() => setCodeType("qr")}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors border ${codeType === "qr" ? "bg-gold/10 text-gold border-gold/30" : "bg-theme-faint border-theme-subtle text-theme-subtle"}`}>
                                QR Code
                            </button>
                        </div>

                        <div className="bg-white text-black p-4 rounded-xl flex flex-col items-center w-[50mm] min-h-[30mm] transform scale-[1.1] origin-top mx-auto pointer-events-none my-2 shadow-inner">
                            <div className="text-[8px] font-bold mb-[2px] text-center w-full truncate relative z-10">{product?.title || 'WASHA Product'}</div>
                            {(sku.size || sku.color_code) && (
                                <div className="text-[7px] mb-[2px] text-center w-full relative z-10">
                                    {sku.size ? `Size: ${sku.size} ` : ''}{sku.color_code ? `Color: ${sku.color_code}` : ''}
                                </div>
                            )}
                            <div className="flex-1 flex items-center justify-center mt-1 relative z-10">
                                {codeType === "barcode"
                                    ? <Barcode value={sku.sku} format="CODE128" width={1.2} height={30} displayValue={true} fontSize={10} background="transparent" margin={0} />
                                    : <div className="flex flex-col items-center gap-1"><QRCodeSVG value={sku.sku} size={64} level="M" /><span className="text-[8px] font-mono tracking-widest mt-1">{sku.sku}</span></div>}
                            </div>
                        </div>

                        <div className="hidden">
                            <div ref={printRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '50mm', height: '30mm', overflow: 'hidden', backgroundColor: 'white' }}>
                                <div style={{ fontSize: '8px', fontWeight: 'bold', marginBottom: '2px', textAlign: 'center', whiteSpace: 'nowrap', width: '100%', textOverflow: 'ellipsis', overflow: 'hidden', color: 'black' }}>{product?.title || 'WASHA Product'}</div>
                                {(sku.size || sku.color_code) && <div style={{ fontSize: '7px', marginBottom: '2px', color: 'black' }}>{sku.size ? `Size: ${sku.size} ` : ''}{sku.color_code ? `Color: ${sku.color_code}` : ''}</div>}
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {codeType === "barcode"
                                        ? <Barcode value={sku.sku} format="CODE128" width={1.2} height={30} displayValue={true} fontSize={10} background="transparent" margin={0} />
                                        : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><QRCodeSVG value={sku.sku} size={64} level="M" /><span style={{ fontSize: '8px', fontFamily: 'monospace', letterSpacing: '2px', marginTop: '4px', color: 'black' }}>{sku.sku}</span></div>}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                            <div className="flex gap-3">
                                <button onClick={handlePrint}
                                    className="flex-1 py-2.5 rounded-xl bg-gold/10 text-gold font-bold flex items-center justify-center gap-2 hover:bg-gold/20 transition-all text-sm">
                                    <Printer className="w-4 h-4" /> طباعة ملصق
                                </button>
                                <button onClick={() => { navigator.clipboard.writeText(sku.sku); }}
                                    className="py-2.5 px-4 rounded-xl bg-theme-faint text-theme-soft hover:bg-theme-subtle transition-all text-sm border border-theme-subtle">
                                    نسخ
                                </button>
                            </div>
                            <div className="flex gap-2 items-center border-t border-theme-faint pt-3">
                                <span className="text-xs text-theme-soft shrink-0">طباعة مجموعة:</span>
                                <input type="number" min={1} max={999} placeholder="عدد الملصقات"
                                    value={batchCount} onChange={(e) => setBatchCount(e.target.value)}
                                    className="input-dark w-24 rounded-lg px-2 py-1.5 text-sm" />
                                <button onClick={handleBatchPrint} disabled={batchPrinting}
                                    className="py-1.5 px-4 rounded-lg bg-gold/10 text-gold text-sm font-medium hover:bg-gold/20 disabled:opacity-50 flex items-center gap-1">
                                    {batchPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                                    طباعة
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════
//  Product Form Modal — إضافة / تعديل
// ═══════════════════════════════════════════════════════════

function ProductFormModal({
    open, mode, product, artists, categories = [], skus = [], skuInventoryTotals = {}, onClose, onSuccess, onError,
}: {
    open: boolean; mode: "add" | "edit"; product?: any;
    artists: { id: string; display_name: string; username: string }[];
    categories?: { id: string; name_ar: string; name_en: string; slug: string }[];
    skus?: ProductSkuRow[];
    skuInventoryTotals?: Record<string, number>;
    onClose: () => void; onSuccess: () => void; onError: (msg: string) => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const extraFileInputRef = useRef<HTMLInputElement>(null);
    const colorImageInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [pendingColorImage, setPendingColorImage] = useState<string | null>(null);
    const [colorImageFiles, setColorImageFiles] = useState<Record<string, File>>({});
    const [colorImagePreviews, setColorImagePreviews] = useState<Record<string, string>>({});
    const [colorImageUrls, setColorImageUrls] = useState<Record<string, string | null>>({});
    const [variantQuantities, setVariantQuantities] = useState<VariantQuantityMap>({});
    // ─── Multi-image state
    const [extraFiles, setExtraFiles] = useState<File[]>([]);
    const [extraPreviews, setExtraPreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [form, setForm] = useState({
        artist_id: "", title: "", description: "", type: "print", price: "",
        image_url: "", in_stock: true, stock_quantity: "", store_name: "", sizes: "", colors: "",
    });

    useEffect(() => {
        if (!open) return;
        setUploadFile(null);
        setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
        setExtraFiles([]);
        setExtraPreviews((prev) => { prev.forEach((u) => URL.revokeObjectURL(u)); return []; });
        setPendingColorImage(null);
        setColorImageFiles({});
        setColorImagePreviews((prev) => { Object.values(prev).forEach((u) => URL.revokeObjectURL(u)); return {}; });
        setVariantQuantities({});
        if (mode === "edit" && product) {
            const activeSkuColors = uniqueColors(
                skus
                    .filter((sku) => sku.is_active !== false && sku.color_code)
                    .map((sku) => sku.color_code as string)
            );
            const activeSkuColorImages: Record<string, string | null> = {};
            skus
                .filter((sku) => sku.is_active !== false && sku.color_code)
                .forEach((sku) => {
                    const color = normalizeColorToken(sku.color_code || "");
                    if (color && sku.color_image_url && !activeSkuColorImages[color]) {
                        activeSkuColorImages[color] = sku.color_image_url;
                    }
                });
            const activeSkuSizes = uniqueSizes([
                ...(Array.isArray(product.sizes) ? product.sizes : []),
                ...skus
                    .filter((sku) => sku.is_active !== false && sku.size)
                    .map((sku) => sku.size as string),
            ]);
            setForm({
                artist_id: product.artist_id || "", title: product.title || "",
                description: product.description || "", type: product.type || "print",
                price: String(product.price ?? ""), image_url: product.image_url || "",
                in_stock: product.in_stock ?? true,
                stock_quantity: product.stock_quantity != null ? String(product.stock_quantity) : "",
                store_name: product.store_name || "",
                sizes: activeSkuSizes.join(", "),
                colors: activeSkuColors.join(", "),
            });
            setColorImageUrls(activeSkuColorImages);
            setExistingImages(product.images || []);
        } else if (mode === "add") {
            setForm({
                artist_id: artists[0]?.id || "", title: "", description: "", type: "print",
                price: "", image_url: "", in_stock: true, stock_quantity: "",
                store_name: "WASHA.SHOP", sizes: "", colors: "",
            });
            setColorImageUrls({});
            setExistingImages([]);
        }
    }, [open, mode, product?.id, artists, skus]);

    useEffect(() => {
        if (!open) return;
        const sizes = parseSizeList(form.sizes);
        const colors = parseColorList(form.colors);
        setVariantQuantities((current) => sanitizeVariantQuantities(current, sizes, colors));
    }, [form.sizes, form.colors, open]);



    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f && f.size <= 5 * 1024 * 1024 && /^image\/(jpeg|png|webp|gif)$/.test(f.type)) {
            setPreviewUrl((p) => { if (p) URL.revokeObjectURL(p); return URL.createObjectURL(f); });
            setUploadFile(f);
        } else if (f) {
            queueMicrotask(() => onError("الملف غير مدعوم أو أكبر من 5 ميجابايت"));
        }
        e.target.value = "";
    };

    const handleExtraFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const maxExtra = 8 - existingImages.length - extraFiles.length;
        const valid = files.filter((f) => f.size <= 5 * 1024 * 1024 && /^image\/(jpeg|png|webp|gif)$/.test(f.type)).slice(0, Math.max(0, maxExtra));
        if (valid.length < files.length) queueMicrotask(() => onError("بعض الملفات تم تجاهلها (حد 8 صور إضافية، أو حجم أكبر من 5MB)"));
        if (valid.length > 0) {
            setExtraFiles((prev) => [...prev, ...valid]);
            setExtraPreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);
        }
        e.target.value = "";
    };

    const handleColorImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const color = pendingColorImage;
        const file = e.target.files?.[0] || null;
        if (!color || !file) {
            e.target.value = "";
            return;
        }
        if (!(file.size <= 5 * 1024 * 1024 && /^image\/(jpeg|png|webp|gif)$/.test(file.type))) {
            queueMicrotask(() => onError("صورة اللون غير مدعومة أو أكبر من 5 ميجابايت"));
            e.target.value = "";
            return;
        }
        setColorImageFiles((prev) => ({ ...prev, [color]: file }));
        setColorImagePreviews((prev) => {
            if (prev[color]) URL.revokeObjectURL(prev[color]);
            return { ...prev, [color]: URL.createObjectURL(file) };
        });
        setPendingColorImage(null);
        e.target.value = "";
    };

    const requestColorImage = (color: string) => {
        setPendingColorImage(color);
        colorImageInputRef.current?.click();
    };

    const removeColorImage = (color: string) => {
        setColorImageFiles((prev) => {
            const next = { ...prev };
            delete next[color];
            return next;
        });
        setColorImagePreviews((prev) => {
            if (prev[color]) URL.revokeObjectURL(prev[color]);
            const next = { ...prev };
            delete next[color];
            return next;
        });
        setColorImageUrls((prev) => ({ ...prev, [color]: null }));
    };

    const removeExtraFile = (idx: number) => {
        setExtraFiles((prev) => prev.filter((_, i) => i !== idx));
        setExtraPreviews((prev) => { URL.revokeObjectURL(prev[idx]); return prev.filter((_, i) => i !== idx); });
    };

    const removeExistingImage = (idx: number) => {
        setExistingImages((prev) => prev.filter((_, i) => i !== idx));
    };

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const title = form.title.trim();
        const price = parseFloat(form.price);
        let imageUrl = form.image_url.trim();

        if (!title) { onError("الاسم مطلوب"); return; }
        if (mode === "add" && !form.artist_id) { onError("اختر الوشّاي"); return; }
        if (isNaN(price) || price < 0) { onError("السعر غير صالح"); return; }

        const parsedSizes = form.sizes ? parseSizeList(form.sizes) : undefined;
        const parsedColors = form.colors ? parseColorList(form.colors) : undefined;
        const variantInventoryQuantities = buildVariantQuantityPayload(variantQuantities, parsedSizes || [], parsedColors || []);
        const variantInventoryTotal = Object.values(variantInventoryQuantities).reduce((sum, quantity) => sum + quantity, 0);
        setLoading(true);
        onError("");

        if (uploadFile) {
            const fd = new FormData();
            fd.append("file", uploadFile);
            const uploadResult = await uploadProductImage(fd);
            if (!uploadResult.success) { setLoading(false); onError(uploadResult.error || "فشل رفع الصورة"); return; }
            imageUrl = uploadResult.url;
        }

        if (mode === "add" && !imageUrl) { setLoading(false); onError("ارفع صورة أو أدخل رابط الصورة"); return; }

        // Upload extra images
        const allImages = [...existingImages];
        for (const ef of extraFiles) {
            const fd = new FormData();
            fd.append("file", ef);
            const r = await uploadProductImage(fd);
            if (r.success) allImages.push(r.url);
        }

        const colorImages: Record<string, string | null> = {};
        for (const color of parsedColors || []) {
            if (colorImageFiles[color]) {
                const fd = new FormData();
                fd.append("file", colorImageFiles[color]);
                const uploadResult = await uploadProductImage(fd);
                if (!uploadResult.success) {
                    setLoading(false);
                    onError(uploadResult.error || `فشل رفع صورة اللون ${color}`);
                    return;
                }
                colorImages[color] = uploadResult.url;
            } else if (Object.prototype.hasOwnProperty.call(colorImageUrls, color)) {
                colorImages[color] = colorImageUrls[color] || null;
            }
        }

        if (mode === "add") {
            const result = await createProductAdmin({
                artist_id: form.artist_id, title, description: form.description || undefined,
                type: form.type, price, image_url: imageUrl, images: allImages, in_stock: form.in_stock,
                stock_quantity: variantInventoryTotal,
                store_name: form.store_name.trim() || undefined, sizes: parsedSizes, colors: parsedColors, colorImages, variantQuantities: variantInventoryQuantities,
            });
            setLoading(false);
            result.success ? onSuccess() : onError(result.error || "فشل الإضافة");
        } else {
            const result = await updateProduct(product.id, {
                title, description: form.description || null, type: form.type, price,
                image_url: imageUrl || product.image_url, images: allImages, artist_id: form.artist_id,
                in_stock: form.in_stock,
                sizes: parsedSizes && parsedSizes.length > 0 ? parsedSizes : null,
                store_name: form.store_name.trim() || null,
            });
            if (!result.success) {
                setLoading(false);
                onError(result.error || "فشل التحديث");
                return;
            }
            const syncResult = await syncProductVariantSkus({
                product_id: product.id,
                sizes: parsedSizes || [],
                colors: parsedColors || [],
                colorImages,
                variantQuantities: variantInventoryQuantities,
            });
            setLoading(false);
            syncResult.success ? onSuccess() : onError(syncResult.error || "فشل مزامنة المقاسات والألوان مع SKU");
        }
    };

    const isEdit = mode === "edit";
    const artistOptions = isEdit && product?.artist_id && !artists.find((a) => a.id === product.artist_id) && product.artist
        ? [...artists, { id: product.artist_id, display_name: product.artist.display_name || "—", username: product.artist.username || "" }]
        : artists;
    const selectedProductSizes = parseSizeList(form.sizes);
    const selectedProductColors = parseColorList(form.colors);
    const customProductColorValue = toColorInputValue(selectedProductColors[selectedProductColors.length - 1]);
    const setVariantQuantity = (key: string, value: string) => {
        const normalized = formatQuantityInput(value);
        setVariantQuantities((current) => ({ ...current, [key]: normalized }));
    };
    const fillVariantQuantities = (value: string) => {
        const normalized = String(parseVariantQuantity(value));
        const next: VariantQuantityMap = {};
        buildVariantMatrix(selectedProductSizes, selectedProductColors).forEach((variant) => {
            const sku = findSkuForVariant(skus, variant.size, variant.color);
            if (mode === "edit" && sku) return;
            next[variantMatrixKey(variant.size, variant.color)] = normalized;
        });
        setVariantQuantities((current) => ({ ...current, ...next }));
    };
    const clearVariantQuantities = () => {
        setVariantQuantities((current) => {
            const next = { ...current };
            buildVariantMatrix(selectedProductSizes, selectedProductColors).forEach((variant) => {
                const sku = findSkuForVariant(skus, variant.size, variant.color);
                if (mode === "edit" && sku) return;
                next[variantMatrixKey(variant.size, variant.color)] = "0";
            });
            return next;
        });
    };
    const toggleProductColor = (color: string) => {
        setForm((current) => ({ ...current, colors: toggleColorInFieldValue(current.colors, color) }));
    };
    const addProductColor = (color: string) => {
        setForm((current) => ({ ...current, colors: addColorToFieldValue(current.colors, color) }));
    };
    const removeProductColor = (color: string) => {
        setForm((current) => ({ ...current, colors: removeColorFromFieldValue(current.colors, color) }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--wusha-bg)_60%,transparent)] backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()}
                className="theme-surface-panel styled-scrollbar w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-theme-subtle sticky top-0 bg-[color:var(--wusha-surface)] z-10">
                    <h2 className="text-lg font-bold text-theme">{isEdit ? "تعديل المنتج" : "إضافة منتج جديد"}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-theme-subtle text-theme-subtle"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Artist Select */}
                    <div>
                        <label className="block text-xs font-medium text-theme-subtle mb-1.5">الوشّاي {!isEdit && "*"}</label>
                        <select value={form.artist_id}
                            onChange={(e) => setForm((f) => ({ ...f, artist_id: e.target.value }))}
                            className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                            required={!isEdit}>
                            {artistOptions.length === 0
                                ? <option value="">— لا يوجد وشّايون —</option>
                                : artistOptions.map((a) => <option key={a.id} value={a.id}>{a.display_name} (@{a.username})</option>)}
                        </select>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-xs font-medium text-theme-subtle mb-1.5">الاسم *</label>
                        <input type="text" value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="عنوان المنتج"
                            className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                            required />
                    </div>

                    {/* Type + Price */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-theme-subtle mb-1.5">النوع</label>
                            <select value={form.type}
                                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                                className="input-dark w-full rounded-xl px-4 py-2.5 text-sm">
                                {typeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-theme-subtle mb-1.5">السعر (ر.س) *</label>
                            <input type="number" min="0" step="0.01" value={form.price}
                                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                                placeholder="0"
                                className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                                required />
                        </div>
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-xs font-medium text-theme-subtle mb-1.5">صورة المنتج {!isEdit && "*"}</label>
                        <div className="space-y-2">
                            <div onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-gold/40"); }}
                                onDragLeave={(e) => { e.currentTarget.classList.remove("border-gold/40"); }}
                                onDrop={(e) => {
                                    e.preventDefault(); e.currentTarget.classList.remove("border-gold/40");
                                    const f = e.dataTransfer.files?.[0];
                                    if (f && f.size <= 5 * 1024 * 1024 && /^image\/(jpeg|png|webp|gif)$/.test(f.type)) {
                                        setUploadFile(f); setPreviewUrl(URL.createObjectURL(f));
                                    } else if (f) queueMicrotask(() => onError("الملف غير مدعوم أو أكبر من 5 ميجابايت"));
                                }}
                                className="border border-dashed border-theme-soft rounded-xl p-5 text-center cursor-pointer hover:border-gold/30 hover:bg-theme-faint transition-all">
                                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileSelect} className="hidden" />
                                {previewUrl ? (
                                    <div className="relative inline-block">
                                        <img src={previewUrl} alt="معاينة" className="max-h-28 rounded-lg object-contain" />
                                        <button type="button"
                                            onClick={(e) => { e.stopPropagation(); setUploadFile(null); setPreviewUrl((p) => { if (p) URL.revokeObjectURL(p); return null; }); }}
                                            className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-red-500/90 text-theme flex items-center justify-center text-xs hover:bg-red-500">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : isEdit && product?.image_url ? (
                                    <div className="relative inline-block">
                                        <img src={product.image_url} alt="الصورة الحالية" className="max-h-28 rounded-lg object-contain opacity-70" />
                                        <span className="absolute bottom-1 right-1 rounded bg-[color:rgba(15,15,15,0.42)] px-1.5 py-0.5 text-[9px] text-on-dark">انقر لتغيير</span>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-7 h-7 mx-auto mb-1.5 text-theme-faint" />
                                        <p className="text-sm text-theme-soft">اسحب الصورة هنا أو انقر للاختيار</p>
                                        <p className="text-[10px] text-theme-faint mt-1">JPG, PNG, WebP, GIF — حتى 5 ميجابايت</p>
                                    </>
                                )}
                            </div>
                            <p className="text-[10px] text-theme-subtle">أو أدخل رابط الصورة:</p>
                            <input type="url" value={form.image_url}
                                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                                placeholder="https://..."
                                className="input-dark w-full rounded-xl px-4 py-2.5 text-sm" dir="ltr" />
                        </div>
                    </div>

                    {/* ─── Extra Images Gallery ─── */}
                    <div>
                        <label className="block text-xs font-medium text-theme-subtle mb-1.5">
                            <span className="flex items-center gap-1.5"><ImagePlus className="w-3.5 h-3.5 text-gold" /> صور إضافية للمنتج</span>
                        </label>
                        <p className="text-[10px] text-theme-faint mb-2">أضف حتى 8 صور إضافية لعرضها كمعرض في صفحة المنتج</p>
                        {(existingImages.length > 0 || extraPreviews.length > 0) && (
                            <div className="grid grid-cols-4 gap-2 mb-2">
                                {existingImages.map((url, idx) => (
                                    <div key={`ex-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden bg-theme-subtle border border-theme-subtle">
                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => removeExistingImage(idx)}
                                            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {extraPreviews.map((url, idx) => (
                                    <div key={`new-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden bg-theme-subtle border border-dashed border-gold/20">
                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => removeExtraFile(idx)}
                                            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X className="w-3 h-3" />
                                        </button>
                                        <span className="absolute bottom-0.5 left-0.5 text-[8px] bg-emerald-500/80 text-white px-1 rounded font-bold">جديد</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {existingImages.length + extraFiles.length < 8 && (
                            <button type="button" onClick={() => extraFileInputRef.current?.click()}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-theme-soft text-theme-subtle hover:text-gold hover:border-gold/30 hover:bg-gold/5 transition-all text-xs">
                                <ImagePlus className="w-4 h-4" />
                                إضافة صور ({existingImages.length + extraFiles.length}/8)
                            </button>
                        )}
                        <input ref={extraFileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleExtraFilesSelect} className="hidden" />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-medium text-theme-subtle mb-1.5">الوصف</label>
                        <textarea value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            placeholder="وصف المنتج..." rows={2}
                            className="input-dark w-full rounded-xl px-4 py-2.5 text-sm resize-none" />
                    </div>

                    {/* Sizes */}
                    <SizePickerField
                        value={form.sizes}
                        onChange={(sizes) => setForm((f) => ({ ...f, sizes }))}
                        preferredGroupKey={sizeGroupForProductType(form.type)}
                        helperText={mode === "add"
                            ? "اختر المقاسات من اللوحة. عند الحفظ يتم إنشاء SKU لكل مقاس مختار مع الألوان المختارة."
                            : "تغيير المقاسات هنا يحدث شبكة SKU. كميات SKU الموجود تبقى محفوظة في الجرد."}
                    />

                    {/* Store Name */}
                    <div>
                        <label className="block text-xs font-medium text-theme-subtle mb-1.5">اسم المتجر</label>
                        <input type="text" value={form.store_name}
                            onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))}
                            placeholder="WASHA.SHOP"
                            className="input-dark w-full rounded-xl px-4 py-2.5 text-sm" dir="ltr" />
                    </div>

                    {/* Variant Colors */}
                    <div>
                        <label className="block text-xs font-medium text-theme-subtle mb-1.5">الألوان المتاحة</label>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                            {PRODUCT_COLOR_PALETTE.map((color) => {
                                const selected = selectedProductColors.some((item) => sameColor(item, color.hex));
                                return (
                                    <button
                                        key={color.hex}
                                        type="button"
                                        onClick={() => toggleProductColor(color.hex)}
                                        aria-pressed={selected}
                                        title={color.name}
                                        className={`flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[10px] transition-all active:scale-[0.98] ${selected
                                            ? "border-gold/60 bg-gold/10 text-gold"
                                            : "border-theme-subtle bg-theme-faint text-theme-subtle hover:border-gold/30 hover:text-theme"
                                            }`}
                                    >
                                        <span className={`h-5 w-5 rounded-full border ${selected ? "border-gold" : "border-theme-soft"}`} style={{ backgroundColor: color.hex }} aria-hidden />
                                        <span className="max-w-full truncate">{color.name}</span>
                                    </button>
                                );
                            })}
                            <label
                                title="لون مخصص"
                                className="relative flex min-h-[48px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-theme-subtle bg-theme-faint px-2 py-2 text-[10px] text-theme-subtle transition-all hover:border-gold/30 hover:text-theme active:scale-[0.98]"
                            >
                                <input
                                    type="color"
                                    value={customProductColorValue}
                                    onChange={(event) => addProductColor(event.target.value)}
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                    aria-label="إضافة لون مخصص"
                                />
                                <span className="h-5 w-5 rounded-full border border-theme-soft" style={{ backgroundColor: customProductColorValue }} aria-hidden />
                                <span>مخصص</span>
                            </label>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {selectedProductColors.length === 0 ? (
                                <span className="rounded-lg border border-dashed border-theme-subtle px-2 py-1 text-[10px] text-theme-faint">لم يتم اختيار ألوان</span>
                            ) : selectedProductColors.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => removeProductColor(color)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-theme-subtle bg-theme-faint px-2 py-1 text-[10px] font-mono text-theme-subtle transition-colors hover:border-red-400/30 hover:text-red-300"
                                    dir="ltr"
                                    title={`إزالة ${colorLabelFor(color)}`}
                                >
                                    <span className="h-3 w-3 rounded-full border border-theme-soft" style={{ backgroundColor: color }} aria-hidden />
                                    {color}
                                    <X className="h-3 w-3" />
                                </button>
                            ))}
                        </div>
                        <p className="mt-1.5 text-[10px] leading-5 text-theme-subtle">
                            {mode === "add"
                                ? "اختر لوناً أو أكثر من اللوحة. بعد ذلك أدخل الكمية لكل مقاس × لون في شبكة الكميات."
                                : "تعديل الألوان هنا يعيد بناء شبكة SKU للمنتج؛ الناقص يُنشأ، والخارج عن الشبكة يُعطل من المتجر دون حذف سجله."}
                        </p>
                    </div>

                    <input
                        ref={colorImageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleColorImageSelect}
                        className="hidden"
                    />
                    <ColorImagesManager
                        colors={selectedProductColors}
                        imageUrls={colorImageUrls}
                        previews={colorImagePreviews}
                        onPick={requestColorImage}
                        onRemove={removeColorImage}
                    />

                    <VariantMatrixPreview
                        sizes={selectedProductSizes}
                        colors={selectedProductColors}
                        skus={skus}
                        mode={mode}
                    />

                    <VariantInventoryPlanner
                        sizes={selectedProductSizes}
                        colors={selectedProductColors}
                        skus={skus}
                        quantities={variantQuantities}
                        skuInventoryTotals={skuInventoryTotals}
                        mode={mode}
                        onChange={setVariantQuantity}
                        onFillAll={fillVariantQuantities}
                        onClearAll={clearVariantQuantities}
                    />

                    {/* Stock Controls */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={form.in_stock}
                                onChange={(e) => setForm((f) => ({ ...f, in_stock: e.target.checked }))}
                                className="rounded border-theme-soft" />
                            <span className="text-sm text-theme-soft">متوفر للطلب</span>
                        </label>
                        {mode === "add" ? (
                            <div className="rounded-xl border border-theme-subtle bg-theme-faint px-3 py-2">
                                <p className="text-[10px] leading-5 text-theme-subtle">
                                    يتم احتساب مخزون المنتج من مجموع كميات المتغيرات أعلاه، وتُسجل كل كمية كحركة إضافة في الجرد.
                                </p>
                            </div>
                        ) : (
                            <div className="p-3 rounded-xl bg-gold/5 border border-gold/20">
                                <p className="text-xs text-gold font-medium">لتعديل الكمية أو الجرد</p>
                                <p className="text-[10px] text-theme-subtle mt-0.5">انتقل إلى تبويب «المخزون والجرد» لإضافة أو تعديل الكميات.</p>
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-theme-soft text-theme-soft hover:bg-theme-subtle transition-colors">
                            إلغاء
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-gold text-[var(--wusha-bg)] font-bold hover:bg-gold-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {isEdit ? "حفظ" : "إضافة"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
