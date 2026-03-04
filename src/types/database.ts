// ═══════════════════════════════════════════════════════════
//  وشّى | WUSHA — Database Types
//  تعريفات TypeScript لجميع جداول قاعدة البيانات
// ═══════════════════════════════════════════════════════════

// ─── Enums ───────────────────────────────────────────────

export type UserRole = "admin" | "wushsha" | "subscriber";
/** مستويات الوشّاي (1–5) */
export type WushshaLevel = 1 | 2 | 3 | 4 | 5;
export type ArtworkStatus = "draft" | "pending" | "published" | "rejected" | "archived";
export type ProductType = "print" | "apparel" | "digital" | "nft" | "original";
export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type ApplicationStatus = "pending" | "reviewing" | "accepted" | "rejected";
export type ApparelSize = "XS" | "S" | "M" | "L" | "XL" | "XXL";

// ─── Base Types ──────────────────────────────────────────

export interface Timestamps {
    created_at: string;
    updated_at: string;
}

// ─── Profiles ────────────────────────────────────────────

export interface Profile extends Timestamps {
    id: string;                    // UUID — matches Clerk user ID
    clerk_id: string;              // Clerk user ID
    display_name: string;
    username: string;              // unique slug
    bio: string | null;
    avatar_url: string | null;
    cover_url: string | null;
    role: UserRole;
    wushsha_level?: WushshaLevel | null;  // 1–5 للوشّاي فقط
    website: string | null;
    social_links: SocialLinks | null;
    is_verified: boolean;
    total_sales: number;
    total_artworks: number;
}

export interface SocialLinks {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    behance?: string;
    dribbble?: string;
}

// ─── Categories ──────────────────────────────────────────

export interface Category {
    id: string;
    name_ar: string;              // الاسم بالعربية
    name_en: string;              // Name in English
    slug: string;                 // unique URL-friendly
    description: string | null;
    icon: string | null;
    sort_order: number;
}

// ─── Artworks ────────────────────────────────────────────

export interface Artwork extends Timestamps {
    id: string;
    artist_id: string;            // FK → profiles.id
    title: string;
    description: string | null;
    category_id: string | null;   // FK → categories.id
    image_url: string;
    thumbnail_url: string | null;
    medium: string | null;        // e.g., "رسم رقمي", "خط عربي"
    dimensions: string | null;    // e.g., "80×60 سم"
    year: number | null;
    tags: string[];
    price: number | null;         // null = غير معروض للبيع
    currency: string;             // SAR, USD, ETH
    status: ArtworkStatus;
    views_count: number;
    likes_count: number;
    is_featured: boolean;
}

// ─── Products ────────────────────────────────────────────

export interface Product extends Timestamps {
    id: string;
    artwork_id: string | null;    // FK → artworks.id (if based on artwork)
    artist_id: string;            // FK → profiles.id
    title: string;
    description: string | null;
    type: ProductType;
    price: number;
    original_price: number | null; // before discount
    currency: string;
    image_url: string;
    images: string[];             // additional images
    sizes: ApparelSize[] | null;  // for apparel
    in_stock: boolean;
    stock_quantity: number | null;
    rating: number;               // average rating
    reviews_count: number;
    badge: string | null;         // e.g., "محدود", "NFT", "جديد"
    is_featured: boolean;
}

// ─── Orders ──────────────────────────────────────────────

export interface Order extends Timestamps {
    id: string;
    buyer_id: string;             // FK → profiles.id
    order_number: string;         // human-readable order number
    status: OrderStatus;
    payment_status: PaymentStatus;
    subtotal: number;
    shipping_cost: number;
    tax: number;
    total: number;
    currency: string;
    shipping_address: ShippingAddress | null;
    notes: string | null;
}

export interface ShippingAddress {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
    phone?: string;
}

export interface OrderItem {
    id: string;
    order_id: string;             // FK → orders.id
    product_id: string;           // FK → products.id
    quantity: number;
    size: ApparelSize | null;
    unit_price: number;
    total_price: number;
}

// ─── Applications ────────────────────────────────────────

export interface Application extends Timestamps {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    portfolio_url: string | null;
    instagram_url: string | null;
    art_style: string;
    experience_years: number | null;
    portfolio_images: string[];
    motivation: string;           // لماذا تريد الانضمام
    status: ApplicationStatus;
    reviewer_id: string | null;   // FK → profiles.id (admin)
    reviewer_notes: string | null;
}

// ─── Likes (Many-to-Many) ────────────────────────────────

export interface ArtworkLike {
    user_id: string;              // FK → profiles.id
    artwork_id: string;           // FK → artworks.id
    created_at: string;
}

// ─── Artist Follows ───────────────────────────────────────

export interface ArtistFollow {
    id: string;
    follower_id: string;
    artist_id: string;
    created_at: string;
}

// ─── Product Wishlist ────────────────────────────────────

export interface ProductWishlistItem {
    id: string;
    user_id: string;
    product_id: string;
    created_at: string;
}

// ─── Product Likes ───────────────────────────────────────

export interface ProductLike {
    id: string;
    user_id: string;
    product_id: string;
    created_at: string;
}

// ─── Newsletter ──────────────────────────────────────────

export interface NewsletterSubscriber {
    id: string;
    email: string;
    subscribed_at: string;
    is_active: boolean;
}

// ─── Smart Store (صمم قطعتك) ─────────────────────────────

export interface CustomDesignGarment {
    id: string;
    name: string;
    slug: string;
    image_url: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CustomDesignColor {
    id: string;
    garment_id: string;
    name: string;
    hex_code: string;
    image_url: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CustomDesignSize {
    id: string;
    garment_id: string;
    color_id: string | null;
    name: string;
    image_front_url: string | null;
    image_back_url: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CustomDesignStyle {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CustomDesignArtStyle {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CustomDesignColorPackage {
    id: string;
    name: string;
    colors: { hex: string; name: string }[];
    image_url: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// ─── Database Schema (Supabase-compatible) ───────────────

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: Omit<Profile, "id" | "created_at" | "updated_at" | "total_sales" | "total_artworks" | "is_verified" | "social_links"> & { is_verified?: boolean; social_links?: SocialLinks | null };
                Update: Partial<Omit<Profile, "id" | "created_at">>;
            };
            categories: {
                Row: Category;
                Insert: Omit<Category, "id" | "sort_order"> & { sort_order?: number };
                Update: Partial<Omit<Category, "id">>;
            };
            artworks: {
                Row: Artwork;
                Insert: Partial<Artwork>;
                Update: Partial<Omit<Artwork, "id" | "created_at" | "artist_id">>;
            };
            products: {
                Row: Product;
                Insert: Omit<Product, "id" | "created_at" | "updated_at" | "reviews_count" | "is_featured" | "in_stock" | "rating" | "images"> & { is_featured?: boolean; in_stock?: boolean; rating?: number; images?: string[] };
                Update: Partial<Omit<Product, "id" | "created_at" | "artist_id">>;
            };
            orders: {
                Row: Order;
                Insert: Omit<Order, "id" | "created_at" | "updated_at" | "order_number" | "status" | "payment_status" | "shipping_cost" | "tax"> & { status?: OrderStatus; payment_status?: PaymentStatus; shipping_cost?: number; tax?: number };
                Update: Partial<Omit<Order, "id" | "created_at" | "buyer_id">>;
            };
            order_items: {
                Row: OrderItem;
                Insert: Omit<OrderItem, "id" | "quantity"> & { quantity?: number };
                Update: Partial<Omit<OrderItem, "id" | "order_id">>;
            };
            applications: {
                Row: Application;
                Insert: Omit<Application, "id" | "created_at" | "updated_at" | "status" | "reviewer_id" | "reviewer_notes" | "portfolio_images"> & { portfolio_images?: string[] };
                Update: Partial<Omit<Application, "id" | "created_at">>;
            };
            artwork_likes: {
                Row: ArtworkLike;
                Insert: Omit<ArtworkLike, "created_at">;
                Update: never;
            };
            newsletter_subscribers: {
                Row: NewsletterSubscriber;
                Insert: Omit<NewsletterSubscriber, "id" | "subscribed_at" | "is_active"> & { is_active?: boolean };
                Update: Partial<Omit<NewsletterSubscriber, "id" | "subscribed_at">>;
            };
            custom_design_garments: {
                Row: CustomDesignGarment;
                Insert: Omit<CustomDesignGarment, "id" | "created_at" | "updated_at" | "sort_order" | "is_active"> & { sort_order?: number; is_active?: boolean };
                Update: Partial<Omit<CustomDesignGarment, "id" | "created_at">>;
            };
            custom_design_colors: {
                Row: CustomDesignColor;
                Insert: Omit<CustomDesignColor, "id" | "created_at" | "updated_at" | "sort_order" | "is_active"> & { sort_order?: number; is_active?: boolean };
                Update: Partial<Omit<CustomDesignColor, "id" | "created_at">>;
            };
            custom_design_sizes: {
                Row: CustomDesignSize;
                Insert: Omit<CustomDesignSize, "id" | "created_at" | "updated_at" | "is_active"> & { is_active?: boolean };
                Update: Partial<Omit<CustomDesignSize, "id" | "created_at">>;
            };
            custom_design_styles: {
                Row: CustomDesignStyle;
                Insert: Omit<CustomDesignStyle, "id" | "created_at" | "updated_at" | "sort_order" | "is_active"> & { sort_order?: number; is_active?: boolean };
                Update: Partial<Omit<CustomDesignStyle, "id" | "created_at">>;
            };
            custom_design_art_styles: {
                Row: CustomDesignArtStyle;
                Insert: Omit<CustomDesignArtStyle, "id" | "created_at" | "updated_at" | "sort_order" | "is_active"> & { sort_order?: number; is_active?: boolean };
                Update: Partial<Omit<CustomDesignArtStyle, "id" | "created_at">>;
            };
            custom_design_color_packages: {
                Row: CustomDesignColorPackage;
                Insert: Omit<CustomDesignColorPackage, "id" | "created_at" | "updated_at" | "sort_order" | "is_active"> & { sort_order?: number; is_active?: boolean };
                Update: Partial<Omit<CustomDesignColorPackage, "id" | "created_at">>;
            };
            custom_design_orders: {
                Row: CustomDesignOrder;
                Insert: Omit<CustomDesignOrder, "id" | "created_at" | "updated_at" | "order_number" | "status" | "skip_results"> & { status?: CustomDesignOrderStatus; skip_results?: boolean };
                Update: Partial<Omit<CustomDesignOrder, "id" | "created_at" | "order_number">>;
            };
            custom_design_settings: {
                Row: CustomDesignSettings;
                Insert: Partial<CustomDesignSettings>;
                Update: Partial<CustomDesignSettings>;
            };
        };
    };
}

// ─── Design Order Types ──────────────────────────────────

export type CustomDesignOrderStatus = "new" | "in_progress" | "awaiting_review" | "completed" | "cancelled";

export interface CustomDesignOrder {
    id: string;
    order_number: number;

    // Customer
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;

    // Selections
    garment_name: string;
    garment_image_url: string | null;
    color_name: string;
    color_hex: string;
    color_image_url: string | null;
    size_name: string;

    // Design Method
    design_method: "from_text" | "from_image";
    text_prompt: string | null;
    reference_image_url: string | null;

    // Style
    style_name: string;
    style_image_url: string | null;
    art_style_name: string;
    art_style_image_url: string | null;

    // Colors
    color_package_name: string | null;
    custom_colors: any[];

    // AI Prompt
    ai_prompt: string;

    // Results
    result_design_url: string | null;
    result_mockup_url: string | null;
    result_pdf_url: string | null;

    // Workflow
    status: CustomDesignOrderStatus;
    skip_results: boolean;
    admin_notes: string | null;
    assigned_to: string | null;

    // Timestamps
    created_at: string;
    updated_at: string;
}

export interface CustomDesignSettings {
    id: string;
    ai_prompt_template: string;
    updated_at: string;
}
