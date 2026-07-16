function normalizeStock(value: unknown) {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.floor(parsed);
}

export function resolveLegacyProductStock(
    inStock: boolean | null | undefined,
    stockQuantity: number | null | undefined
) {
    if (inStock === false) return 0;
    return normalizeStock(stockQuantity);
}

export function resolveCartMaxQuantity(
    selectedVariantStock: number | null | undefined,
    legacyStock: number | null | undefined
) {
    if (selectedVariantStock !== undefined && selectedVariantStock !== null) {
        return normalizeStock(selectedVariantStock);
    }
    return normalizeStock(legacyStock);
}
