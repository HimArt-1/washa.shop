"use client";

import { useMemo, useState } from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
import { useBooth } from "../BoothContext";
import type { DiscountType } from "../shared";
import { Panel, Field, inputCls, selectCls, BtnPrimary } from "../ui";

export function DiscountsTab() {
    const { discounts, addDiscount, deleteDiscount } = useBooth();
    const [code, setCode] = useState("");
    const [type, setType] = useState<DiscountType>("pct");
    const [val, setVal] = useState("");
    const [min, setMin] = useState("");

    const preview = useMemo(() => {
        const v = parseFloat(val) || 0;
        if (!v) return "";
        return type === "pct" ? `خصم ${v}% على الإجمالي` : `خصم ثابت ${v} ر`;
    }, [val, type]);

    const onAdd = () => {
        addDiscount({ code: code.trim(), type, val: parseFloat(val) || 0, min: parseFloat(min) || 0 });
        setCode(""); setVal(""); setMin("");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Panel title="إنشاء كوبون" icon={Plus}>
                <div className="space-y-3">
                    <Field label="رمز الكوبون">
                        <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} placeholder="مثال: WASHA10 أو خصم VIP" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="نوع الخصم">
                            <select className={selectCls} value={type} onChange={(e) => setType(e.target.value as DiscountType)}>
                                <option value="pct">نسبة (%)</option>
                                <option value="fixed">مبلغ ثابت (ر)</option>
                            </select>
                        </Field>
                        <Field label="القيمة">
                            <input className={inputCls} type="number" min={0} value={val} onChange={(e) => setVal(e.target.value)} placeholder="10" />
                        </Field>
                    </div>
                    <Field label="الحد الأدنى للطلب (ر)">
                        <input className={inputCls} type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} placeholder="0" />
                    </Field>
                    {preview && <div className="text-xs text-forest min-h-[16px]">{preview}</div>}
                    <BtnPrimary onClick={onAdd}><Plus className="w-4 h-4" />حفظ الكوبون</BtnPrimary>
                </div>
            </Panel>

            <Panel title="الكوبونات المتاحة" icon={Tag}>
                {discounts.length ? (
                    <div className="space-y-1.5">
                        {discounts.map((d) => (
                            <div key={d.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-2/40 border border-theme-subtle text-xs">
                                <div className="flex-1">
                                    <div className="font-bold text-theme">{d.code}</div>
                                    <div className="text-[11px] text-theme-faint">
                                        {d.type === "pct" ? `${d.val}%` : `${d.val} ر ثابت`}{d.min ? ` · حد أدنى ${d.min} ر` : ""}
                                    </div>
                                </div>
                                <button onClick={() => deleteDiscount(d.id)} className="text-theme-faint hover:text-red-400 transition-colors p-1">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 text-theme-faint text-xs">لا توجد كوبونات بعد</div>
                )}
            </Panel>
        </div>
    );
}
