/**
 * ═══════════════════════════════════════════════════════════
 *  وشّى | WASHA — SEO Structured Data Helpers
 *  JSON-LD schema generators for Google Rich Results
 *  Supports: Product, Artwork, Person, BreadcrumbList, WebSite
 * ═══════════════════════════════════════════════════════════
 */

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";
const SITE_NAME = "وشّى | WASHA";

// ─── Types ────────────────────────────────────────────────────

export interface ProductSchemaInput {
    id: string;
    title: string;
    description: string | null;
    price: number;
    original_price: number | null;
    currency: string;
    image_url: string;
    images: string[];
    in_stock: boolean;
    rating: number;
    reviews_count: number;
    badge: string | null;
    type: string;
    artist?: { display_name: string; username: string } | null;
}

export interface ArtworkSchemaInput {
    id: string;
    title: string;
    description: string | null;
    image_url: string;
    price: number | null;
    currency: string;
    medium: string | null;
    year: number | null;
    likes_count: number;
    artist?: { display_name: string; username: string; avatar_url?: string | null } | null;
}

export interface PersonSchemaInput {
    username: string;
    display_name: string;
    bio: string | null;
    avatar_url: string | null;
    total_artworks: number;
    total_sales: number;
    social_links?: {
        instagram?: string;
        twitter?: string;
    } | null;
}

export interface BreadcrumbItem {
    name: string;
    href: string;
}

// ─── Breadcrumb ────────────────────────────────────────────────

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": `${SITE_URL}${item.href}`,
        })),
    };
}

// ─── Product Schema ────────────────────────────────────────────

export function buildProductSchema(product: ProductSchemaInput) {
    const url = `${SITE_URL}/products/${product.id}`;
    const allImages = [product.image_url, ...product.images].filter(Boolean).slice(0, 5);

    const schema: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.title,
        "description": product.description || `منتج حصري من وشّى — ${product.title}`,
        "image": allImages,
        "url": url,
        "sku": product.id,
        "brand": {
            "@type": "Brand",
            "name": SITE_NAME,
        },
        "offers": {
            "@type": "Offer",
            "url": url,
            "priceCurrency": product.currency || "SAR",
            "price": product.price,
            "availability": product.in_stock
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            "itemCondition": "https://schema.org/NewCondition",
            "seller": {
                "@type": "Organization",
                "name": SITE_NAME,
            },
        },
    };

    // Add aggregate rating if reviews exist
    if (product.reviews_count > 0 && product.rating > 0) {
        schema["aggregateRating"] = {
            "@type": "AggregateRating",
            "ratingValue": product.rating.toFixed(1),
            "reviewCount": product.reviews_count,
            "bestRating": 5,
            "worstRating": 1,
        };
    }

    // Add creator if artist info available
    if (product.artist) {
        schema["creator"] = {
            "@type": "Person",
            "name": product.artist.display_name,
            "url": `${SITE_URL}/artists/${product.artist.username}`,
        };
    }

    // Add original price for discount markup
    if (product.original_price && product.original_price > product.price) {
        (schema["offers"] as Record<string, unknown>)["priceValidUntil"] =
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    }

    return schema;
}

// ─── Artwork Schema ────────────────────────────────────────────

export function buildArtworkSchema(artwork: ArtworkSchemaInput) {
    const url = `${SITE_URL}/artworks/${artwork.id}`;

    const schema: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "VisualArtwork",
        "name": artwork.title,
        "description": artwork.description || `عمل فني حصري في وشّى`,
        "image": artwork.image_url,
        "url": url,
        "artMedium": artwork.medium || "رقمي",
        "dateCreated": artwork.year ? `${artwork.year}` : undefined,
        "interactionStatistic": {
            "@type": "InteractionCounter",
            "interactionType": "https://schema.org/LikeAction",
            "userInteractionCount": artwork.likes_count,
        },
    };

    if (artwork.artist) {
        schema["creator"] = {
            "@type": "Person",
            "name": artwork.artist.display_name,
            "url": `${SITE_URL}/artists/${artwork.artist.username}`,
            ...(artwork.artist.avatar_url ? { "image": artwork.artist.avatar_url } : {}),
        };
    }

    if (artwork.price && artwork.price > 0) {
        schema["offers"] = {
            "@type": "Offer",
            "priceCurrency": artwork.currency || "SAR",
            "price": artwork.price,
            "availability": "https://schema.org/InStock",
            "url": url,
        };
    }

    return schema;
}

// ─── Person (Artist) Schema ────────────────────────────────────

export function buildPersonSchema(artist: PersonSchemaInput) {
    const url = `${SITE_URL}/artists/${artist.username}`;

    const schema: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": artist.display_name,
        "url": url,
        "description": artist.bio || `فنان في منصة وشّى`,
        "numberOfItems": artist.total_artworks,
    };

    if (artist.avatar_url) schema["image"] = artist.avatar_url;

    const sameAs: string[] = [];
    if (artist.social_links?.instagram)
        sameAs.push(`https://instagram.com/${artist.social_links.instagram.replace("@", "")}`);
    if (artist.social_links?.twitter)
        sameAs.push(`https://twitter.com/${artist.social_links.twitter.replace("@", "")}`);
    if (sameAs.length > 0) schema["sameAs"] = sameAs;

    return schema;
}

// ─── WebSite Schema (root) ─────────────────────────────────────

export function buildWebSiteSchema() {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": SITE_NAME,
        "url": SITE_URL,
        "description": "منصة فنية رقمية للأزياء — صمّم قطعتك الفريدة واكتشف أزياء عصرية مصممة بالذكاء الاصطناعي",
        "inLanguage": "ar",
        "potentialAction": {
            "@type": "SearchAction",
            "target": {
                "@type": "EntryPoint",
                "urlTemplate": `${SITE_URL}/search?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
        },
    };
}

// ─── Store (ItemList) Schema ───────────────────────────────────

export function buildItemListSchema(
    items: { id: string; title: string; image_url: string; price?: number }[],
    listName: string,
    basePath: string
) {
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": listName,
        "url": `${SITE_URL}${basePath}`,
        "numberOfItems": items.length,
        "itemListElement": items.slice(0, 20).map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "url": `${SITE_URL}${basePath}/${item.id}`,
            "name": item.title,
            "image": item.image_url,
        })),
    };
}

// ─── Inject helper ────────────────────────────────────────────

export function JsonLd({ schema }: { schema: Record<string, unknown> | Record<string, unknown>[] }) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
        />
    );
}
