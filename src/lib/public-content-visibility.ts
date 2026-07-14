export type PublicSearchTab = "artworks" | "products" | "artists";

type PublicContentVisibility = {
    gallery?: boolean;
    store?: boolean;
};

export function getVisiblePublicSearchTabs(visibility: PublicContentVisibility): PublicSearchTab[] {
    const tabs: PublicSearchTab[] = [];
    if (visibility.gallery !== false) tabs.push("artworks");
    if (visibility.store !== false) tabs.push("products");
    if (visibility.gallery !== false) tabs.push("artists");
    return tabs;
}

export function isPublicSearchTabVisible(tab: PublicSearchTab, visibility: PublicContentVisibility) {
    return getVisiblePublicSearchTabs(visibility).includes(tab);
}
