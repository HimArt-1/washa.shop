// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Zod Validation Schemas
//  مخططات التحقق لجميع نماذج الإدخال
// ═══════════════════════════════════════════════════════════

import { z } from "zod";

// ─── Common ──────────────────────────────────────────────

const arabicOrLatinName = z
    .string()
    .min(2, "الاسم يجب أن يكون حرفين على الأقل")
    .max(100, "الاسم طويل جداً");

const urlOptional = z
    .string()
    .url("الرابط غير صالح")
    .optional()
    .or(z.literal(""));

const emailSchema = z
    .string()
    .email("البريد الإلكتروني غير صالح")
    .min(1, "البريد الإلكتروني مطلوب");

const phoneOptional = z
    .string()
    .regex(/^\+?[0-9\s-]{8,15}$/, "رقم الهاتف غير صالح")
    .optional()
    .or(z.literal(""));

// ─── Application (طلب انضمام فنان) ──────────────────────

export const applicationSchema = z.object({
    full_name: arabicOrLatinName,
    email: emailSchema,
    phone: phoneOptional,
    join_type: z.enum(["artist", "designer", "model", "customer", "partner"]).optional(),
    gender: z.enum(["male", "female"]).optional(),
    birth_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ الميلاد غير صالح")
        .optional()
        .or(z.literal("")),
    portfolio_url: urlOptional,
    instagram_url: urlOptional,
    art_style: z
        .string()
        .min(2, "حدد أسلوبك الفني")
        .max(50, "الوصف طويل جداً"),
    experience_years: z
        .number()
        .int()
        .min(0, "لا يمكن أن تكون سالبة")
        .max(60, "القيمة غير واقعية")
        .optional(),
    motivation: z
        .string()
        .min(20, "اكتب 20 حرفاً على الأقل")
        .max(1000, "النص طويل جداً"),
});

export type ApplicationFormData = z.infer<typeof applicationSchema>;

// ─── Artwork (عمل فني) ──────────────────────────────────

export const artworkSchema = z.object({
    title: z
        .string()
        .min(2, "العنوان يجب أن يكون حرفين على الأقل")
        .max(200, "العنوان طويل جداً"),
    description: z
        .string()
        .max(2000, "الوصف طويل جداً")
        .optional(),
    category_id: z.string().uuid("اختر تصنيفاً").optional(),
    medium: z.string().max(100).optional(),
    dimensions: z.string().max(50).optional(),
    year: z
        .number()
        .int()
        .min(1900)
        .max(new Date().getFullYear())
        .optional(),
    tags: z.array(z.string().max(30)).max(10, "الحد الأقصى 10 وسوم").default([]),
    price: z
        .number()
        .positive("السعر يجب أن يكون موجباً")
        .optional(),
    currency: z.enum(["SAR", "USD", "ETH"]).default("SAR"),
});

export type ArtworkFormData = z.infer<typeof artworkSchema>;

// ─── Product (منتج) ─────────────────────────────────────

export const productSchema = z.object({
    title: z
        .string()
        .min(2, "العنوان مطلوب")
        .max(200, "العنوان طويل جداً"),
    description: z.string().max(2000).optional(),
    type: z.enum(["print", "apparel", "digital", "nft", "original"]),
    price: z.number().positive("السعر يجب أن يكون موجباً"),
    original_price: z.number().positive().optional(),
    currency: z.enum(["SAR", "USD", "ETH"]).default("SAR"),
    sizes: z
        .array(z.enum(["XS", "S", "M", "L", "XL", "XXL"]))
        .optional(),
    stock_quantity: z.number().int().min(0).optional(),
    badge: z.string().max(20).optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

// ─── Profile (الملف الشخصي) ─────────────────────────────

export const profileSchema = z.object({
    display_name: arabicOrLatinName,
    username: z
        .string()
        .min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل")
        .max(30, "اسم المستخدم طويل جداً")
        .regex(/^[a-zA-Z0-9_-]+$/, "يُسمح فقط بالحروف والأرقام و _ و -"),
    bio: z.string().max(500, "النبذة طويلة جداً").optional(),
    website: urlOptional,
    avatar_url: urlOptional,
    cover_url: urlOptional,
    social_links: z
        .object({
            instagram: z.string().optional(),
            twitter: z.string().optional(),
            youtube: z.string().optional(),
            behance: z.string().optional(),
            dribbble: z.string().optional(),
        })
        .optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

// ─── Newsletter ──────────────────────────────────────────

export const newsletterSchema = z.object({
    email: emailSchema,
});

export type NewsletterFormData = z.infer<typeof newsletterSchema>;

// ─── Contact ─────────────────────────────────────────────

export const contactSchema = z.object({
    name: arabicOrLatinName,
    email: emailSchema,
    subject: z
        .string()
        .min(5, "الموضوع يجب أن يكون 5 أحرف على الأقل")
        .max(200),
    message: z
        .string()
        .min(20, "الرسالة يجب أن تكون 20 حرفاً على الأقل")
        .max(2000, "الرسالة طويلة جداً"),
});

export type ContactFormData = z.infer<typeof contactSchema>;
