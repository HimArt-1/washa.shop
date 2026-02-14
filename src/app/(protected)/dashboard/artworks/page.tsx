import { getAdminArtworks } from "@/app/actions/admin";
import { ArtworksClient } from "@/components/admin/ArtworksClient";

interface PageProps {
    searchParams: Promise<{ page?: string; status?: string }>;
}

export default async function AdminArtworksPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const status = params.status || "all";

    const { data: artworks, count, totalPages } = await getAdminArtworks(page, status);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-fg">إدارة الأعمال الفنية</h1>
                <p className="text-fg/40 mt-1">مراجعة ونشر وأرشفة الأعمال الفنية على المنصة.</p>
            </div>

            <ArtworksClient
                artworks={artworks}
                count={count}
                totalPages={totalPages}
                currentPage={page}
                currentStatus={status}
            />
        </div>
    );
}
