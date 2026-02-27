import { create } from "zustand";
import { persist } from "zustand/middleware";

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
    addItem: (item: Omit<CartItem, "quantity">) => void;
    removeItem: (id: string, size?: string | null) => void;
    updateQuantity: (id: string, quantity: number, size?: string | null) => void;
    clearCart: () => void;
    toggleCart: (open?: boolean) => void;
    getCartTotal: () => number;
    getCartCount: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            isOpen: false,

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

            clearCart: () => set({ items: [] }),

            toggleCart: (open) => set((state) => ({
                isOpen: open !== undefined ? open : !state.isOpen
            })),

            getCartTotal: () => {
                return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
            },

            getCartCount: () => {
                return get().items.reduce((count, item) => count + item.quantity, 0);
            },
        }),
        {
            name: "wusha-cart-storage",
            // Only persist items, not UI state like isOpen
            partialize: (state) => ({ items: state.items }),
        }
    )
);
