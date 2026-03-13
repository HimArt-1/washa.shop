"use client";

/**
 * CartSyncProvider — مزامنة السلة بين الأجهزة عند تسجيل الدخول
 *
 * يحتاج هذا المكوّن عمود JSONB في جدول profiles:
 *   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cart_items JSONB DEFAULT '[]'::jsonb;
 *
 * إذا لم يُضف العمود، تفشل المزامنة بصمت ولا يتأثر التطبيق.
 */

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useCartStore } from "@/stores/cartStore";
import { saveUserCart, loadUserCart } from "@/app/actions/cart-sync";

export function CartSyncProvider() {
    const { user, isSignedIn, isLoaded } = useUser();
    const prevSignedIn = useRef<boolean | null>(null);
    const items = useCartStore(s => s.items);
    const addItem = useCartStore(s => s.addItem);
    const clearCart = useCartStore(s => s.clearCart);

    // عند تسجيل الدخول: جلب السلة المحفوظة + دمجها مع السلة الحالية
    useEffect(() => {
        if (!isLoaded) return;

        const justSignedIn = isSignedIn && prevSignedIn.current === false;
        const justSignedOut = !isSignedIn && prevSignedIn.current === true;

        if (justSignedIn && user) {
            loadUserCart().then(serverItems => {
                if (!serverItems || serverItems.length === 0) return;
                // أضف العناصر الغائبة من الخادم للسلة المحلية
                const localIds = new Set(useCartStore.getState().items.map(i => `${i.id}_${i.size}`));
                serverItems.forEach((item: any) => {
                    if (!localIds.has(`${item.id}_${item.size}`)) {
                        addItem(item);
                    }
                });
            }).catch(() => { /* graceful */ });
        }

        if (justSignedOut) {
            // احفظ السلة الحالية قبل مسحها (لن تُمسح - فقط نحفظها)
            // السلة تبقى في localStorage بعد تسجيل الخروج
        }

        prevSignedIn.current = isSignedIn ?? false;
    }, [isSignedIn, isLoaded, user]);

    // احفظ السلة على الخادم كلما تغيرت (لمستخدمين مسجلين)
    useEffect(() => {
        if (!isSignedIn || !isLoaded) return;
        const timer = setTimeout(() => {
            saveUserCart(items).catch(() => { /* graceful */ });
        }, 1500); // debounce
        return () => clearTimeout(timer);
    }, [items, isSignedIn, isLoaded]);

    return null;
}
