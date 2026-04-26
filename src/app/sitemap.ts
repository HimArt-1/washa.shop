import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key, { auth: { persistSession: false } });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = BASE_URL.replace(/\/$/, "");

    const staticRoutes: MetadataRoute.Sitemap = [
        { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
        { url: `${baseUrl}/gallery`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
        { url: `${baseUrl}/store`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
        { url: `${baseUrl}/design`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
        { url: `${baseUrl}/design/preorder`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.75 },
        { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
        { url: `${baseUrl}/join`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    ];

    const supabase = getSupabase();
    const dynamicRoutes: MetadataRoute.Sitemap = [];

    if (supabase) {
        try {
            const [{ data: artworks }, { data: products }, { data: profiles }] = await Promise.all([
                supabase.from("artworks").select("id, updated_at").eq("status", "published").limit(500),
                supabase.from("products").select("id, updated_at").limit(500),
                supabase.from("profiles").select("username, updated_at").eq("role", "wushsha").limit(200),
            ]);

            (artworks || []).forEach((a: { id: string; updated_at?: string }) => {
                dynamicRoutes.push({
                    url: `${baseUrl}/artworks/${a.id}`,
                    lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
                    changeFrequency: "weekly" as const,
                    priority: 0.7,
                });
            });

            (products || []).forEach((p: { id: string; updated_at?: string }) => {
                dynamicRoutes.push({
                    url: `${baseUrl}/products/${p.id}`,
                    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
                    changeFrequency: "weekly" as const,
                    priority: 0.7,
                });
            });

            (profiles || []).forEach((p: { username: string; updated_at?: string }) => {
                if (p.username) {
                    dynamicRoutes.push({
                        url: `${baseUrl}/artists/${p.username}`,
                        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
                        changeFrequency: "weekly" as const,
                        priority: 0.6,
                    });
                }
            });
        } catch (e) {
            console.warn("[sitemap] Dynamic routes fetch failed:", e);
        }
    }

    return [...staticRoutes, ...dynamicRoutes];
}
