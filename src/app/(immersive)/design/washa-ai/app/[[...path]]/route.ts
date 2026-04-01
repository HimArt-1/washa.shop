import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { resolveDesignPieceApiState } from "@/lib/design-piece-runtime";

export const runtime = "nodejs";

const DIST_ROOT = path.join(process.cwd(), "washa-dtf-studio", "dist");

function getContentType(filePath: string) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".html") return "text/html; charset=utf-8";
    if (ext === ".js") return "application/javascript; charset=utf-8";
    if (ext === ".css") return "text/css; charset=utf-8";
    if (ext === ".png") return "image/png";
    if (ext === ".svg") return "image/svg+xml";
    if (ext === ".json") return "application/json; charset=utf-8";
    if (ext === ".ico") return "image/x-icon";
    return "application/octet-stream";
}

function isHtmlShellRequest(relativePath: string, segments: string[]) {
    return segments.length === 0 || (!path.extname(relativePath) && segments[0] !== "assets");
}

async function ensureDtfStudioAccess(request: NextRequest) {
    const { visibility, access } = await resolveDesignPieceApiState();

    if (!visibility.design_piece || visibility.design_piece_dtf_studio_switch === false) {
        return NextResponse.redirect(new URL("/design", request.url));
    }

    if (!access.allowed) {
        return NextResponse.redirect(new URL("/design/washa-ai", request.url));
    }

    return null;
}

export async function GET(
    request: NextRequest,
    context: { params: { path?: string[] } }
) {
    const segments = context.params.path ?? [];
    const relativePath = segments.length > 0 ? path.join(...segments) : "index.html";

    if (isHtmlShellRequest(relativePath, segments)) {
        const guardResponse = await ensureDtfStudioAccess(request);
        if (guardResponse) {
            return guardResponse;
        }
    }

    const targetPath = path.join(DIST_ROOT, relativePath);
    const resolvedPath = path.resolve(targetPath);

    if (!resolvedPath.startsWith(path.resolve(DIST_ROOT))) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    try {
        const file = await readFile(resolvedPath);
        const isAsset = segments[0] === "assets";
        return new NextResponse(file, {
            headers: {
                "Content-Type": getContentType(resolvedPath),
                "Cache-Control": isAsset ? "public, max-age=31536000, immutable" : "no-store",
            },
        });
    } catch {
        if (!path.extname(relativePath)) {
            try {
                const indexFile = await readFile(path.join(DIST_ROOT, "index.html"));
                return new NextResponse(indexFile, {
                    headers: {
                        "Content-Type": "text/html; charset=utf-8",
                        "Cache-Control": "no-store",
                    },
                });
            } catch {
                return new NextResponse("DTF Studio build is missing", { status: 500 });
            }
        }

        return new NextResponse("Not Found", { status: 404 });
    }
}
