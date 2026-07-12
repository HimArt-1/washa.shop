"use client";

// نظام البوث — مزوّد الحالة المركزي (المرحلة 1: في الذاكرة)
// كل منطق الأعمال المنقول من نظام البوث المستقل يعيش هنا.

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
    SIZES,
    Size,
    StockMap,
    ThresholdMap,
    BoothProduct,
    BoothOrder,
    BoothSale,
    BoothReturn,
    BoothExpense,
    BoothDiscount,
    DiscountType,
    PayMethod,
    OrderStatus,
    ExpensePeriod,
} from "./types";
import { applyDiscount, nowT, totalStock } from "./format";

export const GOAL = 4000;

// ── بيانات البذور (نفس بيانات النظام الأصلي لتظهر الواجهة حيّة فوراً) ──
const SEED_PRODUCTS: BoothProduct[] = [
    { id: 1, name: "كلاسيك", price: 79, cost: 35 },
    { id: 2, name: "أوفرسايز", price: 99, cost: 45 },
    { id: 3, name: "بولو", price: 119, cost: 55 },
    { id: 4, name: "تونيك", price: 89, cost: 40 },
    { id: 5, name: "قطن فاخر", price: 139, cost: 65 },
    { id: 6, name: "أطفال", price: 59, cost: 25 },
];

function seedStock(products: BoothProduct[]): StockMap {
    const s: StockMap = {};
    products.forEach((p) => {
        s[p.id] = {};
        SIZES.forEach((sz) => (s[p.id][sz] = 0));
    });
    return s;
}

function seedThresholds(products: BoothProduct[]): ThresholdMap {
    const t: ThresholdMap = {};
    products.forEach((p) => (t[p.id] = 5));
    return t;
}

interface BoothContextValue {
    // الحالة
    products: BoothProduct[];
    stock: StockMap;
    thresholds: ThresholdMap;
    orders: BoothOrder[];
    sales: BoothSale[];
    returns: BoothReturn[];
    expenses: BoothExpense[];
    discounts: BoothDiscount[];
    cart: Record<number, number>;

    // مجاميع مشتقة
    tSales: number;
    tCOGS: number;
    tDisc: number;
    tExp: number;
    tRet: number;
    grossP: number;
    netP: number;

    // أفعال المنتجات
    saveProduct: (input: { id?: number; name: string; price: number; cost: number }) => void;
    deleteProduct: (id: number) => void;

    // أفعال المخزون
    addStock: (pid: number, size: Size | string, qty: number, threshold: number) => void;

    // أفعال الطلبات
    addOrder: (input: {
        name: string;
        pid: number;
        size: string;
        qty: number;
        baseAmount: number;
        pay: PayMethod | string;
        status: OrderStatus | string;
        discId: string;
        prepaid: boolean;
        note: string;
    }) => boolean;

    // الكاشير
    setCart: React.Dispatch<React.SetStateAction<Record<number, number>>>;
    completeSale: (input: { name: string; size: string; pay: PayMethod | string; discId: string }) => boolean;
    clearCart: () => void;

    // الخصومات
    addDiscount: (input: { code: string; type: DiscountType; val: number; min: number }) => void;
    deleteDiscount: (id: number) => void;

    // المرتجعات
    addReturn: (input: { orderId: number; reason: string; refund: string; note: string }) => void;

    // المصاريف
    addExpense: (input: { name: string; amount: number; cat: string; period: ExpensePeriod | string }) => void;
}

const Ctx = createContext<BoothContextValue | null>(null);

export function useBooth() {
    const v = useContext(Ctx);
    if (!v) throw new Error("useBooth must be used within BoothProvider");
    return v;
}

export function BoothProvider({ children }: { children: React.ReactNode }) {
    const [products, setProducts] = useState<BoothProduct[]>(SEED_PRODUCTS);
    const [stock, setStock] = useState<StockMap>(() => seedStock(SEED_PRODUCTS));
    const [thresholds, setThresholds] = useState<ThresholdMap>(() => seedThresholds(SEED_PRODUCTS));
    const [orders, setOrders] = useState<BoothOrder[]>([]);
    const [sales, setSales] = useState<BoothSale[]>([]);
    const [returns, setReturns] = useState<BoothReturn[]>([]);
    const [expenses, setExpenses] = useState<BoothExpense[]>([]);
    const [discounts, setDiscounts] = useState<BoothDiscount[]>([]);
    const [cart, setCart] = useState<Record<number, number>>({});

    // عدّادات المعرّفات
    const counters = useRef({ pid: 7, order: 1, sale: 1, ret: 1, exp: 1, disc: 1 });

    // ── مجاميع مشتقة ──────────────────────────────────────────
    const tSales = useMemo(() => sales.reduce((t, s) => t + s.amount, 0), [sales]);
    const tCOGS = useMemo(() => orders.filter((o) => o.paid).reduce((t, o) => t + o.cogs, 0), [orders]);
    const tDisc = useMemo(() => orders.filter((o) => o.paid).reduce((t, o) => t + (o.discAmt || 0), 0), [orders]);
    const tExp = useMemo(() => expenses.reduce((t, e) => t + e.amount, 0), [expenses]);
    const tRet = useMemo(() => returns.reduce((t, r) => t + r.amount, 0), [returns]);
    const grossP = tSales - tCOGS;
    const netP = grossP - tExp - tRet;

    // ── المنتجات ──────────────────────────────────────────────
    const saveProduct = useCallback<BoothContextValue["saveProduct"]>((input) => {
        const { id, name, price, cost } = input;
        if (!name || !price) {
            toast.error("أدخل الاسم والسعر");
            return;
        }
        if (id) {
            setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, name, price, cost } : p)));
            toast.success("تم التعديل");
        } else {
            const newId = counters.current.pid++;
            setProducts((prev) => [...prev, { id: newId, name, price, cost }]);
            setStock((prev) => {
                const s: Record<string, number> = {};
                SIZES.forEach((sz) => (s[sz] = 0));
                return { ...prev, [newId]: s };
            });
            setThresholds((prev) => ({ ...prev, [newId]: 5 }));
            toast.success("تم إضافة المنتج");
        }
    }, []);

    const deleteProduct = useCallback((id: number) => {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        toast.success("تم الحذف");
    }, []);

    // ── المخزون ───────────────────────────────────────────────
    const addStock = useCallback<BoothContextValue["addStock"]>((pid, size, qty, threshold) => {
        if (!pid || qty <= 0) {
            toast.error("اختر المنتج والكمية");
            return;
        }
        setStock((prev) => {
            const cur = prev[pid] ? { ...prev[pid] } : {};
            cur[size] = (cur[size] || 0) + qty;
            return { ...prev, [pid]: cur };
        });
        if (threshold) setThresholds((prev) => ({ ...prev, [pid]: threshold }));
        const p = products.find((x) => x.id === pid);
        toast.success(`أُضيف ${qty} قطعة — ${p?.name ?? ""} (${size})`);
    }, [products]);

    // ── الطلبات ───────────────────────────────────────────────
    const addOrder = useCallback<BoothContextValue["addOrder"]>((input) => {
        const { name, pid, size, qty, baseAmount, pay, status, discId, prepaid, note } = input;
        if (!name || !pid || !size || !baseAmount || !pay) {
            toast.error("يرجى ملء جميع الحقول المطلوبة");
            return false;
        }
        const p = products.find((x) => x.id === pid);
        if (!p) return false;
        const av = (stock[pid] && stock[pid][size]) || 0;
        if (av < qty) {
            toast.error(`مخزون غير كافٍ — متاح ${av} فقط (${size})`);
            return false;
        }
        const disc = applyDiscount(baseAmount, discId, discounts);
        const amount = disc.final;
        const cogs = p.cost * qty;
        const profit = amount - cogs;
        const paid = prepaid || status === "مكتمل";
        const order: BoothOrder = {
            id: counters.current.order++,
            name,
            product: p.name,
            pid,
            size,
            qty,
            amount,
            baseAmount,
            discAmt: disc.amt,
            cogs,
            profit,
            pay,
            status,
            prepaid,
            paid,
            time: nowT(),
            note,
        };
        setOrders((prev) => [...prev, order]);
        setStock((prev) => {
            const cur = { ...prev[pid] };
            cur[size] = Math.max(0, (cur[size] || 0) - qty);
            return { ...prev, [pid]: cur };
        });
        if (paid) {
            setSales((prev) => [
                ...prev,
                { id: counters.current.sale++, source: "طلب", detail: `${name} — ${p.name} (${size})`, pay, amount, cogs, time: nowT() },
            ]);
        }
        toast.success(
            prepaid
                ? "مدفوع مسبقاً — أُضيف للمبيعات" + (disc.amt ? ` · خصم ${disc.amt} ر` : "")
                : "طلب محفوظ — المخزون خُصم" + (disc.amt ? ` · خصم ${disc.amt} ر` : ""),
        );
        return true;
    }, [products, stock, discounts]);

    // ── الكاشير ───────────────────────────────────────────────
    const clearCart = useCallback(() => setCart({}), []);

    const completeSale = useCallback<BoothContextValue["completeSale"]>((input) => {
        const { name, size, pay, discId } = input;
        const keys = Object.keys(cart).map(Number);
        if (!keys.length) {
            toast.error("اختر منتجاً أولاً");
            return false;
        }
        let sub = 0;
        let totalCost = 0;
        const oos: string[] = [];
        keys.forEach((id) => {
            const p = products.find((x) => x.id === id);
            if (!p) return;
            sub += p.price * cart[id];
            totalCost += p.cost * cart[id];
            if (((stock[id] && stock[id][size]) || 0) < cart[id]) oos.push(p.name);
        });
        if (oos.length) {
            toast.error(`مخزون غير كافٍ: ${oos.join("، ")} (${size})`);
            return false;
        }
        const dr = applyDiscount(sub, discId, discounts);
        const final = dr.final;
        const detail = keys
            .map((id) => {
                const p = products.find((x) => x.id === id);
                return p ? p.name + (cart[id] > 1 ? " × " + cart[id] : "") : "";
            })
            .join("، ");
        const customer = name || "بيع مباشر";
        const order: BoothOrder = {
            id: counters.current.order++,
            name: customer,
            product: detail,
            pid: null,
            size,
            qty: keys.reduce((s, id) => s + cart[id], 0),
            amount: final,
            baseAmount: sub,
            discAmt: dr.amt,
            cogs: totalCost,
            profit: final - totalCost,
            pay,
            status: "مكتمل",
            prepaid: false,
            paid: true,
            time: nowT(),
            note: "",
        };
        setOrders((prev) => [...prev, order]);
        setStock((prev) => {
            const next = { ...prev };
            keys.forEach((id) => {
                if (next[id]) {
                    const cur = { ...next[id] };
                    cur[size] = Math.max(0, (cur[size] || 0) - cart[id]);
                    next[id] = cur;
                }
            });
            return next;
        });
        setSales((prev) => [
            ...prev,
            { id: counters.current.sale++, source: "كاشير", detail: `${customer} — ${detail} (${size})`, pay, amount: final, cogs: totalCost, time: nowT() },
        ]);
        toast.success("تم البيع" + (dr.amt ? ` · خصم ${dr.amt} ر` : ""));
        clearCart();
        return true;
    }, [cart, products, stock, discounts, clearCart]);

    // ── الخصومات ──────────────────────────────────────────────
    const addDiscount = useCallback<BoothContextValue["addDiscount"]>((input) => {
        const { code, type, val, min } = input;
        if (!code || !val) {
            toast.error("أدخل الرمز والقيمة");
            return;
        }
        if (type === "pct" && val > 100) {
            toast.error("النسبة لا تتجاوز 100%");
            return;
        }
        setDiscounts((prev) => [...prev, { id: counters.current.disc++, code, type, val, min }]);
        toast.success("تم حفظ الكوبون");
    }, []);

    const deleteDiscount = useCallback((id: number) => {
        setDiscounts((prev) => prev.filter((d) => d.id !== id));
    }, []);

    // ── المرتجعات ─────────────────────────────────────────────
    const addReturn = useCallback<BoothContextValue["addReturn"]>((input) => {
        const { orderId, reason, refund, note } = input;
        if (!orderId) {
            toast.error("اختر الطلب أولاً");
            return;
        }
        const o = orders.find((x) => x.id === orderId);
        if (!o) return;
        const restocked = refund !== "رصيد للعميل";
        if (restocked && o.pid && stock[o.pid]) {
            setStock((prev) => {
                const cur = { ...prev[o.pid as number] };
                cur[o.size] = (cur[o.size] || 0) + o.qty;
                return { ...prev, [o.pid as number]: cur };
            });
        }
        setReturns((prev) => [
            ...prev,
            { id: counters.current.ret++, orderId, customer: o.name, amount: o.amount, reason, refund, note, restocked, time: nowT() },
        ]);
        setOrders((prev) => prev.map((x) => (x.id === orderId ? { ...x, status: "مرتجع" } : x)));
        toast.success("تم تسجيل المرتجع" + (restocked ? " — أُعيد للمخزون" : ""));
    }, [orders, stock]);

    // ── المصاريف ──────────────────────────────────────────────
    const addExpense = useCallback<BoothContextValue["addExpense"]>((input) => {
        const { name, amount, cat, period } = input;
        if (!name || !amount) {
            toast.error("أدخل البند والمبلغ");
            return;
        }
        setExpenses((prev) => [...prev, { id: counters.current.exp++, name, amount, cat, period, time: nowT() }]);
        toast.success("تم إضافة المصروف");
    }, []);

    const value: BoothContextValue = {
        products, stock, thresholds, orders, sales, returns, expenses, discounts, cart,
        tSales, tCOGS, tDisc, tExp, tRet, grossP, netP,
        saveProduct, deleteProduct, addStock, addOrder,
        setCart, completeSale, clearCart,
        addDiscount, deleteDiscount, addReturn, addExpense,
    };

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { totalStock };
