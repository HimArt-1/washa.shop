import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Database } from "@/types/database";
import {
    normalizeCartMoney,
    normalizeCartQuantity,
    sanitizeCartItem,
    sanitizeCartItems,
    type CommerceCartItem,
} from "@/lib/commerce-safety";

type DiscountCoupon = Database["public"]["Tables"]["discount_coupons"]["Row"];

export type CartItem = CommerceCartItem;

interface CartState {
    items: CartItem[];
    isOpen: boolean;
    coupon: DiscountCoupon | null;
    addItem: (item: Omit<CartItem, "quantity">) => void;
    removeItem: (id: string, size?: string | null, colorCode?: string | null) => void;
    updateQuantity: (id: string, quantity: number, size?: string | null, colorCode?: string | null) => void;
    clearCart: () => void;
    toggleCart: (open?: boolean) => void;

    // Coupons
    applyCoupon: (coupon: DiscountCoupon) => void;
    removeCoupon: () => void;

    // Calculations
    getSubtotal: () => number;
    getDiscountAmount: () => number;
    getCartTotal: () => number;
    getCartCount: () => number;
}

const CART_STORAGE_VERSION = 2;

const safeCartStorage = {
    getItem: (name: string) => {
        try {
            if (typeof window === "undefined") return null;
            return window.localStorage.getItem(name);
        } catch {
            return null;
        }
    },
    setItem: (name: string, value: string) => {
        try {
            if (typeof window === "undefined") return;
            window.localStorage.setItem(name, value);
        } catch {
            // Safari private mode, blocked storage, or quota errors must not break shopping.
        }
    },
    removeItem: (name: string) => {
        try {
            if (typeof window === "undefined") return;
            window.localStorage.removeItem(name);
        } catch {
            // no-op
        }
    },
};

function sanitizeCoupon(value: unknown): DiscountCoupon | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;

    const coupon = value as Partial<DiscountCoupon>;
    const discountValue = normalizeCartMoney(coupon.discount_value);
    if (!coupon.id || !coupon.code || discountValue <= 0) return null;
    if (coupon.discount_type !== "percentage" && coupon.discount_type !== "fixed") return null;

    return {
        ...(coupon as DiscountCoupon),
        discount_value: discountValue,
    };
}

function normalizePersistedState(value: unknown): Partial<Pick<CartState, "items" | "coupon">> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { items: [], coupon: null };
    }

    const state = value as Partial<CartState>;
    return {
        items: sanitizeCartItems(state.items),
        coupon: sanitizeCoupon(state.coupon),
    };
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            isOpen: false,
            coupon: null,

            addItem: (newItem) => {
                set((state) => {
                    const cleanNewItem = sanitizeCartItem({ ...newItem, quantity: 1 });
                    const currentItems = sanitizeCartItems(state.items);
                    if (!cleanNewItem) {
                        return { items: currentItems, isOpen: state.isOpen };
                    }

                    const existingItemIndex = currentItems.findIndex(
                        (item) =>
                            item.id === cleanNewItem.id &&
                            (item.size ?? null) === (cleanNewItem.size ?? null) &&
                            (item.colorCode ?? null) === (cleanNewItem.colorCode ?? null)
                    );

                    if (existingItemIndex > -1) {
                        // Item exists, increment quantity
                        const newItems = [...currentItems];
                        const item = newItems[existingItemIndex];
                        const max = Math.max(item.maxQuantity || 99, cleanNewItem.maxQuantity || 99);

                        if (item.quantity < max) {
                            newItems[existingItemIndex] = {
                                ...item,
                                ...cleanNewItem,
                                quantity: normalizeCartQuantity(item.quantity + 1, max),
                                maxQuantity: max,
                            };
                        }

                        return { items: newItems, isOpen: true };
                    } else {
                        // New item
                        return {
                            items: [...currentItems, cleanNewItem],
                            isOpen: true,
                        };
                    }
                });
            },

            removeItem: (id, size, colorCode) => {
                set((state) => ({
                    items: sanitizeCartItems(state.items).filter(
                        (item) =>
                            !(
                                item.id === id &&
                                (item.size ?? null) === (size ?? null) &&
                                (item.colorCode ?? null) === (colorCode ?? null)
                            )
                    ),
                }));
            },

            updateQuantity: (id, quantity, size, colorCode) => {
                set((state) => ({
                    items: sanitizeCartItems(state.items).map((item) => {
                        if (
                            item.id === id &&
                            (item.size ?? null) === (size ?? null) &&
                            (item.colorCode ?? null) === (colorCode ?? null)
                        ) {
                            const max = item.maxQuantity || 99;
                            return { ...item, quantity: normalizeCartQuantity(quantity, max) };
                        }
                        return item;
                    }),
                }));
            },

            clearCart: () => set({ items: [], coupon: null }),

            toggleCart: (open) => set((state) => ({
                isOpen: open !== undefined ? open : !state.isOpen
            })),

            applyCoupon: (coupon) => set({ coupon: sanitizeCoupon(coupon) }),
            removeCoupon: () => set({ coupon: null }),

            getSubtotal: () => {
                return sanitizeCartItems(get().items).reduce((total, item) => total + item.price * item.quantity, 0);
            },

            getDiscountAmount: () => {
                const subtotal = get().getSubtotal();
                const coupon = get().coupon;

                if (!coupon) return 0;

                const discountValue = normalizeCartMoney(coupon.discount_value);
                if (discountValue <= 0) return 0;

                if (coupon.discount_type === "percentage") {
                    return Number(((subtotal * discountValue) / 100).toFixed(2));
                } else {
                    return Math.min(discountValue, subtotal); // Don't discount more than the cart value
                }
            },

            getCartTotal: () => {
                const subtotal = get().getSubtotal();
                const discount = get().getDiscountAmount();
                return Math.max(0, subtotal - discount);
            },

            getCartCount: () => {
                return sanitizeCartItems(get().items).reduce((count, item) => count + item.quantity, 0);
            },
        }),
        {
            name: "wusha-cart-storage",
            version: CART_STORAGE_VERSION,
            storage: createJSONStorage(() => safeCartStorage),
            // Persist items + coupon, skip UI state like isOpen
            partialize: (state) => ({
                items: sanitizeCartItems(state.items),
                coupon: sanitizeCoupon(state.coupon),
            }),
            migrate: (persistedState) => normalizePersistedState(persistedState),
            merge: (persistedState, currentState) => ({
                ...currentState,
                ...normalizePersistedState(persistedState),
            }),
        }
    )
);
