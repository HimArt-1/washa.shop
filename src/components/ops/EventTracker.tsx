"use client";

// وشّى | WASHA — هوك تتبع الأحداث السلوكية (client-side)
import { useCallback, useRef } from "react";
import type { BehavioralEventType } from "@/lib/analytics-events";

export interface TrackEventOptions {
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    pagePath?: string;
}

function getSessionId(): string {
    if (typeof window === "undefined") return "";
    let sid = sessionStorage.getItem("wusha_sid");
    if (!sid) {
        sid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem("wusha_sid", sid);
    }
    return sid;
}

export function useTrackEvent() {
    const pendingRef = useRef(new Set<string>());

    const trackEvent = useCallback(
        async (eventType: BehavioralEventType, options: TrackEventOptions = {}) => {
            const dedupKey = `${eventType}-${options.entityId ?? ""}`;
            if (pendingRef.current.has(dedupKey)) return;
            pendingRef.current.add(dedupKey);
            setTimeout(() => pendingRef.current.delete(dedupKey), 2000);

            try {
                await fetch("/api/ops/event", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        eventType,
                        sessionId: getSessionId(),
                        pagePath: options.pagePath ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
                        ...options,
                    }),
                });
            } catch {
                // fire-and-forget — silently ignore
            }
        },
        []
    );

    return trackEvent;
}
