"use client";

import { useEffect } from "react";
import { normalizeCartMoney, sanitizeCommerceImageUrl } from "@/lib/commerce-safety";

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
        const safeItem = sanitizeRecentlyViewedItem(item);
        if (!safeItem) return;
        const filtered = sanitizeRecentlyViewedItems(list).filter(p => p.id !== safeItem.id);
        const updated = [safeItem, ...filtered].slice(0, MAX);
        localStorage.setItem(KEY, JSON.stringify(updated));
    } catch { /* fail silently */ }
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
    try {
        const raw = localStorage.getItem(KEY);
        return sanitizeRecentlyViewedItems(raw ? JSON.parse(raw) : []);
    } catch { return []; }
}

export function sanitizeRecentlyViewedItem(value: unknown): RecentlyViewedItem | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const item = value as Partial<RecentlyViewedItem>;
    const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : "";
    if (!id) return null;

    return {
        id,
        title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : "منتج وشّى",
        price: normalizeCartMoney(item.price),
        image_url: sanitizeCommerceImageUrl(item.image_url),
        type: typeof item.type === "string" && item.type.trim() ? item.type.trim() : "product",
    };
}

export function sanitizeRecentlyViewedItems(value: unknown): RecentlyViewedItem[] {
    if (!Array.isArray(value)) return [];
    return value
        .map(sanitizeRecentlyViewedItem)
        .filter((item): item is RecentlyViewedItem => Boolean(item))
        .slice(0, MAX);
}

export function RecentlyViewedTracker({ product }: { product: RecentlyViewedItem }) {
    useEffect(() => {
        saveRecentlyViewed(product);
    }, [product.id]);

    return null;
}
