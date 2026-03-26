import { NextRequest, NextResponse } from "next/server";
import { deleteDtfHistoryItem, requireWashaDtfHistoryAccess } from "@/lib/washa-dtf-history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
    _request: NextRequest,
    context: { params: { id: string } }
) {
    const access = await requireWashaDtfHistoryAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    try {
        await deleteDtfHistoryItem(access.supabase, access.profileId, context.params.id);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[washa-dtf-studio.history.delete]", error);
        return NextResponse.json({ error: "تعذر حذف العنصر" }, { status: 500 });
    }
}
