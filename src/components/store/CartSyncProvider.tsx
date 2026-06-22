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
import { getCartItemKey, sanitizeCartItems } from "@/lib/commerce-safety";

export function CartSyncProvider() {
    const { user, isSignedIn, isLoaded } = useUser();
    const prevSignedIn = useRef<boolean | null>(null);
    const items = useCartStore(s => s.items);

    // عند تسجيل الدخول: جلب السلة المحفوظة + دمجها مع السلة الحالية
    useEffect(() => {
        if (!isLoaded) return;

        const justSignedIn = isSignedIn && prevSignedIn.current === false;
        const justSignedOut = !isSignedIn && prevSignedIn.current === true;

        if (justSignedIn && user) {
            loadUserCart().then((serverItems) => {
                if (!serverItems || serverItems.length === 0) return;
                const merged = new Map<string, ReturnType<typeof sanitizeCartItems>[number]>();

                sanitizeCartItems(useCartStore.getState().items).forEach((item) => {
                    merged.set(getCartItemKey(item), item);
                });

                sanitizeCartItems(serverItems).forEach((item) => {
                    const key = getCartItemKey(item);
                    if (!merged.has(key)) merged.set(key, item);
                });

                useCartStore.setState({ items: sanitizeCartItems(Array.from(merged.values())) });
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
            saveUserCart(sanitizeCartItems(items)).catch(() => { /* graceful */ });
        }, 1500); // debounce
        return () => clearTimeout(timer);
    }, [items, isSignedIn, isLoaded]);

    return null;
}
