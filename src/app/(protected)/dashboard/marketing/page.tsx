// وشّى | WASHA — صفحة مركز التسويق
import { Suspense } from "react";
import { BarChart2 } from "lucide-react";
import { MarketingHubWrapper } from "./MarketingHubWrapper";

export const metadata = { title: "مركز التسويق" };

export default function MarketingPage() {
    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8" dir="rtl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center">
                    <BarChart2 className="w-5 h-5 text-gold" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-theme-strong">مركز التسويق</h1>
                    <p className="text-sm text-theme-faint mt-0.5">
                        تقسيم الجمهور · الحملات البريدية · تتبع الشرائح
                    </p>
                </div>
            </div>

            <Suspense
                fallback={
                    <div className="h-48 rounded-2xl bg-theme-subtle animate-pulse" />
                }
            >
                <MarketingHubWrapper />
            </Suspense>
        </div>
    );
}
