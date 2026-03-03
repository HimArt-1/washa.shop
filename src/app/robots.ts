import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = BASE_URL.replace(/\/$/, "");

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/dashboard",
                    "/studio",
                    "/account",
                    "/checkout",
                    "/sign-in",
                    "/sign-up",
                    "/api/",
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
