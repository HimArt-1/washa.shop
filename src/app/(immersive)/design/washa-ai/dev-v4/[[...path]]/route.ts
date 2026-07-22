import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { ensureWashaAiV4PageAccess } from "@/lib/washa-ai-v4-access";

export const runtime = "nodejs";

const DIST_ROOT = path.join(process.cwd(), "washa-dtf-studio", "dist");
const V4_SHELL = "v4.html";

export async function GET(
    _request: NextRequest,
    _context: { params: Promise<{ path?: string[] }> }
) {
    const guard = await ensureWashaAiV4PageAccess();
    if (guard) return guard;

    try {
        const html = await readFile(path.join(DIST_ROOT, V4_SHELL), "utf8");
        return new NextResponse(html, {
            headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        });
    } catch {
        return new NextResponse("WASHA AI v4 build is missing", { status: 500 });
    }
}
