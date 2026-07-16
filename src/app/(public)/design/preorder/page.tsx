import type { Metadata } from "next";
import { DesignHubPageContent } from "../DesignHubPageContent";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";

export const metadata: Metadata = {
    title: "الطلب المسبق | صمّم قطعتك | وشّى",
    description: "ابدأ طلباً مسبقاً تفصيلياً لصمّم قطعتك مع مراجعة فريق التصميم وتتبع حالة الاعتماد.",
    alternates: { canonical: `${SITE_URL}/design/preorder` },
};

export default async function DesignPreorderPage() {
    return <DesignHubPageContent initialTab="preorder" />;
}
