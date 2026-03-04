import { seedData } from "@/lib/seed-data";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** مسار Seed — محمي بمفتاح سري. للإنتاج: لا يُنفّذ إلا بوجود SEED_SECRET في الطلب. */
export async function GET(req: NextRequest) {
    // في الإنتاج: يتطلب مفتاح سري في الهيدر أو query
    if (process.env.NODE_ENV === "production") {
        const secret = process.env.SEED_SECRET;
        const authHeader = req.headers.get("authorization");
        const authParam = req.nextUrl.searchParams.get("secret");

        const providedSecret = authHeader?.replace(/^Bearer\s+/i, "") || authParam;

        if (!secret || providedSecret !== secret) {
            return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
        }
    }

    try {
        await seedData();
        return NextResponse.json({ success: true, message: "Database seeded successfully!" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: "Seeding failed" }, { status: 500 });
    }
}
