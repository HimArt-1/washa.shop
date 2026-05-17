import { getArtistArtworks } from "@/app/actions/artworks";
import { DesignStudio } from "@/components/studio/design/DesignStudio";

export default async function DesignPage() {
    const { data: artworks } = await getArtistArtworks();
    const publishedArtworks = (artworks || []).filter((artwork: any) => artwork.status === "published");

    return (
        <div className="h-full">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-ink">تصميم المنتجات</h1>
                <p className="text-ink/60 mt-2">اختر عملاً منشوراً وحوله إلى منتج فريد جاهز للبيع</p>
            </div>

            <DesignStudio artworks={publishedArtworks as import("@/types/database").Artwork[]} />
        </div>
    );
}
