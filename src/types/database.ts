import type {
    DesignColorToken,
    DesignIntelligenceMetadata,
    DesignOptionCompatibility,
    DesignPreset,
} from "@/lib/design-intelligence";

// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Database Types
//  تعريفات TypeScript لجميع جداول قاعدة البيانات
// ═══════════════════════════════════════════════════════════

// ─── Enums ───────────────────────────────────────────────

/**
 * أدوار المستخدمين في وشّى:
 * - subscriber : الدور الافتراضي لكل مستخدم جديد
 * - wushsha    : فنان/مصمم معتمد، يتجاوز حصة DTF اليومية ويحمل wushsha_level
 * - admin      : مدير النظام، صلاحيات كاملة
 * - dev        : حساب تطوير/اختبار داخلي، يتجاوز rate limiter والحصص تماماً —
 *               يُسنَد يدوياً من الإدارة فقط، ولا يظهر للمستخدمين العاديين
 */
export type UserRole = "admin" | "wushsha" | "subscriber" | "dev" | "shipping_manager" | "financial_manager" | "support_agent" | "booth";
/** مستويات الوشّاي (1–5) */
export type WushshaLevel = 1 | 2 | 3 | 4 | 5;
export type ArtworkStatus = "draft" | "pending" | "published" | "rejected" | "archived";
export type ProductType = "print" | "apparel" | "digital" | "nft" | "original";
export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type ApplicationStatus = "pending" | "reviewing" | "accepted" | "rejected";
export type ApparelSize = "XS" | "S" | "M" | "L" | "XL" | "XXL";
export type PushSubscriptionScope = "user" | "admin";
export type StoredPushSubscriptionScope = PushSubscriptionScope | "both";
export type CreativeCatalogScope = "design_piece" | "dtf_studio" | "shared";

// ─── Base Types ──────────────────────────────────────────

export type Timestamps = {
    created_at: string;
    updated_at: string;
}

// ─── Profiles ────────────────────────────────────────────

export type Profile = Timestamps & {
    id: string;                    // UUID — matches Clerk user ID
    clerk_id: string;              // Clerk user ID
    display_name: string;
    username: string;              // unique slug
    email: string | null;
    phone: string | null;
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

export type SocialLinks = {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    behance?: string;
    dribbble?: string;
}

// ─── Role Change Audit Log ───────────────────────────────

export type RoleAuditContext = "admin_action" | "webhook_created" | "bootstrap" | "system" | "unknown";

export type RoleChangeAuditLog = {
    id: string;
    profile_id: string | null;
    old_role: string | null;
    new_role: string;
    changed_by_id: string | null;
    context: RoleAuditContext;
    metadata: Record<string, unknown> | null;
    changed_at: string;
}

// ─── Categories ──────────────────────────────────────────

export type Category = {
    id: string;
    name_ar: string;              // الاسم بالعربية
    name_en: string;              // Name in English
    slug: string;                 // unique URL-friendly
    description: string | null;
    icon: string | null;
    sort_order: number;
}

// ─── Artworks ────────────────────────────────────────────

export type Artwork = Timestamps & {
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

export type Product = {
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
    created_at: string;
    updated_at: string;
}

// ─── Orders ──────────────────────────────────────────────

export type DiscountCoupon = Timestamps & {
    id: string;
    code: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    is_active: boolean;
    max_uses: number;
    current_uses: number;
    valid_until: string | null;
    details: string | null;
}

export type Order = Timestamps & {
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
    coupon_id: string | null;     // FK → discount_coupons.id
    discount_amount: number;
    tracking_number: string | null;
    courier_name: string | null;
    waybill_url: string | null;
    torod_order_id: string | null;
}

export type ShippingAddress = {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
    phone?: string;
}

export type OrderItem = {
    id: string;
    order_id: string;             // FK → orders.id
    product_id: string | null;    // FK → products.id (null for custom designs)
    quantity: number;
    size: ApparelSize | null;
    unit_price: number;
    total_price: number;
    custom_design_url?: string;
    custom_garment?: string | null;
    custom_title?: string | null;
    custom_position?: string | null;
}

// ─── Admin Notifications ───────────────────────────────────

export type AdminNotificationType = "order_new" | "application_new" | "payment_received" | "order_status" | "order_alert" | "system_alert" | "order_update";
export type AdminNotificationCategory = "orders" | "payments" | "applications" | "support" | "design" | "system" | "security";
export type AdminNotificationSeverity = "info" | "warning" | "critical";

export type AdminNotification = {
    id: string;
    type: AdminNotificationType;
    category: AdminNotificationCategory;
    severity: AdminNotificationSeverity;
    title: string;
    message: string | null;
    link: string | null;
    metadata: Record<string, unknown>;
    is_read: boolean;
    created_at: string;
}

// ─── User Notifications ────────────────────────────────────

export type UserNotificationType = "order_update" | "support_reply" | "system_alert" | "design_order_update";

export type UserNotification = {
    id: string;
    user_id: string;              // FK → profiles.id
    type: UserNotificationType | string;
    title: string;
    message: string;
    link: string | null;
    is_read: boolean;
    metadata: Record<string, unknown>;
    created_at: string;
}

// ─── Support Tickets & Messages ──────────────────────────

export type SupportTicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type SupportTicketPriority = "low" | "normal" | "high";

export type SupportTicket = Timestamps & {
    id: string;
    user_id: string | null;       // FK → profiles.id (Null for guests)
    name: string | null;          // For guests/contact form
    email: string | null;         // For guests/contact form
    subject: string;
    message: string | null;       // Initial message body from the form
    status: SupportTicketStatus;
    priority: SupportTicketPriority;
}

export type SupportMessage = Timestamps & {
    id: string;
    ticket_id: string;            // FK → support_tickets.id
    sender_id: string;            // FK → profiles.id
    message: string;
    is_admin_reply: boolean;
}

// ─── Applications ────────────────────────────────────────

export type Application = Timestamps & {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    join_type: "artist" | "designer" | "model" | "customer" | "partner" | null;
    gender: "male" | "female" | null;
    birth_date: string | null;
    portfolio_url: string | null;
    instagram_url: string | null;
    art_style: string;
    experience_years: number | null;
    portfolio_images: string[];
    motivation: string;           // لماذا تريد الانضمام
    status: ApplicationStatus;
    reviewer_id: string | null;   // FK → profiles.id (admin)
    reviewer_notes: string | null;
    profile_id: string | null;    // FK → profiles.id (created user)
}

// ─── Likes (Many-to-Many) ────────────────────────────────

export type ArtworkLike = {
    user_id: string;              // FK → profiles.id
    artwork_id: string;           // FK → artworks.id
    created_at: string;
}

// ─── Artist Follows ───────────────────────────────────────

export type ArtistFollow = {
    id: string;
    follower_id: string;
    artist_id: string;
    created_at: string;
}

// ─── Product Wishlist ────────────────────────────────────

export type ProductWishlistItem = {
    id: string;
    user_id: string;
    product_id: string;
    created_at: string;
}

// ─── Product Likes ───────────────────────────────────────

export type ProductLike = {
    id: string;
    user_id: string;
    product_id: string;
    created_at: string;
}

// ─── Newsletter ──────────────────────────────────────────

export type NewsletterSubscriber = {
    id: string;
    email: string;
    subscribed_at: string;
    is_active: boolean;
}

// ─── Smart Store (صمم قطعتك) ─────────────────────────────

export type CustomDesignGarment = {
    id: string;
    name: string;
    slug: string;
    image_url: string | null;
    sort_order: number;
    is_active: boolean;
    base_price: number;
    // Print Pricing
    price_chest_large: number;
    price_chest_small: number;
    price_back_large: number;
    price_back_small: number;
    price_shoulder_large: number;
    price_shoulder_small: number;
    created_at: string;
    updated_at: string;
}

export type CustomDesignColor = {
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

export type CustomDesignSize = {
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

export type CustomDesignStyle = {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    catalog_scope: CreativeCatalogScope;
    metadata: DesignIntelligenceMetadata;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type CustomDesignArtStyle = {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    catalog_scope: CreativeCatalogScope;
    metadata: DesignIntelligenceMetadata;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type CustomDesignColorPackage = {
    id: string;
    name: string;
    colors: DesignColorToken[];
    image_url: string | null;
    catalog_scope: CreativeCatalogScope;
    metadata: DesignIntelligenceMetadata;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type CustomDesignStudioItem = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    main_image_url: string | null;
    mockup_image_url: string | null;
    model_image_url: string | null;
    metadata: DesignIntelligenceMetadata;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type GarmentStudioMockup = {
    id: string;
    garment_id: string;
    studio_item_id: string;
    mockup_front_url: string | null;
    mockup_back_url: string | null;
    mockup_model_url: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export type CustomDesignPreset = DesignPreset;
export type CustomDesignOptionCompatibility = DesignOptionCompatibility;
export type DtfDesignHistory = {
    id: string;
    profile_id: string;
    garment_type: string;
    garment_color: string;
    style: string;
    technique: string;
    palette: string;
    prompt: string;
    thumbnail_path: string | null;
    thumbnail_url: string | null;
    created_at: string;
}

export type DtfStudioActivityLog = {
    id: string;
    profile_id: string | null;
    clerk_id: string | null;
    action: string;
    status: string;
    prompt: string | null;
    reference_image_url: string | null;
    result_image_url: string | null;
    error_message: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

// ─── ERP (Inventory, SKUs, Sales) ────────────────────────

export type ProductSKU = Timestamps & {
    id: string;
    product_id: string;
    sku: string;
    size: string | null;
    color_code: string | null;
    barcode_url: string | null;
}

export type Warehouse = Timestamps & {
    id: string;
    name: string;
    location: string | null;
    is_active: boolean;
}

export type InventoryLevel = Timestamps & {
    id: string;
    sku_id: string;
    warehouse_id: string;
    quantity: number;
}

export type InventoryTransactionType = 'addition' | 'sale' | 'adjustment' | 'transfer' | 'return';

export type InventoryTransaction = {
    id: string;
    sku_id: string;
    warehouse_id: string;
    transaction_type: InventoryTransactionType;
    quantity_change: number;
    previous_quantity: number;
    new_quantity: number;
    reference_id: string | null;
    notes: string | null;
    created_by: string | null;
    created_at: string;
}

export type SalesMethodType = 'online_store' | 'booth_manual' | 'custom_design';

export type SalesRecord = Timestamps & {
    id: string;
    sales_method: SalesMethodType;
    order_id: string | null;
    sku_id: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    status: string;
    notes: string | null;
    created_by: string | null;
}

// ─── Database Schema (Supabase-compatible) ───────────────

export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: Omit<Profile, "id" | "created_at" | "updated_at" | "total_sales" | "total_artworks" | "is_verified" | "social_links" | "email" | "phone"> & { is_verified?: boolean; social_links?: SocialLinks | null; email?: string | null; phone?: string | null };
                Update: Partial<Omit<Profile, "id" | "created_at">>;
                Relationships: any[];
            };
            categories: {
                Row: Category;
                Insert: Omit<Category, "id" | "sort_order"> & { sort_order?: number };
                Update: Partial<Omit<Category, "id">>;
                Relationships: any[];
            };
            artworks: {
                Row: Artwork;
                Insert: Omit<Artwork, "id" | "created_at" | "updated_at" | "views_count" | "likes_count" | "rating" | "reviews_count" | "is_featured" | "description" | "category_id" | "thumbnail_url" | "medium" | "dimensions" | "year" | "price"> & {
                    views_count?: number;
                    likes_count?: number;
                    rating?: number;
                    reviews_count?: number;
                    is_featured?: boolean;
                    description?: string | null;
                    category_id?: string | null;
                    thumbnail_url?: string | null;
                    medium?: string | null;
                    dimensions?: string | null;
                    year?: number | null;
                    price?: number | null;
                };
                Update: Partial<Omit<Artwork, "id" | "created_at">>;
                Relationships: [
                    {
                        foreignKeyName: "artworks_artist_id_fkey";
                        columns: ["artist_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "artworks_category_id_fkey";
                        columns: ["category_id"];
                        isOneToOne: false;
                        referencedRelation: "categories";
                        referencedColumns: ["id"];
                    }
                ];
            };
            products: {
                Row: Product;
                Insert: Omit<Product, "id" | "created_at" | "updated_at" | "reviews_count" | "is_featured" | "in_stock" | "rating" | "images"> & { is_featured?: boolean; in_stock?: boolean; rating?: number; images?: string[] };
                Update: Partial<Omit<Product, "id" | "created_at" | "artist_id">>;
                Relationships: [
                    {
                        foreignKeyName: "products_artist_id_fkey";
                        columns: ["artist_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    }
                ];
            };
            discount_coupons: {
                Row: DiscountCoupon;
                Insert: Omit<DiscountCoupon, "id" | "current_uses" | "created_at" | "updated_at"> & {
                    id?: string;
                    current_uses?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<Omit<DiscountCoupon, "id" | "created_at">>;
                Relationships: any[];
            };
            orders: {
                Row: Order;
                Insert: Omit<Order, "id" | "created_at" | "updated_at" | "order_number" | "status" | "payment_status" | "shipping_cost" | "tax" | "discount_amount" | "tracking_number" | "courier_name" | "waybill_url" | "torod_order_id"> & { 
                    status?: OrderStatus; 
                    payment_status?: PaymentStatus; 
                    shipping_cost?: number; 
                    tax?: number; 
                    discount_amount?: number; 
                    coupon_id?: string | null;
                    tracking_number?: string | null;
                    courier_name?: string | null;
                    waybill_url?: string | null;
                    torod_order_id?: string | null;
                };
                Update: Partial<Omit<Order, "id" | "created_at" | "buyer_id">>;
                Relationships: [
                    {
                        foreignKeyName: "orders_buyer_id_fkey";
                        columns: ["buyer_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "order_items_order_id_fkey";
                        columns: ["id"];
                        isOneToOne: false;
                        referencedRelation: "order_items";
                        referencedColumns: ["order_id"];
                    }
                ];
            };
            order_items: {
                Row: OrderItem;
                Insert: Omit<OrderItem, "id" | "quantity" | "size" | "custom_design_url" | "custom_garment" | "custom_title" | "custom_position"> & {
                    quantity?: number;
                    size: string | null;
                    custom_design_url?: string;
                    custom_garment?: string | null;
                    custom_title?: string | null;
                    custom_position?: string | null;
                };
                Update: Partial<Omit<OrderItem, "id" | "order_id">>;
                Relationships: [
                    {
                        foreignKeyName: "order_items_product_id_fkey";
                        columns: ["product_id"];
                        isOneToOne: false;
                        referencedRelation: "products";
                        referencedColumns: ["id"];
                    }
                ];
            };
            applications: {
                Row: Application;
                Insert: Omit<Application, "id" | "created_at" | "updated_at" | "status" | "reviewer_id" | "reviewer_notes" | "portfolio_images" | "profile_id"> & { portfolio_images?: string[]; profile_id?: string | null };
                Update: Partial<Omit<Application, "id" | "created_at">>;
                Relationships: any[];
            };
            artwork_likes: {
                Row: ArtworkLike;
                Insert: Omit<ArtworkLike, "created_at">;
                Update: Partial<Omit<ArtworkLike, "created_at">>;
                Relationships: any[];
            };
            artist_follows: {
                Row: ArtistFollow;
                Insert: Omit<ArtistFollow, "id" | "created_at"> & { id?: string; created_at?: string };
                Update: Partial<Omit<ArtistFollow, "id" | "created_at">>;
                Relationships: any[];
            };
            product_wishlist: {
                Row: ProductWishlistItem;
                Insert: Omit<ProductWishlistItem, "id" | "created_at"> & { id?: string; created_at?: string };
                Update: Partial<Omit<ProductWishlistItem, "id" | "created_at">>;
                Relationships: any[];
            };
            product_likes: {
                Row: ProductLike;
                Insert: Omit<ProductLike, "id" | "created_at"> & { id?: string; created_at?: string };
                Update: Partial<Omit<ProductLike, "id" | "created_at">>;
                Relationships: any[];
            };
            newsletter_subscribers: {
                Row: NewsletterSubscriber;
                Insert: Omit<NewsletterSubscriber, "id" | "subscribed_at" | "is_active"> & { is_active?: boolean };
                Update: Partial<Omit<NewsletterSubscriber, "id" | "subscribed_at">>;
                Relationships: any[];
            };
            custom_design_garments: {
                Row: CustomDesignGarment;
                Insert: Omit<CustomDesignGarment, "id" | "created_at" | "updated_at" | "sort_order" | "is_active"> & { sort_order?: number; is_active?: boolean };
                Update: Partial<Omit<CustomDesignGarment, "id" | "created_at">>;
                Relationships: any[];
            };
            custom_design_colors: {
                Row: CustomDesignColor;
                Insert: Omit<CustomDesignColor, "id" | "created_at" | "updated_at" | "sort_order" | "is_active"> & { sort_order?: number; is_active?: boolean };
                Update: Partial<Omit<CustomDesignColor, "id" | "created_at">>;
                Relationships: any[];
            };
            custom_design_sizes: {
                Row: CustomDesignSize;
                Insert: Omit<CustomDesignSize, "id" | "created_at" | "updated_at" | "is_active"> & { is_active?: boolean };
                Update: Partial<Omit<CustomDesignSize, "id" | "created_at">>;
                Relationships: any[];
            };
            custom_design_styles: {
                Row: CustomDesignStyle;
                Insert: Omit<CustomDesignStyle, "id" | "created_at" | "updated_at" | "sort_order" | "is_active"> & { sort_order?: number; is_active?: boolean };
                Update: Partial<Omit<CustomDesignStyle, "id" | "created_at">>;
                Relationships: any[];
            };
            custom_design_art_styles: {
                Row: CustomDesignArtStyle;
                Insert: Omit<CustomDesignArtStyle, "id" | "created_at" | "updated_at" | "sort_order" | "is_active"> & { sort_order?: number; is_active?: boolean };
                Update: Partial<Omit<CustomDesignArtStyle, "id" | "created_at">>;
                Relationships: any[];
            };
            custom_design_color_packages: {
                Row: CustomDesignColorPackage;
                Insert: Omit<CustomDesignColorPackage, "id" | "created_at" | "updated_at" | "sort_order" | "is_active"> & { sort_order?: number; is_active?: boolean };
                Update: Partial<Omit<CustomDesignColorPackage, "id" | "created_at">>;
                Relationships: any[];
            };
            custom_design_studio_items: {
                Row: CustomDesignStudioItem;
                Insert: Omit<CustomDesignStudioItem, "id" | "created_at" | "updated_at" | "sort_order" | "is_active" | "price"> & { sort_order?: number; is_active?: boolean; price?: number };
                Update: Partial<Omit<CustomDesignStudioItem, "id" | "created_at">>;
                Relationships: any[];
            };
            garment_studio_mockups: {
                Row: GarmentStudioMockup;
                Insert: Omit<GarmentStudioMockup, "id" | "created_at" | "updated_at" | "sort_order"> & { sort_order?: number };
                Update: Partial<Omit<GarmentStudioMockup, "id" | "created_at">>;
                Relationships: any[];
            };
            custom_design_presets: {
                Row: CustomDesignPreset;
                Insert: Omit<CustomDesignPreset, "id" | "created_at" | "updated_at" | "sort_order" | "is_featured" | "is_active"> & {
                    sort_order?: number;
                    is_featured?: boolean;
                    is_active?: boolean;
                };
                Update: Partial<Omit<CustomDesignPreset, "id" | "created_at">>;
                Relationships: any[];
            };
            custom_design_option_compatibilities: {
                Row: CustomDesignOptionCompatibility;
                Insert: Omit<CustomDesignOptionCompatibility, "id" | "created_at" | "updated_at" | "relation" | "score" | "reason"> & {
                    relation?: DesignOptionCompatibility["relation"];
                    score?: number;
                    reason?: string | null;
                };
                Update: Partial<Omit<CustomDesignOptionCompatibility, "id" | "created_at">>;
                Relationships: any[];
            };
            custom_design_orders: {
                Row: CustomDesignOrder;
                Insert: Omit<CustomDesignOrder, "id" | "created_at" | "updated_at" | "order_number" | "tracker_token" | "tracker_token_expires_at" | "status" | "skip_results" | "is_sent_to_customer" | "result_design_url" | "result_mockup_url" | "result_pdf_url" | "final_price" | "admin_notes" | "assigned_to" | "modification_request" | "modification_design_url" | "dtf_mockup_url" | "dtf_extracted_url" | "dtf_style_label" | "dtf_technique_label" | "dtf_palette_label"> & {
                    status?: CustomDesignOrderStatus;
                    skip_results?: boolean;
                    is_sent_to_customer?: boolean;
                    result_design_url?: string | null;
                    result_mockup_url?: string | null;
                    result_pdf_url?: string | null;
                    final_price?: number | null;
                    admin_notes?: string | null;
                    assigned_to?: string | null;
                    modification_request?: string | null;
                    modification_design_url?: string | null;
                    dtf_mockup_url?: string | null;
                    dtf_extracted_url?: string | null;
                    dtf_style_label?: string | null;
                    dtf_technique_label?: string | null;
                    dtf_palette_label?: string | null;
                };
                Update: Partial<Omit<CustomDesignOrder, "id" | "created_at" | "order_number" | "tracker_token" | "tracker_token_expires_at">>;
                Relationships: any[];
            };
            custom_design_settings: {
                Row: CustomDesignSettings;
                Insert: Partial<CustomDesignSettings>;
                Update: Partial<CustomDesignSettings>;
                Relationships: any[];
            };
            dtf_design_history: {
                Row: DtfDesignHistory;
                Insert: Omit<DtfDesignHistory, "created_at"> & { created_at?: string };
                Update: Partial<Omit<DtfDesignHistory, "id" | "profile_id" | "created_at">>;
                Relationships: [
                    {
                        foreignKeyName: "dtf_design_history_profile_id_fkey";
                        columns: ["profile_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    }
                ];
            };
            dtf_studio_activity_logs: {
                Row: DtfStudioActivityLog;
                Insert: Omit<DtfStudioActivityLog, "id" | "created_at"> & { id?: string; created_at?: string };
                Update: Partial<Omit<DtfStudioActivityLog, "id" | "created_at">>;
                Relationships: [
                    {
                        foreignKeyName: "dtf_studio_activity_logs_profile_id_fkey";
                        columns: ["profile_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    }
                ];
            };
            admin_notifications: {
                Row: AdminNotification;
                Insert: Omit<AdminNotification, "id" | "created_at" | "is_read"> & { id?: string; created_at?: string; is_read?: boolean };
                Update: Partial<Omit<AdminNotification, "id" | "created_at">>;
                Relationships: any[];
            };
            user_notifications: {
                Row: UserNotification;
                Insert: {
                    id?: string;
                    user_id: string;
                    type: UserNotificationType | string;
                    title: string;
                    message: string;
                    link?: string | null;
                    is_read?: boolean;
                    metadata?: Record<string, unknown>;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    type?: UserNotificationType | string;
                    title?: string;
                    message?: string;
                    link?: string | null;
                    is_read?: boolean;
                    metadata?: Record<string, unknown>;
                    created_at?: string;
                };
                Relationships: any[];
            };
            support_tickets: {
                Row: SupportTicket;
                Insert: Omit<SupportTicket, "id" | "created_at" | "updated_at" | "status" | "priority"> & { status?: SupportTicketStatus; priority?: SupportTicketPriority; user_id?: string | null; name?: string | null; email?: string | null; message?: string | null };
                Update: Partial<Omit<SupportTicket, "id" | "created_at">>;
                Relationships: [
                    {
                        foreignKeyName: "support_tickets_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    }
                ];
            };
            support_messages: {
                Row: SupportMessage;
                Insert: Omit<SupportMessage, "id" | "created_at" | "updated_at" | "is_admin_reply"> & { is_admin_reply?: boolean };
                Update: Partial<Omit<SupportMessage, "id" | "created_at">>;
                Relationships: [
                    {
                        foreignKeyName: "support_messages_ticket_id_fkey";
                        columns: ["ticket_id"];
                        isOneToOne: false;
                        referencedRelation: "support_tickets";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "support_messages_sender_id_fkey";
                        columns: ["sender_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    }
                ];
            };
            design_order_messages: {
                Row: DesignOrderMessage;
                Insert: Omit<DesignOrderMessage, "id" | "created_at"> & {
                    id?: string;
                    created_at?: string;
                };
                Update: Partial<Omit<DesignOrderMessage, "id" | "created_at">>;
                Relationships: any[];
            };
            product_skus: {
                Row: ProductSKU;
                Insert: Omit<ProductSKU, "id" | "created_at" | "updated_at" | "barcode_url"> & { barcode_url?: string | null };
                Update: Partial<Omit<ProductSKU, "id" | "created_at">>;
                Relationships: [
                    {
                        foreignKeyName: "product_skus_product_id_fkey";
                        columns: ["product_id"];
                        isOneToOne: false;
                        referencedRelation: "products";
                        referencedColumns: ["id"];
                    }
                ];
            };
            warehouses: {
                Row: Warehouse;
                Insert: Omit<Warehouse, "id" | "created_at" | "updated_at">;
                Update: Partial<Omit<Warehouse, "id" | "created_at">>;
                Relationships: any[];
            };
            inventory_levels: {
                Row: InventoryLevel;
                Insert: Omit<InventoryLevel, "id" | "created_at" | "updated_at">;
                Update: Partial<Omit<InventoryLevel, "id" | "created_at">>;
                Relationships: any[];
            };
            inventory_transactions: {
                Row: InventoryTransaction;
                Insert: Omit<InventoryTransaction, "id" | "created_at" | "reference_id" | "notes" | "created_by"> & { reference_id?: string | null; notes?: string | null; created_by?: string | null };
                Update: Partial<Omit<InventoryTransaction, "id" | "created_at">>;
                Relationships: any[];
            };
            sales_records: {
                Row: SalesRecord;
                Insert: Omit<SalesRecord, "id" | "created_at" | "updated_at" | "status" | "notes" | "created_by" | "order_id" | "sku_id"> & { status?: string; notes?: string | null; created_by?: string | null; order_id?: string | null; sku_id?: string | null };
                Update: Partial<Omit<SalesRecord, "id" | "created_at">>;
                Relationships: any[];
            };
            push_subscriptions: {
                Row: { id: string; endpoint: string; p256dh: string; auth: string; scope: StoredPushSubscriptionScope; user_id: string | null; user_agent: string | null; created_at: string };
                Insert: { endpoint: string; p256dh: string; auth: string; scope?: StoredPushSubscriptionScope; user_id?: string | null; user_agent?: string | null };
                Update: Partial<{ endpoint: string; p256dh: string; auth: string; scope: StoredPushSubscriptionScope; user_id: string | null; user_agent: string | null }>;
                Relationships: any[];
            };
            site_settings: {
                Row: { id: string; key: string; value: Record<string, unknown> | unknown[]; created_at: string; updated_at: string };
                Insert: { key: string; value: Record<string, unknown> | unknown[] };
                Update: Partial<{ key: string; value: Record<string, unknown> | unknown[] }>;
                Relationships: any[];
            };
            role_change_audit_log: {
                Row: RoleChangeAuditLog;
                Insert: Omit<RoleChangeAuditLog, "id" | "changed_at"> & { id?: string; changed_at?: string };
                Update: Partial<Pick<RoleChangeAuditLog, "changed_by_id" | "context" | "metadata">>;
                Relationships: [
                    {
                        foreignKeyName: "role_change_audit_log_profile_id_fkey";
                        columns: ["profile_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "role_change_audit_log_changed_by_id_fkey";
                        columns: ["changed_by_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    }
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            generate_sku: {
                Args: { p_product_type: string; p_size: string | null; p_color: string | null };
                Returns: string;
            };
            get_next_unit_serials: {
                Args: { p_sku_id: string; p_count: number };
                Returns: { unit_code: string }[];
            };
            generate_product_code: {
                Args: Record<string, never>;
                Returns: string;
            };
            renew_tracker_token: {
                Args: { p_order_id: string };
                Returns: string; // new tracker_token_expires_at (TIMESTAMPTZ as ISO string)
            };
            reserve_dtf_daily_quota: {
                Args: { p_profile_id: string; p_daily_limit?: number };
                Returns: Record<string, unknown>;
            };
            release_dtf_daily_quota: {
                Args: { p_profile_id: string; p_daily_limit?: number };
                Returns: Record<string, unknown>;
            };
            consume_rate_limit: {
                Args: { p_identifier: string; p_limit: number; p_window_seconds: number };
                Returns: Record<string, unknown>;
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
}

// ─── Design Order Types ──────────────────────────────────

export type CustomDesignOrderStatus = "new" | "in_progress" | "awaiting_review" | "completed" | "cancelled" | "modification_requested";

/** لقطة تسعير مسار المتجر الذكي (طباعة حسب الموضع/الحجم). */
export type DesignPricingSnapshotClassic = {
    garment_id: string | null;
    garment_name: string;
    captured_at: string;
    base_price: number;
    price_chest_large: number;
    price_chest_small: number;
    price_back_large: number;
    price_back_small: number;
    price_shoulder_large: number;
    price_shoulder_small: number;
};

/** لقطة تسعير طلبات WASHA AI / DTF Studio (مخزّنة في JSON). */
export type DesignPricingSnapshotDtf = {
    base_price: number;
    design_price: number;
    final_price: number;
    dtf: true;
};

export type DesignPricingSnapshot = DesignPricingSnapshotClassic | DesignPricingSnapshotDtf;

export type CustomDesignOrder = {
    id: string;
    order_number: number;
    tracker_token: string;
    /** تاريخ انتهاء صلاحية رابط التتبع العام (90 يوم من الإنشاء) */
    tracker_token_expires_at: string;
    user_id?: string | null;
    parent_order_id?: string | null;

    // Customer
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;

    // Selections
    garment_id: string | null;
    garment_name: string;
    garment_image_url: string | null;
    color_id: string | null;
    color_name: string;
    color_hex: string;
    color_image_url: string | null;
    size_id: string | null;
    size_name: string;

    // Design Method
    design_method: "from_text" | "from_image" | "studio";
    text_prompt: string | null;
    reference_image_url: string | null;

    // Style
    preset_id: string | null;
    preset_name: string | null;
    preset_fully_aligned: boolean;
    style_id: string | null;
    style_name: string;
    style_image_url: string | null;
    art_style_id: string | null;
    art_style_name: string;
    art_style_image_url: string | null;

    // Colors
    color_package_id: string | null;
    color_package_name: string | null;
    custom_colors: any[];
    studio_item_id: string | null;

    // AI Prompt
    ai_prompt: string;

    // Results
    result_design_url: string | null;
    result_mockup_url: string | null;
    result_pdf_url: string | null;

    // Fulfillment & Cart Integration
    final_price: number | null;
    is_sent_to_customer: boolean;

    // Workflow
    status: CustomDesignOrderStatus;
    skip_results: boolean;
    admin_notes: string | null;
    assigned_to: string | null;
    modification_request: string | null;
    modification_design_url: string | null;

    // Print Placement & Pricing
    print_position: string | null;
    print_size: string | null;
    pricing_snapshot: DesignPricingSnapshot | null;

    // DTF Studio Submission
    dtf_mockup_url: string | null;
    dtf_extracted_url: string | null;
    dtf_style_label: string | null;
    dtf_technique_label: string | null;
    dtf_palette_label: string | null;

    // Timestamps
    created_at: string;
    updated_at: string;
}

export type CustomDesignSettings = {
    id: string;
    ai_prompt_template: string;
    updated_at: string;
}

export type DesignOrderMessage = {
    id: string;
    order_id: string;
    message: string;
    is_admin_reply: boolean;
    created_at: string;
}
