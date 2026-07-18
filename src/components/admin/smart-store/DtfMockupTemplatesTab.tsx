"use client";

import {
    useCallback,
    useMemo,
    useState,
    type ComponentType,
    type FormEvent,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Layers, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
    cleanupDtfMockupDraftAssets,
    deleteDtfMockupTemplate,
    upsertDtfMockupTemplate,
} from "@/app/actions/smart-store";
import type { CustomDesignColor, CustomDesignGarment } from "@/types/database";
import type {
    DtfMockupPrintArea,
    DtfMockupSide,
    DtfMockupTemplate,
} from "@/lib/dtf-mockup-templates";
import type {
    SmartStoreImageUploaderProps,
} from "@/components/admin/smart-store/image-uploader.types";

type Props = {
    items: DtfMockupTemplate[];
    garments: CustomDesignGarment[];
    colors: CustomDesignColor[];
    onRefresh: () => void;
    ImageUploaderComponent: ComponentType<SmartStoreImageUploaderProps>;
};

type AreaPreset = {
    print_position: DtfMockupPrintArea["print_position"];
    print_size: DtfMockupPrintArea["print_size"];
    label: string;
    side: DtfMockupSide;
    rect: Pick<DtfMockupPrintArea, "x" | "y" | "width" | "height" | "physical_width_cm" | "physical_height_cm">;
};

const AREA_PRESETS: AreaPreset[] = [
    {
        print_position: "chest",
        print_size: "large",
        label: "صدر كبير",
        side: "front",
        rect: { x: 0.25, y: 0.24, width: 0.5, height: 0.46, physical_width_cm: 30, physical_height_cm: 36 },
    },
    {
        print_position: "chest",
        print_size: "small",
        label: "صدر صغير",
        side: "front",
        rect: { x: 0.38, y: 0.28, width: 0.24, height: 0.22, physical_width_cm: 12, physical_height_cm: 14 },
    },
    {
        print_position: "shoulder_right",
        print_size: "small",
        label: "شعار يمين",
        side: "front",
        rect: { x: 0.2, y: 0.25, width: 0.2, height: 0.18, physical_width_cm: 10, physical_height_cm: 10 },
    },
    {
        print_position: "shoulder_left",
        print_size: "small",
        label: "شعار يسار",
        side: "front",
        rect: { x: 0.6, y: 0.25, width: 0.2, height: 0.18, physical_width_cm: 10, physical_height_cm: 10 },
    },
    {
        print_position: "back",
        print_size: "large",
        label: "ظهر كبير",
        side: "back",
        rect: { x: 0.23, y: 0.2, width: 0.54, height: 0.56, physical_width_cm: 32, physical_height_cm: 40 },
    },
    {
        print_position: "back",
        print_size: "small",
        label: "ظهر صغير",
        side: "back",
        rect: { x: 0.37, y: 0.25, width: 0.26, height: 0.24, physical_width_cm: 14, physical_height_cm: 16 },
    },
];

const inputClass = "input-dark w-full rounded-xl px-4 py-2.5 text-sm";
const primaryButton = "inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-[var(--wusha-bg)] transition-all hover:shadow-lg hover:shadow-gold/20 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-theme-soft bg-theme-faint px-4 py-2.5 text-sm text-theme-soft transition-colors hover:bg-theme-subtle disabled:opacity-50";

function createArea(preset: AreaPreset): DtfMockupPrintArea {
    return {
        print_position: preset.print_position,
        print_size: preset.print_size,
        ...preset.rect,
        rotation: 0,
    };
}

function getDefaultAreas(side: DtfMockupSide) {
    const preset = AREA_PRESETS.find((candidate) => candidate.side === side);
    return preset ? [createArea(preset)] : [];
}

function getAreaKey(area: Pick<DtfMockupPrintArea, "print_position" | "print_size">) {
    return `${area.print_position}:${area.print_size}`;
}

function getAreaLabel(area: Pick<DtfMockupPrintArea, "print_position" | "print_size">) {
    return AREA_PRESETS.find((preset) => getAreaKey(preset) === getAreaKey(area))?.label
        ?? `${area.print_position} · ${area.print_size}`;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function roundNormalized(value: number) {
    return Math.round(value * 10000) / 10000;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-medium text-theme-soft">{label}</span>
            {children}
        </label>
    );
}

function Modal({
    open,
    title,
    onClose,
    children,
}: {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
}) {
    if (!open) return null;
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="إغلاق"
                onClick={onClose}
                className="fixed inset-0 bg-[color-mix(in_srgb,var(--wusha-bg)_65%,transparent)] backdrop-blur-sm"
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="theme-surface-panel relative z-10 max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-3xl p-5 shadow-2xl sm:p-7"
            >
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold text-gold">WASHA AI · Master Artwork</p>
                        <h3 className="mt-1 text-xl font-black text-theme">{title}</h3>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-xl p-2 text-theme-subtle hover:bg-theme-subtle">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {children}
            </div>
        </div>,
        document.body
    );
}

function CalibrationPreview({
    imageUrl,
    areas,
    selectedIndex,
    onSelect,
}: {
    imageUrl: string;
    areas: DtfMockupPrintArea[];
    selectedIndex: number;
    onSelect: (index: number) => void;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-theme-subtle bg-[radial-gradient(circle_at_center,rgba(201,168,106,0.08),transparent_65%)] p-3">
            <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-xl bg-black/20">
                {imageUrl ? (
                    <img src={imageUrl} alt="معايرة موكاب القطعة" className="block h-auto w-full" />
                ) : (
                    <div className="flex aspect-[4/5] items-center justify-center text-center text-sm text-theme-faint">
                        ارفع صورة الموكاب لبدء المعايرة البصرية
                    </div>
                )}
                {imageUrl ? areas.map((area, index) => (
                    <button
                        key={getAreaKey(area)}
                        type="button"
                        onClick={() => onSelect(index)}
                        className={`absolute flex items-center justify-center overflow-hidden border-2 transition-colors ${
                            index === selectedIndex
                                ? "border-gold bg-gold/25 shadow-[0_0_24px_rgba(201,168,106,0.35)]"
                                : "border-white/60 bg-white/10"
                        }`}
                        style={{
                            left: `${area.x * 100}%`,
                            top: `${area.y * 100}%`,
                            width: `${area.width * 100}%`,
                            height: `${area.height * 100}%`,
                            transform: `rotate(${area.rotation}deg)`,
                        }}
                        title={getAreaLabel(area)}
                    >
                        <span className="rounded-md bg-black/65 px-2 py-1 text-[10px] font-bold text-white">
                            {getAreaLabel(area)}
                        </span>
                    </button>
                )) : null}
            </div>
        </div>
    );
}

export function DtfMockupTemplatesTab({
    items,
    garments,
    colors,
    onRefresh,
    ImageUploaderComponent,
}: Props) {
    const [editing, setEditing] = useState<DtfMockupTemplate | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<DtfMockupTemplate | null>(null);
    const [filterGarment, setFilterGarment] = useState("all");
    const [garmentId, setGarmentId] = useState(garments[0]?.id ?? "");
    const [colorId, setColorId] = useState("");
    const [side, setSide] = useState<DtfMockupSide>("front");
    const [baseImageUrl, setBaseImageUrl] = useState("");
    const [baseImagePath, setBaseImagePath] = useState("");
    const [maskImageUrl, setMaskImageUrl] = useState("");
    const [maskImagePath, setMaskImagePath] = useState("");
    const [overlayImageUrl, setOverlayImageUrl] = useState("");
    const [overlayImagePath, setOverlayImagePath] = useState("");
    const [draftAssetPaths, setDraftAssetPaths] = useState<string[]>([]);
    const [areas, setAreas] = useState<DtfMockupPrintArea[]>(getDefaultAreas("front"));
    const [selectedAreaIndex, setSelectedAreaIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const filteredItems = filterGarment === "all"
        ? items
        : items.filter((item) => item.garment_id === filterGarment);
    const availableColors = useMemo(
        () => colors.filter((color) => color.garment_id === garmentId),
        [colors, garmentId]
    );
    const availableAreaPresets = AREA_PRESETS.filter((preset) => (
        preset.side === side
        && !areas.some((area) => getAreaKey(area) === getAreaKey(preset))
    ));
    const selectedArea = areas[selectedAreaIndex] ?? null;

    const resetForm = useCallback(() => {
        const defaultGarmentId = garments[0]?.id ?? "";
        setGarmentId(defaultGarmentId);
        setColorId("");
        setSide("front");
        setBaseImageUrl("");
        setBaseImagePath("");
        setMaskImageUrl("");
        setMaskImagePath("");
        setOverlayImageUrl("");
        setOverlayImagePath("");
        setAreas(getDefaultAreas("front"));
        setSelectedAreaIndex(0);
        setError(null);
    }, [garments]);

    const openAdd = useCallback(() => {
        resetForm();
        setDraftAssetPaths([]);
        setIsAdding(true);
    }, [resetForm]);

    const openEdit = useCallback((item: DtfMockupTemplate) => {
        setEditing(item);
        setGarmentId(item.garment_id);
        setColorId(item.color_id ?? "");
        setSide(item.side);
        setBaseImageUrl(item.base_image_url);
        setBaseImagePath(item.base_image_path ?? "");
        setMaskImageUrl(item.mask_image_url ?? "");
        setMaskImagePath(item.mask_image_path ?? "");
        setOverlayImageUrl(item.overlay_image_url ?? "");
        setOverlayImagePath(item.overlay_image_path ?? "");
        setAreas(item.print_areas);
        setSelectedAreaIndex(0);
        setDraftAssetPaths([]);
        setError(null);
    }, []);

    const closeModal = useCallback(() => {
        const pathsToDiscard = draftAssetPaths;
        setDraftAssetPaths([]);
        setEditing(null);
        setIsAdding(false);
        resetForm();
        if (pathsToDiscard.length > 0) {
            void cleanupDtfMockupDraftAssets(pathsToDiscard);
        }
    }, [draftAssetPaths, resetForm]);

    const changeSide = useCallback((nextSide: DtfMockupSide) => {
        setSide(nextSide);
        const compatible = areas.filter((area) => (
            nextSide === "back"
                ? area.print_position === "back"
                : area.print_position !== "back"
        ));
        setAreas(compatible.length > 0 ? compatible : getDefaultAreas(nextSide));
        setSelectedAreaIndex(0);
    }, [areas]);

    const updateSelectedArea = useCallback((
        field: keyof Pick<DtfMockupPrintArea, "x" | "y" | "width" | "height" | "rotation" | "physical_width_cm" | "physical_height_cm">,
        rawValue: number | null
    ) => {
        setAreas((current) => current.map((area, index) => {
            if (index !== selectedAreaIndex) return area;
            if (field === "physical_width_cm" || field === "physical_height_cm") {
                return { ...area, [field]: rawValue };
            }

            const value = Number(rawValue ?? 0);
            if (field === "rotation") {
                return { ...area, rotation: clamp(value, -180, 180) };
            }
            if (field === "x") {
                return { ...area, x: roundNormalized(clamp(value, 0, 1 - area.width)) };
            }
            if (field === "y") {
                return { ...area, y: roundNormalized(clamp(value, 0, 1 - area.height)) };
            }
            if (field === "width") {
                return { ...area, width: roundNormalized(clamp(value, 0.01, 1 - area.x)) };
            }
            return { ...area, height: roundNormalized(clamp(value, 0.01, 1 - area.y)) };
        }));
    }, [selectedAreaIndex]);

    const addArea = useCallback((preset: AreaPreset) => {
        setAreas((current) => [...current, createArea(preset)]);
        setSelectedAreaIndex(areas.length);
    }, [areas.length]);

    const removeSelectedArea = useCallback(() => {
        if (areas.length <= 1) {
            setError("يجب أن يحتوي القالب على منطقة طباعة واحدة على الأقل.");
            return;
        }
        setAreas((current) => current.filter((_, index) => index !== selectedAreaIndex));
        setSelectedAreaIndex((current) => Math.max(0, current - 1));
    }, [areas.length, selectedAreaIndex]);

    const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData(event.currentTarget);
            if (editing) formData.set("id", editing.id);
            formData.set("garment_id", garmentId);
            formData.set("color_id", colorId);
            formData.set("side", side);
            formData.set("base_image_url", baseImageUrl);
            formData.set("base_image_path", baseImagePath);
            formData.set("mask_image_url", maskImageUrl);
            formData.set("mask_image_path", maskImagePath);
            formData.set("overlay_image_url", overlayImageUrl);
            formData.set("overlay_image_path", overlayImagePath);
            formData.set("print_areas", JSON.stringify(areas));
            const result = await upsertDtfMockupTemplate(formData);
            if (!result || "error" in result) {
                setError(result?.error || "تعذر حفظ قالب الموكاب.");
                return;
            }
            const savedPaths = new Set([
                baseImagePath,
                maskImagePath,
                overlayImagePath,
            ].filter(Boolean));
            const obsoleteDraftPaths = draftAssetPaths.filter((path) => !savedPaths.has(path));
            if (obsoleteDraftPaths.length > 0) {
                await cleanupDtfMockupDraftAssets(obsoleteDraftPaths);
            }
            setDraftAssetPaths([]);
            setEditing(null);
            setIsAdding(false);
            resetForm();
            onRefresh();
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "تعذر حفظ قالب الموكاب.");
        } finally {
            setLoading(false);
        }
    }, [
        areas,
        baseImageUrl,
        baseImagePath,
        colorId,
        draftAssetPaths,
        editing,
        garmentId,
        maskImageUrl,
        maskImagePath,
        onRefresh,
        overlayImageUrl,
        overlayImagePath,
        resetForm,
        side,
    ]);

    const handleDelete = useCallback(async (id: string) => {
        setDeletingId(id);
        setError(null);
        try {
            const result = await deleteDtfMockupTemplate(id);
            if (!result || "error" in result) {
                setError(result?.error || "تعذر حذف قالب الموكاب.");
                return;
            }
            setDeleteCandidate(null);
            onRefresh();
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "تعذر حذف قالب الموكاب.");
        } finally {
            setDeletingId(null);
        }
    }, [onRefresh]);

    return (
        <section className="theme-surface-panel rounded-3xl p-5 sm:p-6">
            <div className="flex flex-col gap-4 border-b border-theme-subtle pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                    <p className="text-xs font-bold text-gold">MASTER ARTWORK PIPELINE</p>
                    <h2 className="mt-2 text-xl font-black text-theme">قوالب موكاب WASHA AI</h2>
                    <p className="mt-2 text-sm leading-6 text-theme-subtle">
                        ارفع موكابًا عامًا للقطعة أو نسخة خاصة لكل لون، ثم عاير مناطق الطباعة. سيُركّب النظام أصل التصميم نفسه على القالب دون إعادة توليده أو استخراجه من القماش.
                    </p>
                </div>
                <button type="button" onClick={openAdd} className={primaryButton}>
                    <Plus className="h-4 w-4" />
                    إضافة قالب موكاب
                </button>
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl border border-gold/15 bg-gold/5 p-4 sm:grid-cols-3">
                <div>
                    <p className="text-[11px] text-theme-faint">القوالب</p>
                    <p className="mt-1 text-2xl font-black text-theme">{items.length}</p>
                </div>
                <div>
                    <p className="text-[11px] text-theme-faint">قوالب ألوان مخصصة</p>
                    <p className="mt-1 text-2xl font-black text-theme">{items.filter((item) => item.color_id).length}</p>
                </div>
                <div>
                    <p className="text-[11px] text-theme-faint">مناطق طباعة معايرة</p>
                    <p className="mt-1 text-2xl font-black text-theme">{items.reduce((sum, item) => sum + item.print_areas.length, 0)}</p>
                </div>
            </div>

            {error && !isAdding && !editing ? (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
            ) : null}

            <div className="mt-5">
                <select value={filterGarment} onChange={(event) => setFilterGarment(event.target.value)} className={`${inputClass} max-w-sm`}>
                    <option value="all">جميع القطع</option>
                    {garments.map((garment) => <option key={garment.id} value={garment.id}>{garment.name}</option>)}
                </select>
            </div>

            {filteredItems.length === 0 ? (
                <div className="mt-6 flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-theme-subtle text-center">
                    <ImagePlus className="h-8 w-8 text-theme-faint" />
                    <p className="mt-3 text-sm font-bold text-theme">لا توجد قوالب موكاب بعد</p>
                    <p className="mt-1 text-xs text-theme-faint">ابدأ بقالب عام للقطعة، ثم أضف ألوانًا خاصة عند الحاجة.</p>
                </div>
            ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredItems.map((item) => {
                        const garment = garments.find((candidate) => candidate.id === item.garment_id);
                        const color = colors.find((candidate) => candidate.id === item.color_id);
                        return (
                            <article key={item.id} className="overflow-hidden rounded-2xl border border-theme-subtle bg-theme-faint">
                                <div className="relative aspect-[4/5] overflow-hidden bg-theme-subtle">
                                    <img src={item.base_image_url} alt={`${garment?.name ?? "قطعة"} ${color?.name ?? ""}`} className="h-full w-full object-cover" />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                        <p className="font-bold text-white">{garment?.name ?? "قطعة غير معروفة"}</p>
                                        <p className="mt-1 text-xs text-white/70">{color?.name ?? "قالب عام لكل الألوان"} · {item.side === "front" ? "أمام" : "خلف"}</p>
                                    </div>
                                </div>
                                <div className="space-y-3 p-4">
                                    <div className="flex flex-wrap gap-2">
                                        {item.print_areas.map((area) => (
                                            <span key={getAreaKey(area)} className="rounded-full border border-theme-subtle px-2.5 py-1 text-[10px] text-theme-soft">
                                                {getAreaLabel(area)}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] ${item.is_active ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
                                            {item.is_active ? "نشط" : "متوقف"}
                                        </span>
                                        <div className="flex gap-1">
                                            <button type="button" onClick={() => openEdit(item)} className="rounded-lg p-2 text-theme-subtle hover:bg-theme-subtle">
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDeleteCandidate(item)}
                                                disabled={deletingId === item.id}
                                                className="rounded-lg p-2 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                                            >
                                                {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <Modal open={isAdding || Boolean(editing)} onClose={closeModal} title={editing ? "تعديل قالب الموكاب" : "إنشاء قالب موكاب جديد"}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Field label="القطعة">
                            <select
                                name="garment_id"
                                value={garmentId}
                                onChange={(event) => {
                                    setGarmentId(event.target.value);
                                    setColorId("");
                                }}
                                required
                                className={inputClass}
                            >
                                {garments.map((garment) => <option key={garment.id} value={garment.id}>{garment.name}</option>)}
                            </select>
                        </Field>
                        <Field label="اللون">
                            <select name="color_id" value={colorId} onChange={(event) => setColorId(event.target.value)} className={inputClass}>
                                <option value="">قالب عام لكل الألوان</option>
                                {availableColors.map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}
                            </select>
                        </Field>
                        <Field label="الجهة">
                            <select name="side" value={side} onChange={(event) => changeSide(event.target.value as DtfMockupSide)} className={inputClass}>
                                <option value="front">أمام</option>
                                <option value="back">خلف</option>
                            </select>
                        </Field>
                        <Field label="الحالة">
                            <select name="is_active" defaultValue={editing?.is_active === false ? "false" : "true"} className={inputClass}>
                                <option value="true">نشط</option>
                                <option value="false">متوقف</option>
                            </select>
                        </Field>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-3">
                        <Field label="صورة الموكاب الأساسية">
                            <ImageUploaderComponent
                                value={baseImageUrl}
                                onChange={setBaseImageUrl}
                                onAssetChange={(asset) => {
                                    setBaseImageUrl(asset.url);
                                    setBaseImagePath(asset.path ?? "");
                                    if (asset.path && asset.path !== editing?.base_image_path) {
                                        setDraftAssetPaths((current) => [...new Set([...current, asset.path!])]);
                                    }
                                }}
                                folder="washa-ai-mockup-templates"
                                label="صورة الموكاب الأساسية"
                                fieldName="base_image_url"
                            />
                        </Field>
                        <Field label="قناع الطباعة — اختياري">
                            <ImageUploaderComponent
                                value={maskImageUrl}
                                onChange={setMaskImageUrl}
                                onAssetChange={(asset) => {
                                    setMaskImageUrl(asset.url);
                                    setMaskImagePath(asset.path ?? "");
                                    if (asset.path && asset.path !== editing?.mask_image_path) {
                                        setDraftAssetPaths((current) => [...new Set([...current, asset.path!])]);
                                    }
                                }}
                                folder="washa-ai-mockup-masks"
                                label="قناع الطباعة"
                                fieldName="mask_image_url"
                            />
                        </Field>
                        <Field label="طبقة الظلال — اختياري">
                            <ImageUploaderComponent
                                value={overlayImageUrl}
                                onChange={setOverlayImageUrl}
                                onAssetChange={(asset) => {
                                    setOverlayImageUrl(asset.url);
                                    setOverlayImagePath(asset.path ?? "");
                                    if (asset.path && asset.path !== editing?.overlay_image_path) {
                                        setDraftAssetPaths((current) => [...new Set([...current, asset.path!])]);
                                    }
                                }}
                                folder="washa-ai-mockup-overlays"
                                label="طبقة الظلال"
                                fieldName="overlay_image_url"
                            />
                        </Field>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                        <CalibrationPreview
                            imageUrl={baseImageUrl}
                            areas={areas}
                            selectedIndex={selectedAreaIndex}
                            onSelect={setSelectedAreaIndex}
                        />

                        <div className="space-y-4">
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-theme">مناطق الطباعة</p>
                                        <p className="mt-1 text-xs text-theme-faint">اختر منطقة لمعايرتها أو أضف موضعًا جديدًا.</p>
                                    </div>
                                    <Layers className="h-5 w-5 text-gold" />
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {areas.map((area, index) => (
                                        <button
                                            key={getAreaKey(area)}
                                            type="button"
                                            onClick={() => setSelectedAreaIndex(index)}
                                            className={`rounded-full border px-3 py-1.5 text-xs ${
                                                index === selectedAreaIndex
                                                    ? "border-gold/40 bg-gold/15 text-gold"
                                                    : "border-theme-subtle text-theme-subtle"
                                            }`}
                                        >
                                            {getAreaLabel(area)}
                                        </button>
                                    ))}
                                </div>
                                {availableAreaPresets.length > 0 ? (
                                    <div className="mt-3 flex flex-wrap gap-2 border-t border-theme-subtle pt-3">
                                        {availableAreaPresets.map((preset) => (
                                            <button
                                                key={getAreaKey(preset)}
                                                type="button"
                                                onClick={() => addArea(preset)}
                                                className="rounded-full border border-dashed border-gold/30 px-3 py-1.5 text-xs text-gold hover:bg-gold/10"
                                            >
                                                + {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            {selectedArea ? (
                                <div className="space-y-4 rounded-2xl border border-theme-subtle p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-theme">{getAreaLabel(selectedArea)}</p>
                                        <button type="button" onClick={removeSelectedArea} className="text-xs text-red-300 hover:text-red-200">حذف المنطقة</button>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {([
                                            ["x", "X من اليسار"],
                                            ["y", "Y من الأعلى"],
                                            ["width", "العرض"],
                                            ["height", "الارتفاع"],
                                        ] as const).map(([field, label]) => (
                                            <Field key={field} label={`${label} %`}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.1"
                                                    value={roundNormalized(selectedArea[field] * 100)}
                                                    onChange={(event) => updateSelectedArea(field, Number(event.target.value) / 100)}
                                                    className={inputClass}
                                                />
                                            </Field>
                                        ))}
                                        <Field label="الدوران بالدرجة">
                                            <input
                                                type="number"
                                                min="-180"
                                                max="180"
                                                step="0.5"
                                                value={selectedArea.rotation}
                                                onChange={(event) => updateSelectedArea("rotation", Number(event.target.value))}
                                                className={inputClass}
                                            />
                                        </Field>
                                        <Field label="عرض الطباعة الحقيقي سم">
                                            <input
                                                type="number"
                                                min="1"
                                                max="200"
                                                step="0.1"
                                                value={selectedArea.physical_width_cm ?? ""}
                                                onChange={(event) => updateSelectedArea("physical_width_cm", event.target.value ? Number(event.target.value) : null)}
                                                className={inputClass}
                                            />
                                        </Field>
                                        <Field label="ارتفاع الطباعة الحقيقي سم">
                                            <input
                                                type="number"
                                                min="1"
                                                max="200"
                                                step="0.1"
                                                value={selectedArea.physical_height_cm ?? ""}
                                                onChange={(event) => updateSelectedArea("physical_height_cm", event.target.value ? Number(event.target.value) : null)}
                                                className={inputClass}
                                            />
                                        </Field>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field label="نسخة القالب">
                            <input name="version" type="number" min="1" defaultValue={editing?.version ?? 1} className={inputClass} />
                        </Field>
                        <Field label="الترتيب">
                            <input name="sort_order" type="number" min="0" defaultValue={editing?.sort_order ?? 0} className={inputClass} />
                        </Field>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-theme-subtle pt-5 sm:flex-row sm:justify-end">
                        <button type="button" onClick={closeModal} className={secondaryButton}>إلغاء</button>
                        <button type="submit" disabled={loading || !baseImageUrl || !garmentId || areas.length === 0} className={primaryButton}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                            {loading ? "جاري الحفظ..." : "حفظ القالب والمعايرة"}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                open={Boolean(deleteCandidate)}
                onClose={() => setDeleteCandidate(null)}
                title="حذف قالب الموكاب"
            >
                <div className="space-y-5">
                    <p className="text-sm leading-7 text-theme-subtle">
                        سيُحذف قالب {garments.find((item) => item.id === deleteCandidate?.garment_id)?.name ?? "القطعة"}
                        {deleteCandidate?.color_id
                            ? ` للون ${colors.find((item) => item.id === deleteCandidate.color_id)?.name ?? "المحدد"}`
                            : " العام لكل الألوان"}.
                        إذا لم يوجد قالب بديل فسيعود التوليد مؤقتًا إلى مسار الموكاب القديم.
                    </p>
                    <div className="flex flex-col-reverse gap-3 border-t border-theme-subtle pt-5 sm:flex-row sm:justify-end">
                        <button type="button" onClick={() => setDeleteCandidate(null)} className={secondaryButton}>
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={() => deleteCandidate && void handleDelete(deleteCandidate.id)}
                            disabled={!deleteCandidate || deletingId === deleteCandidate.id}
                            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-400 disabled:opacity-50"
                        >
                            {deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            حذف القالب
                        </button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
