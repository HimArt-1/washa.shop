"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InventoryRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/dashboard/products-inventory?tab=inventory");
    }, [router]);

    return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
            <div className="theme-surface-panel max-w-md rounded-3xl p-6 text-center">
                <p className="text-sm font-bold text-theme">جاري فتح مركز المنتجات والمخزون</p>
                <p className="mt-2 text-sm leading-6 text-theme-subtle">
                    تم نقل إدارة المخزون إلى المركز الموحد لسهولة المتابعة والتنفيذ.
                </p>
                <Link
                    href="/dashboard/products-inventory?tab=inventory"
                    className="mt-5 inline-flex items-center justify-center rounded-xl border border-gold/20 bg-gold/10 px-4 py-2 text-sm font-bold text-gold transition-colors hover:bg-gold/15"
                >
                    فتح المخزون
                </Link>
            </div>
        </div>
    );
}
