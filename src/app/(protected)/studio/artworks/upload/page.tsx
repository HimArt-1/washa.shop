import { getSupabaseServerClient } from "@/lib/supabase";
import { UploadArtworkForm } from "@/components/studio/artworks/UploadArtworkForm";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function UploadArtworkPage() {
    const supabase = getSupabaseServerClient();

    // Fetch categories for dropdown
    const { data: categories } = await supabase
        .from("categories")
        .select("id, name_ar")
        .order("name_ar");

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/studio/artworks"
                    className="p-2 rounded-lg hover:bg-ink/5 text-ink/50 hover:text-ink transition-colors"
                >
                    <ArrowRight className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-ink">رفع عمل فني جديد</h1>
                    <p className="text-ink/60 mt-2">شارك إبداعك مع العالم وحوله إلى منتجات رائعة</p>
                </div>
            </div>

            <UploadArtworkForm categories={categories || []} />
        </div>
    );
}
