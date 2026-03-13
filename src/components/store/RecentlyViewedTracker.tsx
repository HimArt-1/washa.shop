"use client";

import { useEffect } from "react";

export interface RecentlyViewedItem {
    id: string;
    title: string;
    price: number;
    image_url: string;
    type: string;
}

const KEY = "wusha-recently-viewed";
const MAX = 8;

export function saveRecentlyViewed(item: RecentlyViewedItem) {
    try {
        const raw = localStorage.getItem(KEY);
        const list: RecentlyViewedItem[] = raw ? JSON.parse(raw) : [];
        const filtered = list.filter(p => p.id !== item.id);
        const updated = [item, ...filtered].slice(0, MAX);
        localStorage.setItem(KEY, JSON.stringify(updated));
    } catch { /* fail silently */ }
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

export function RecentlyViewedTracker({ product }: { product: RecentlyViewedItem }) {
    useEffect(() => {
        saveRecentlyViewed(product);
    }, [product.id]); // eslint-disable-line

    return null;
}
