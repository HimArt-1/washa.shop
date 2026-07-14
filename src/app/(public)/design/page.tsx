import type { Metadata } from "next";
import { DesignHubPageContent } from "./DesignHubPageContent";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";

export const metadata: Metadata = {
    title: "صمّم قطعتك | وشّى",
    description: "اختر بين WASHA AI للتوليد السريع، أو طلب مسبق تفصيلي يتابعه فريق التصميم.",
    alternates: { canonical: `${SITE_URL}/design` },
};

export default async function DesignYourPieceHubPage() {
    return <DesignHubPageContent />;
}
