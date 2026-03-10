"use client";

import { useRouter } from "next/navigation";
import { removeFromWishlist } from "@/app/actions/social";
import { Trash2 } from "lucide-react";

export function WishlistActions({ productId }: { productId: string }) {
    const router = useRouter();

    const handleRemove = async () => {
        const result = await removeFromWishlist(productId);
        if (result.success) router.refresh();
    };

    return (
        <button
            onClick={handleRemove}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2 text-xs text-theme-subtle hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-colors"
        >
            <Trash2 className="w-3.5 h-3.5" />
            إزالة من المحفوظات
        </button>
    );
}
