// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Database Types
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

export interface DiscountCoupon extends Timestamps {
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
    coupon_id: string | null;     // FK → discount_coupons.id
    discount_amount: number;
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

// ─── User Notifications ────────────────────────────────────

export type UserNotificationType = "order_update" | "support_reply" | "system_alert";

export interface UserNotification extends Timestamps {
    id: string;
    user_id: string;              // FK → profiles.id
    type: UserNotificationType | string;
    title: string;
    message: string;
    link: string | null;
    is_read: boolean;
    metadata: any;
}

// ─── Support Tickets & Messages ──────────────────────────

export type SupportTicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type SupportTicketPriority = "low" | "normal" | "high";

export interface SupportTicket extends Timestamps {
    id: string;
    user_id: string;              // FK → profiles.id
    subject: string;
    status: SupportTicketStatus;
    priority: SupportTicketPriority;
}

export interface SupportMessage extends Timestamps {
    id: string;
    ticket_id: string;            // FK → support_tickets.id
    sender_id: string;            // FK → profiles.id
    message: string;
    is_admin_reply: boolean;
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

export interface CustomDesignStudioItem {
    id: string;
    name: string;
    description: string | null;
    price: number;
    main_image_url: string | null;
    mockup_image_url: string | null;
    model_image_url: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// ─── ERP (Inventory, SKUs, Sales) ────────────────────────

export interface ProductSKU extends Timestamps {
    id: string;
    product_id: string;
    sku: string;
    size: string | null;
    color_code: string | null;
    barcode_url: string | null;
}

export interface Warehouse extends Timestamps {
    id: string;
    name: string;
    location: string | null;
    is_active: boolean;
}

export interface InventoryLevel extends Timestamps {
    id: string;
    sku_id: string;
    warehouse_id: string;
    quantity: number;
}

export type InventoryTransactionType = 'addition' | 'sale' | 'adjustment' | 'transfer' | 'return';

export interface InventoryTransaction {
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

export interface SalesRecord extends Timestamps {
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
            discount_coupons: {
                Row: DiscountCoupon;
                Insert: Omit<DiscountCoupon, "id" | "current_uses" | "created_at" | "updated_at"> & {
                    id?: string;
                    current_uses?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<Omit<DiscountCoupon, "id" | "created_at">>;
            };
            orders: {
                Row: Order;
                Insert: Omit<Order, "id" | "created_at" | "updated_at" | "order_number" | "status" | "payment_status" | "shipping_cost" | "tax" | "discount_amount"> & { status?: OrderStatus; payment_status?: PaymentStatus; shipping_cost?: number; tax?: number; discount_amount?: number; coupon_id?: string | null; };
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
            artist_follows: {
                Row: ArtistFollow;
                Insert: Omit<ArtistFollow, "id" | "created_at"> & { id?: string; created_at?: string };
                Update: never;
            };
            product_wishlist: {
                Row: ProductWishlistItem;
                Insert: Omit<ProductWishlistItem, "id" | "created_at"> & { id?: string; created_at?: string };
                Update: never;
            };
            product_likes: {
                Row: ProductLike;
                Insert: Omit<ProductLike, "id" | "created_at"> & { id?: string; created_at?: string };
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
            custom_design_studio_items: {
                Row: CustomDesignStudioItem;
                Insert: Omit<CustomDesignStudioItem, "id" | "created_at" | "updated_at" | "sort_order" | "is_active" | "price"> & { sort_order?: number; is_active?: boolean; price?: number };
                Update: Partial<Omit<CustomDesignStudioItem, "id" | "created_at">>;
            };
            custom_design_orders: {
                Row: CustomDesignOrder;
                Insert: Omit<CustomDesignOrder, "id" | "created_at" | "updated_at" | "order_number" | "status" | "skip_results" | "is_sent_to_customer"> & { status?: CustomDesignOrderStatus; skip_results?: boolean; is_sent_to_customer?: boolean };
                Update: Partial<Omit<CustomDesignOrder, "id" | "created_at" | "order_number">>;
            };
            custom_design_settings: {
                Row: CustomDesignSettings;
                Insert: Partial<CustomDesignSettings>;
                Update: Partial<CustomDesignSettings>;
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
                    metadata?: any;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    type?: UserNotificationType | string;
                    title?: string;
                    message?: string;
                    link?: string | null;
                    is_read?: boolean;
                    metadata?: any;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            support_tickets: {
                Row: { id: string, user_id: string, subject: string, status: string, priority: string, created_at: string, updated_at: string };
                Insert: { id?: string, user_id: string, subject: string, status?: string, priority?: string, created_at?: string, updated_at?: string };
                Update: { id?: string, user_id?: string, subject?: string, status?: string, priority?: string, created_at?: string, updated_at?: string };
            };
            support_messages: {
                Row: SupportMessage;
                Insert: {
                    id?: string;
                    ticket_id: string;
                    sender_id: string;
                    message: string;
                    is_admin_reply?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    ticket_id?: string;
                    sender_id?: string;
                    message?: string;
                    is_admin_reply?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            design_order_messages: {
                Row: DesignOrderMessage;
                Insert: Omit<DesignOrderMessage, "id" | "created_at"> & {
                    id?: string;
                    created_at?: string;
                };
                Update: Partial<Omit<DesignOrderMessage, "id" | "created_at">>;
            };
            product_skus: {
                Row: ProductSKU;
                Insert: Omit<ProductSKU, "id" | "created_at" | "updated_at">;
                Update: Partial<Omit<ProductSKU, "id" | "created_at">>;
            };
            warehouses: {
                Row: Warehouse;
                Insert: Omit<Warehouse, "id" | "created_at" | "updated_at">;
                Update: Partial<Omit<Warehouse, "id" | "created_at">>;
            };
            inventory_levels: {
                Row: InventoryLevel;
                Insert: Omit<InventoryLevel, "id" | "created_at" | "updated_at">;
                Update: Partial<Omit<InventoryLevel, "id" | "created_at">>;
            };
            inventory_transactions: {
                Row: InventoryTransaction;
                Insert: Omit<InventoryTransaction, "id" | "created_at">;
                Update: Partial<Omit<InventoryTransaction, "id" | "created_at">>;
            };
            sales_records: {
                Row: SalesRecord;
                Insert: Omit<SalesRecord, "id" | "created_at" | "updated_at" | "status"> & { status?: string };
                Update: Partial<Omit<SalesRecord, "id" | "created_at">>;
            };
        };
    };
}

// ─── Design Order Types ──────────────────────────────────

export type CustomDesignOrderStatus = "new" | "in_progress" | "awaiting_review" | "completed" | "cancelled" | "modification_requested";

export interface CustomDesignOrder {
    id: string;
    order_number: number;
    user_id?: string | null;
    parent_order_id?: string | null;

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
    design_method: "from_text" | "from_image" | "studio";
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

    // Fulfillment & Cart Integration
    final_price: number | null;
    is_sent_to_customer: boolean;

    // Workflow
    status: CustomDesignOrderStatus;
    skip_results: boolean;
    admin_notes: string | null;
    assigned_to: string | null;
    modification_request: string | null;

    // Print Placement & Pricing
    print_position: string | null;
    print_size: string | null;

    // Timestamps
    created_at: string;
    updated_at: string;
}

export interface CustomDesignSettings {
    id: string;
    ai_prompt_template: string;
    updated_at: string;
}

export interface DesignOrderMessage {
    id: string;
    order_id: string;
    message: string;
    is_admin_reply: boolean;
    created_at: string;
}
