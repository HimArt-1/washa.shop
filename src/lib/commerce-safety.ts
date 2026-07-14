export const FALLBACK_PRODUCT_IMAGE = "/icon-512.png";

const ALLOWED_REMOTE_IMAGE_HOSTS = new Set([
    "images.unsplash.com",
    "plus.unsplash.com",
    "placeholder.com",
    "img.clerk.com",
    "replicate.delivery",
    "pbxt.replicate.delivery",
]);

const SAME_APP_HOSTS = new Set(["washa.shop", "www.washa.shop", "localhost", "127.0.0.1"]);
const CART_TYPES = new Set(["product", "artwork", "custom_design"]);
const MAX_CART_QUANTITY = 9999;

export type CommerceCartItemType = "product" | "artwork" | "custom_design";

export interface CommerceCartItem {
    id: string;
    title: string;
    price: number;
    image_url: string;
    artist_name: string;
    quantity: number;
    size?: string | null;
    colorCode?: string | null;
    type: CommerceCartItemType;
    maxQuantity?: number;
    customDesignUrl?: string;
    customDesignOrderId?: string;
    customDesignTrackerToken?: string;
    customGarment?: string;
    customPosition?: string;
}

function toCleanString(value: unknown, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getConfiguredSupabaseHost() {
    try {
        const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        return configuredUrl ? new URL(configuredUrl).hostname : null;
    } catch {
        return null;
    }
}

function getConfiguredAppHost() {
    try {
        const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
        return configuredUrl ? new URL(configuredUrl).hostname : null;
    } catch {
        return null;
    }
}

function isAllowedRemoteImageHost(hostname: string) {
    const supabaseHost = getConfiguredSupabaseHost();
    return ALLOWED_REMOTE_IMAGE_HOSTS.has(hostname) || Boolean(supabaseHost && hostname === supabaseHost);
}

export function sanitizeCommerceImageUrl(value: unknown, fallback = FALLBACK_PRODUCT_IMAGE) {
    const raw = toCleanString(value);
    if (!raw) return fallback;

    if (raw.startsWith("/") && !raw.startsWith("//")) {
        return raw;
    }

    try {
        const url = new URL(raw);
        if (url.protocol !== "https:" && url.protocol !== "http:") return fallback;

        const appHost = getConfiguredAppHost();
        if (SAME_APP_HOSTS.has(url.hostname) || (appHost && url.hostname === appHost)) {
            return `${url.pathname}${url.search}`;
        }

        if (url.protocol === "https:" && isAllowedRemoteImageHost(url.hostname)) {
            return url.toString();
        }
    } catch {
        return fallback;
    }

    return fallback;
}

export function sanitizeOptionalCommerceImageUrl(value: unknown) {
    const sanitized = sanitizeCommerceImageUrl(value, "");
    return sanitized || null;
}

export function normalizeCartColor(value: unknown) {
    const raw = toCleanString(value);
    if (!raw) return null;

    const normalized = raw.startsWith("#") ? raw.toLowerCase() : `#${raw.toLowerCase()}`;
    return /^#[0-9a-f]{3,8}$/.test(normalized) ? normalized : null;
}

export function normalizeCartOption(value: unknown) {
    const raw = toCleanString(value);
    return raw ? raw.slice(0, 80) : null;
}

export function normalizeCartMoney(value: unknown, fallback = 0) {
    const amount = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(amount) || amount < 0) return fallback;
    return Math.round(amount * 100) / 100;
}

export function normalizeCartQuantity(value: unknown, maxQuantity?: unknown) {
    const rawQuantity = typeof value === "number" ? value : Number(value);
    const rawMax = typeof maxQuantity === "number" ? maxQuantity : Number(maxQuantity);
    const max = Number.isFinite(rawMax) && rawMax > 0
        ? Math.min(MAX_CART_QUANTITY, Math.floor(rawMax))
        : 1;
    const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0
        ? Math.floor(rawQuantity)
        : 1;

    return Math.min(Math.max(1, quantity), max);
}

export function normalizeCartMaxQuantity(value: unknown) {
    if (value === undefined || value === null || value === "") return 1;
    const max = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(max) || max <= 0) return 0;
    return Math.min(MAX_CART_QUANTITY, Math.max(1, Math.floor(max)));
}

export function getCartItemKey(item: Pick<CommerceCartItem, "id" | "size" | "colorCode">) {
    return `${item.id}_${item.size ?? ""}_${item.colorCode ?? ""}`;
}

export function sanitizeCartItem(value: unknown): CommerceCartItem | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;

    const item = value as Record<string, unknown>;
    const id = toCleanString(item.id).slice(0, 160);
    if (!id) return null;

    const rawType = toCleanString(item.type, "product");
    const type = (CART_TYPES.has(rawType) ? rawType : "product") as CommerceCartItemType;
    const maxQuantity = normalizeCartMaxQuantity(item.maxQuantity);
    if (maxQuantity <= 0) return null;
    const quantity = normalizeCartQuantity(item.quantity, maxQuantity);

    const customDesignUrl = type === "custom_design"
        ? sanitizeOptionalCommerceImageUrl(item.customDesignUrl)
        : null;

    return {
        id,
        title: toCleanString(item.title, "منتج وشّى").slice(0, 180),
        price: normalizeCartMoney(item.price),
        image_url: sanitizeCommerceImageUrl(item.image_url || customDesignUrl),
        artist_name: toCleanString(item.artist_name, "وشّى").slice(0, 120),
        quantity,
        size: normalizeCartOption(item.size),
        colorCode: normalizeCartColor(item.colorCode),
        type,
        maxQuantity,
        ...(customDesignUrl ? { customDesignUrl } : {}),
        ...(type === "custom_design" && toCleanString(item.customDesignOrderId)
            ? { customDesignOrderId: toCleanString(item.customDesignOrderId).slice(0, 160) }
            : {}),
        ...(type === "custom_design" && toCleanString(item.customDesignTrackerToken)
            ? { customDesignTrackerToken: toCleanString(item.customDesignTrackerToken).slice(0, 240) }
            : {}),
        ...(type === "custom_design" && toCleanString(item.customGarment)
            ? { customGarment: toCleanString(item.customGarment).slice(0, 80) }
            : {}),
        ...(type === "custom_design" && toCleanString(item.customPosition)
            ? { customPosition: toCleanString(item.customPosition).slice(0, 80) }
            : {}),
    };
}

export function sanitizeCartItems(value: unknown): CommerceCartItem[] {
    if (!Array.isArray(value)) return [];

    const merged = new Map<string, CommerceCartItem>();
    for (const rawItem of value) {
        const item = sanitizeCartItem(rawItem);
        if (!item) continue;

        const key = getCartItemKey(item);
        const existing = merged.get(key);
        if (!existing) {
            merged.set(key, item);
            continue;
        }

        const maxQuantity = Math.max(existing.maxQuantity ?? 1, item.maxQuantity ?? 1);
        merged.set(key, {
            ...existing,
            ...item,
            quantity: normalizeCartQuantity(existing.quantity + item.quantity, maxQuantity),
            maxQuantity,
        });
    }

    return Array.from(merged.values());
}

export function cartItemsSignature(items: unknown) {
    return JSON.stringify(
        sanitizeCartItems(items).map((item) => ({
            id: item.id,
            title: item.title,
            price: item.price,
            image_url: item.image_url,
            artist_name: item.artist_name,
            quantity: item.quantity,
            size: item.size ?? null,
            colorCode: item.colorCode ?? null,
            type: item.type,
            maxQuantity: item.maxQuantity ?? null,
            customDesignUrl: item.customDesignUrl ?? null,
            customDesignOrderId: item.customDesignOrderId ?? null,
            customDesignTrackerToken: item.customDesignTrackerToken ?? null,
            customGarment: item.customGarment ?? null,
            customPosition: item.customPosition ?? null,
        }))
    );
}
