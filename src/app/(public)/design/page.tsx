import type { Metadata } from "next";
import { DesignHubPageContent } from "./DesignHubPageContent";

export const metadata: Metadata = {
    title: "صمّم قطعتك | وشّى",
    description: "اختر بين WASHA AI للتوليد السريع، أو طلب مسبق تفصيلي يتابعه فريق التصميم.",
};

export default async function DesignYourPieceHubPage() {
    return <DesignHubPageContent />;
}
