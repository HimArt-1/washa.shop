import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Database } from "@/types/database";

type DiscountCoupon = Database["public"]["Tables"]["discount_coupons"]["Row"];

export interface CartItem {
    id: string; // Product ID أو custom-{garment}-{timestamp}
    title: string;
    price: number;
    image_url: string;
    artist_name: string;
    quantity: number;
    size?: string | null;
    type: "product" | "artwork" | "custom_design";
    maxQuantity?: number; // Stock limit
    // للتصاميم المخصصة فقط
    customDesignUrl?: string;
    customGarment?: string;
    customPosition?: string;
}

interface CartState {
    items: CartItem[];
    isOpen: boolean;
    coupon: DiscountCoupon | null;
    addItem: (item: Omit<CartItem, "quantity">) => void;
    removeItem: (id: string, size?: string | null) => void;
    updateQuantity: (id: string, quantity: number, size?: string | null) => void;
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

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            isOpen: false,
            coupon: null,

            addItem: (newItem) => {
                set((state) => {
                    const existingItemIndex = state.items.findIndex(
                        (item) => item.id === newItem.id && item.size === newItem.size
                    );

                    if (existingItemIndex > -1) {
                        // Item exists, increment quantity
                        const newItems = [...state.items];
                        const item = newItems[existingItemIndex];
                        const max = item.maxQuantity || 99;

                        if (item.quantity < max) {
                            newItems[existingItemIndex] = {
                                ...item,
                                quantity: item.quantity + 1,
                            };
                        }

                        return { items: newItems, isOpen: true };
                    } else {
                        // New item
                        return {
                            items: [...state.items, { ...newItem, quantity: 1 }],
                            isOpen: true,
                        };
                    }
                });
            },

            removeItem: (id, size) => {
                set((state) => ({
                    items: state.items.filter(
                        (item) => !(item.id === id && item.size === size)
                    ),
                }));
            },

            updateQuantity: (id, quantity, size) => {
                set((state) => ({
                    items: state.items.map((item) => {
                        if (item.id === id && item.size === size) {
                            const max = item.maxQuantity || 99;
                            return { ...item, quantity: Math.min(Math.max(1, quantity), max) };
                        }
                        return item;
                    }),
                }));
            },

            clearCart: () => set({ items: [], coupon: null }),

            toggleCart: (open) => set((state) => ({
                isOpen: open !== undefined ? open : !state.isOpen
            })),

            applyCoupon: (coupon) => set({ coupon }),
            removeCoupon: () => set({ coupon: null }),

            getSubtotal: () => {
                return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
            },

            getDiscountAmount: () => {
                const subtotal = get().getSubtotal();
                const coupon = get().coupon;

                if (!coupon) return 0;

                if (coupon.discount_type === 'percentage') {
                    return Number(((subtotal * coupon.discount_value) / 100).toFixed(2));
                } else {
                    return Math.min(coupon.discount_value, subtotal); // Don't discount more than the cart value
                }
            },

            getCartTotal: () => {
                const subtotal = get().getSubtotal();
                const discount = get().getDiscountAmount();
                return Math.max(0, subtotal - discount);
            },

            getCartCount: () => {
                return get().items.reduce((count, item) => count + item.quantity, 0);
            },
        }),
        {
            name: "wusha-cart-storage",
            // Persist items + coupon, skip UI state like isOpen
            partialize: (state) => ({ items: state.items, coupon: state.coupon }),
        }
    )
);
