import type { Metadata } from "next";
import { DesignHubPageContent } from "../DesignHubPageContent";

export const metadata: Metadata = {
    title: "الطلب المسبق | صمّم قطعتك | وشّى",
    description: "ابدأ طلباً مسبقاً تفصيلياً لصمّم قطعتك مع مراجعة فريق التصميم وتتبع حالة الاعتماد.",
};

export default async function DesignPreorderPage() {
    return <DesignHubPageContent initialTab="preorder" />;
}
