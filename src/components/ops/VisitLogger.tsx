"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function VisitLogger() {
    const lastPath = useRef<string | null>(null);
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window === "undefined" || !pathname) return;
        if (lastPath.current === pathname) return;
        lastPath.current = pathname;

        let sid = "";
        try {
            sid = sessionStorage.getItem("wusha_sid") || crypto.randomUUID?.()?.slice(0, 8) || "";
            if (!sessionStorage.getItem("wusha_sid")) sessionStorage.setItem("wusha_sid", sid);
        } catch {
            sid = "";
        }

        const sp = new URLSearchParams(window.location.search);
        const utm = {
            utm_source:   sp.get("utm_source")   || null,
            utm_medium:   sp.get("utm_medium")   || null,
            utm_campaign: sp.get("utm_campaign") || null,
            utm_content:  sp.get("utm_content")  || null,
            utm_term:     sp.get("utm_term")     || null,
        };
        // persist first-touch UTM per session
        if (utm.utm_source && !sessionStorage.getItem("wusha_utm")) {
            sessionStorage.setItem("wusha_utm", JSON.stringify(utm));
        }
        const storedUtm = (() => {
            try { return JSON.parse(sessionStorage.getItem("wusha_utm") || "{}"); } catch { return {}; }
        })();

        fetch("/api/ops/visit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                path: pathname,
                fullUrl: window.location.href,
                referrer: document.referrer || null,
                sessionId: sid,
                ...storedUtm,
            }),
        }).catch(() => {});
    }, [pathname]);

    return null;
}
