"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeFromWishlist } from "@/app/actions/social";
import { Loader2, Trash2 } from "lucide-react";

export function WishlistActions({ productId }: { productId: string }) {
    const router = useRouter();
    const [removing, setRemoving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRemove = async () => {
        setRemoving(true);
        setError(null);

        try {
            const result = await removeFromWishlist(productId);
            if (!result.success) {
                setError(result.error || "تعذر إزالة المنتج الآن.");
                return;
            }

            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "تعذر إزالة المنتج الآن.");
        } finally {
            setRemoving(false);
        }
    };

    return (
        <div className="mt-3 space-y-2">
            <button
                onClick={handleRemove}
                disabled={removing}
                className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-theme-subtle bg-theme-faint px-3 py-2 text-xs text-theme-subtle transition-colors hover:border-red-500/20 hover:bg-red-500/5 hover:text-red-400 disabled:opacity-50"
            >
                {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                إزالة من المحفوظات
            </button>
            {error && <p className="text-center text-[11px] text-red-400">{error}</p>}
        </div>
    );
}
