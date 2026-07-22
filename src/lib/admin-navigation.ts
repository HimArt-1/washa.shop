import type { LucideIcon } from "lucide-react";
import {
    BarChart3,
    Bell,
    Brush,
    ClipboardList,
    CreditCard,
    ExternalLink,
    FileText,
    HeadphonesIcon,
    History,
    LayoutDashboard,
    Mail,
    Megaphone,
    Package,
    Palette,
    Settings,
    Shield,
    ShieldAlert,
    ShoppingCart,
    Sparkles,
    Ticket,
    TrendingUp,
    Truck,
    Users,
    Wand2,
    Wifi,
} from "lucide-react";
import type { UserRole } from "@/types/database";

export type AdminBadgeKey = "pendingApps" | "pendingDesignOrders" | "pendingSupportTickets";

export interface AdminNavItem {
    icon: LucideIcon;
    label: string;
    href: string;
    description: string;
    badgeKey?: AdminBadgeKey;
    roles?: UserRole[];
    external?: boolean;
}

export interface AdminNavGroup {
    title: string;
    items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
    {
        title: "الرئيسية",
        items: [
            { icon: LayoutDashboard, label: "لوحة المؤشرات", href: "/dashboard", description: "نبض المنصة والعمليات اليومية.", roles: ["admin", "dev", "financial_manager", "shipping_manager"] },
            { icon: BarChart3, label: "المالية والإيرادات", href: "/dashboard/analytics", description: "الإيرادات، الطلبات المدفوعة، ومؤشرات المال.", roles: ["admin", "dev", "financial_manager"] },
            { icon: Megaphone, label: "مركز التسويق", href: "/dashboard/marketing", description: "شرائح الجمهور، الحملات البريدية، وتحليل قمع التحويل.", roles: ["admin", "dev"] },
            { icon: History, label: "سجل العمليات", href: "/dashboard/activity-log", description: "تتبع الإجراءات الحساسة داخل الإدارة.", roles: ["admin", "dev"] },
        ],
    },
    {
        title: "التشغيل التجاري",
        items: [
            { icon: ShoppingCart, label: "مركز قيادة الطلبات", href: "/dashboard/orders/command-center", description: "مكتب تشغيل الطلبات من الفرز حتى التنفيذ.", roles: ["admin", "dev", "shipping_manager", "support_agent", "financial_manager"] },
            { icon: ShoppingCart, label: "الطلبات", href: "/dashboard/orders", description: "قائمة الطلبات وإجراءات المتابعة.", roles: ["admin", "dev", "shipping_manager", "support_agent", "financial_manager"] },
            { icon: Truck, label: "إدارة الشحن", href: "/dashboard/shipping", description: "الشحنات، التتبع، ومزودي التوصيل.", roles: ["admin", "dev", "shipping_manager"] },
            { icon: Package, label: "المنتجات والمخزون", href: "/dashboard/products-inventory", description: "المنتجات، المخزون، الجرد، والباركود في مركز واحد.", roles: ["admin", "dev", "shipping_manager"] },
            { icon: TrendingUp, label: "نظام البوث · المبيعات", href: "/dashboard/sales", description: "لوحة بوث متكاملة: كاشير، مخزون، خصومات، مرتجعات، مالية، وإغلاق اليوم.", roles: ["admin", "dev", "financial_manager", "booth"] },
            { icon: Ticket, label: "الكوبونات", href: "/dashboard/coupons", description: "حملات الخصم والاستخدامات.", roles: ["admin", "dev", "financial_manager", "shipping_manager"] },
            { icon: Package, label: "الباركود", href: "/dashboard/barcodes", description: "رموز SKU وربط المنتجات بالمستودع.", roles: ["admin", "dev", "shipping_manager"] },
        ],
    },
    {
        title: "المحتوى والتصميم",
        items: [
            { icon: Brush, label: "طلبات التصميم", href: "/dashboard/design-orders", description: "طلبات DTF والتسليمات والملفات.", badgeKey: "pendingDesignOrders", roles: ["admin", "dev", "shipping_manager"] },
            { icon: Wand2, label: "رادار DTF", href: "/dashboard/design-orders/dtf-monitor", description: "مراقبة توليد التصميم واستهلاك النظام.", roles: ["admin", "dev", "shipping_manager"] },
            { icon: ClipboardList, label: "طلبات اللوحات الاحتياطية", href: "/dashboard/board-requests", description: "معاينات fallback الجاهزة والفاشلة للمتابعة اليدوية.", roles: ["admin", "dev"] },
            { icon: Palette, label: "الأعمال الفنية", href: "/dashboard/artworks", description: "إدارة أعمال الفنانين ومحتوى المعرض.", roles: ["admin", "dev"] },
            { icon: Palette, label: "التصاميم الحصرية", href: "/dashboard/exclusive-designs", description: "تصاميم المتجر الحصرية وتنظيم عرضها.", roles: ["admin", "dev"] },
            { icon: Sparkles, label: "المتجر الذكي", href: "/dashboard/smart-store", description: "كتالوج صمّم قطعتك واستوديو DTF.", roles: ["admin", "dev"] },
            { icon: FileText, label: "الفئات", href: "/dashboard/categories", description: "تصنيف المنتجات والأعمال داخل المنصة.", roles: ["admin", "dev"] },
            { icon: Bell, label: "الإعلانات والعروض", href: "/dashboard/announcements", description: "حملات الواجهة، الرسائل، وجدولة الظهور.", roles: ["admin", "dev"] },
            { icon: Mail, label: "النشرة البريدية", href: "/dashboard/newsletter", description: "المشتركين وقوائم التواصل.", roles: ["admin", "dev"] },
        ],
    },
    {
        title: "الإدارة والدعم",
        items: [
            { icon: Users, label: "المستخدمون", href: "/dashboard/users", description: "العملاء، الأدوار، وسجل الحسابات.", roles: ["admin", "dev"] },
            { icon: Shield, label: "مزامنة الهوية", href: "/dashboard/users-clerk", description: "مزامنة حسابات Clerk مع قاعدة البيانات.", roles: ["admin", "dev"] },
            { icon: History, label: "سجل الأدوار", href: "/dashboard/users/audit-log", description: "تغيرات الصلاحيات والأدوار.", roles: ["admin", "dev"] },
            { icon: FileText, label: "طلبات الانضمام", href: "/dashboard/applications", description: "طلبات الفنانين والعملاء والمرشحين.", badgeKey: "pendingApps", roles: ["admin", "dev"] },
            { icon: HeadphonesIcon, label: "الدعم الفني", href: "/dashboard/support", description: "التذاكر والمحادثات وحالات الدعم.", badgeKey: "pendingSupportTickets", roles: ["admin", "dev", "support_agent"] },
            { icon: Bell, label: "الإشعارات", href: "/dashboard/notifications", description: "تنبيهات الإدارة وقنوات المتابعة.", roles: ["admin", "dev", "support_agent", "shipping_manager", "financial_manager"] },
            { icon: Wifi, label: "حالة التكاملات", href: "/dashboard/integrations", description: "فحص الدفع والشحن والهوية والذكاء والتنبيهات.", roles: ["admin", "dev"] },
            { icon: Settings, label: "الإعدادات", href: "/dashboard/settings", description: "إعدادات المنصة والذكاء والربط التشغيلي.", roles: ["admin", "dev"] },
        ],
    },
];

export const ADMIN_COMMAND_ITEMS: AdminNavItem[] = [
    ...ADMIN_NAV_GROUPS.flatMap((group) => group.items),
    { href: "/store", label: "المتجر العام", icon: ExternalLink, external: true, description: "فتح واجهة المتجر للزوار." },
    { href: "/studio", label: "الاستوديو", icon: Sparkles, description: "فتح تجربة التصميم العامة." },
];

export function canViewAdminItem(item: AdminNavItem, role: UserRole) {
    return !item.roles || item.roles.includes(role);
}

export function getVisibleAdminCommandItems(role: UserRole) {
    return ADMIN_COMMAND_ITEMS.filter((item) => canViewAdminItem(item, role));
}

export function getAdminActiveHref(pathname: string, items: AdminNavItem[]) {
    return items
        .filter((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function getAdminAccessItem(pathname: string) {
    return ADMIN_COMMAND_ITEMS
        .filter((item) => !item.external && item.href.startsWith("/dashboard"))
        .filter((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)))
        .sort((a, b) => b.href.length - a.href.length)[0] || null;
}

export function canAccessAdminPath(pathname: string, role: UserRole) {
    if (!pathname.startsWith("/dashboard")) return false;

    const item = getAdminAccessItem(pathname);
    if (!item) {
        return role === "admin" || role === "dev";
    }

    return canViewAdminItem(item, role);
}

export function getAdminPageMeta(pathname: string) {
    const exactMatch = ADMIN_COMMAND_ITEMS.find((item) => item.href === pathname && !item.external);
    if (exactMatch) {
        return {
            title: exactMatch.label,
            description: exactMatch.description,
        };
    }

    if (pathname.startsWith("/dashboard/support/")) {
        return {
            title: "مساحة تذكرة الدعم",
            description: "راجع الحالة والحوار والإجراءات من شاشة واحدة.",
        };
    }

    if (pathname.startsWith("/dashboard/design-orders/")) {
        return {
            title: "مساحة طلب التصميم",
            description: "تابع التنفيذ وأرسل النتائج وتحرك بين الحالات دون فقد السياق.",
        };
    }

    if (pathname.startsWith("/dashboard/applications/")) {
        return {
            title: "مراجعة طلب الانضمام",
            description: "اعتماد أو رفض الطلبات مع رؤية أوضح للبيانات والمرفقات.",
        };
    }

    if (pathname.startsWith("/dashboard/marketing")) {
        return {
            title: "مركز التسويق",
            description: "شرائح الجمهور، الحملات البريدية، وتتبع سلوك المستخدم.",
        };
    }

    if (pathname.startsWith("/dashboard/users/")) {
        return {
            title: "ملف المستخدم",
            description: "نظرة مركزة على الحساب والهوية والنشاط من شاشة واحدة.",
        };
    }

    return {
        title: "لوحة الإدارة",
        description: "ملاحة تشغيلية بين الطلبات والدعم والمنتجات والإعدادات.",
    };
}

export function getAdminBreadcrumbs(pathname: string) {
    const crumbs = [{ href: "/dashboard", label: "لوحة الإدارة" }];
    if (pathname === "/dashboard") return crumbs;

    const active = ADMIN_COMMAND_ITEMS
        .filter((item) => !item.external)
        .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
        .sort((a, b) => b.href.length - a.href.length)[0];

    if (active && active.href !== "/dashboard") {
        crumbs.push({ href: active.href, label: active.label });
        return crumbs;
    }

    const parts = pathname.split("/").filter(Boolean);
    const fallback = parts.slice(1).map((part, index) => ({
        href: `/${parts.slice(0, index + 2).join("/")}`,
        label: part,
    }));

    return [...crumbs, ...fallback];
}
