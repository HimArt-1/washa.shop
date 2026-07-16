import { Suspense } from "react";
import SearchContent from "./SearchContent";
import type { Metadata } from "next";
import { getPublicVisibility } from "@/app/actions/settings";
import { redirect } from "next/navigation";
import { getVisiblePublicSearchTabs } from "@/lib/public-content-visibility";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";

export const metadata: Metadata = {
    title: "البحث — وشّى",
    description: "ابحث في الأعمال الفنية والمنتجات والفنانين على منصة وشّى",
    alternates: { canonical: `${SITE_URL}/search` },
};

function SearchFallback() {
    return (
        <div className="min-h-[60vh] bg-bg pt-6 sm:pt-8 pb-12 sm:pb-16 flex items-center justify-center" dir="rtl">
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
                <p className="text-theme-faint text-sm">جاري التحميل...</p>
            </div>
        </div>
    );
}

export default async function SearchPage() {
    const visibility = await getPublicVisibility();
    if (getVisiblePublicSearchTabs(visibility).length === 0) redirect("/");
    return (
        <Suspense fallback={<SearchFallback />}>
            <SearchContent
                galleryVisible={visibility.gallery !== false}
                storeVisible={visibility.store !== false}
            />
        </Suspense>
    );
}
