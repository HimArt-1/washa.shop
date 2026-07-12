"use client";

import { useState } from "react";
import { Plus, List, Check, Trash2 } from "lucide-react";
import { useBooth } from "../BoothContext";
import { productMargin } from "../shared";
import { StockBadge } from "../StockBadge";
import { Panel, Field, inputCls, selectCls, BtnPrimary, BtnDanger } from "../ui";

export function ProductsTab() {
    const { products, saveProduct, deleteProduct } = useBooth();
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [cost, setCost] = useState("");
    const [editId, setEditId] = useState("");

    const onEditSelect = (val: string) => {
        setEditId(val);
        const p = products.find((x) => String(x.id) === val);
        if (p) {
            setName(p.name);
            setPrice(String(p.price));
            setCost(String(p.cost));
        }
    };

    const reset = () => {
        setName("");
        setPrice("");
        setCost("");
        setEditId("");
    };

    const onSave = () => {
        saveProduct({
            id: editId ? Number(editId) : undefined,
            name: name.trim(),
            price: parseFloat(price) || 0,
            cost: parseFloat(cost) || 0,
        });
        reset();
    };

    const onDelete = () => {
        if (!editId) return;
        deleteProduct(Number(editId));
        reset();
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Panel title="إضافة أو تعديل منتج" icon={Plus}>
                <div className="space-y-3">
                    <Field label="اسم المنتج">
                        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: تيشيرت كلاسيك" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="سعر البيع (ر)">
                            <input className={inputCls} type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
                        </Field>
                        <Field label="تكلفة الشراء (ر)">
                            <input className={inputCls} type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" />
                        </Field>
                    </div>
                    <Field label="تعديل منتج موجود">
                        <select className={selectCls} value={editId} onChange={(e) => onEditSelect(e.target.value)}>
                            <option value="">-- اختر للتعديل --</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </Field>
                    <div className="flex gap-2">
                        <BtnPrimary onClick={onSave}><Check className="w-4 h-4" />حفظ</BtnPrimary>
                        <BtnDanger onClick={onDelete} disabled={!editId}><Trash2 className="w-4 h-4" />حذف</BtnDanger>
                    </div>
                </div>
            </Panel>

            <Panel title="قائمة المنتجات" icon={List}>
                <div>
                    {products.map((p) => (
                        <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-theme-subtle last:border-0">
                            <div>
                                <div className="text-[13px] font-bold text-theme">{p.name}</div>
                                <div className="text-[11px] text-theme-faint">تكلفة: {p.cost} ر · سعر: {p.price} ر · هامش: {productMargin(p)}%</div>
                            </div>
                            <StockBadge pid={p.id} />
                        </div>
                    ))}
                </div>
            </Panel>
        </div>
    );
}
