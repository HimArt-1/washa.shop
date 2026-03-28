import { NextRequest, NextResponse } from "next/server";
import {
    clearDtfHistory,
    createDtfHistoryItem,
    DtfHistoryValidationError,
    listDtfHistory,
    requireWashaDtfHistoryAccess,
} from "@/lib/washa-dtf-history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const access = await requireWashaDtfHistoryAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    try {
        const items = await listDtfHistory(access.supabase, access.profileId);
        return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("[washa-dtf-studio.history.list]", error);
        return NextResponse.json({ error: "تعذر تحميل سجل التصاميم" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const access = await requireWashaDtfHistoryAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    let payload: unknown;
    try {
        payload = await request.json();
    } catch (error) {
        console.error("[washa-dtf-studio.history.parse]", error);
        return NextResponse.json({ error: "طلب غير صالح (JSON غير مقروء)" }, { status: 400 });
    }

    try {
        const item = await createDtfHistoryItem(access.supabase, access.profileId, payload);
        return NextResponse.json({ item }, { status: 201 });
    } catch (error) {
        console.error("[washa-dtf-studio.history.create]", error);
        const status = error instanceof DtfHistoryValidationError ? 400 : 500;
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "تعذر حفظ التصميم في السجل" },
            { status }
        );
    }
}

export async function DELETE() {
    const access = await requireWashaDtfHistoryAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    try {
        await clearDtfHistory(access.supabase, access.profileId);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[washa-dtf-studio.history.clear]", error);
        return NextResponse.json({ error: "تعذر مسح سجل التصاميم" }, { status: 500 });
    }
}
