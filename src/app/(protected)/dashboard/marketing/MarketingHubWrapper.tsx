"use client";

// Server data fetch + client refresh wrapper for MarketingHubClient
import { useState, useTransition } from "react";
import { MarketingHubClient } from "@/components/admin/MarketingHubClient";
import type { SegmentSummary } from "@/lib/segment-engine";
import { computeSegments } from "@/lib/segment-engine";

// We use a client component that fetches on mount via server action
import { useEffect } from "react";

export function MarketingHubWrapper() {
    const [segments, setSegments] = useState<SegmentSummary | null>(null);
    const [isPending, startTransition] = useTransition();

    const load = () => {
        startTransition(async () => {
            try {
                const { getMarketingSegments } = await import("@/app/actions/marketing-segments");
                const result = await getMarketingSegments();
                if (result) setSegments(result);
            } catch {
                // fail silently
            }
        });
    };

    useEffect(() => {
        load();
    }, []);

    if (!segments) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl bg-theme-subtle animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <MarketingHubClient
            segments={segments}
            onRefresh={load}
            isRefreshing={isPending}
        />
    );
}
