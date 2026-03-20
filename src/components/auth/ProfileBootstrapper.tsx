"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";

export function ProfileBootstrapper() {
    const { isLoaded, isSignedIn, user } = useUser();
    const inFlight = useRef<string | null>(null);

    useEffect(() => {
        if (!isLoaded || !isSignedIn || !user?.id) return;

        const storageKey = `wusha:profile-bootstrap:${user.id}`;

        try {
            if (sessionStorage.getItem(storageKey) === "done") {
                return;
            }
        } catch {
            // Ignore storage access issues and continue with a single in-memory attempt.
        }

        if (inFlight.current === user.id) return;
        inFlight.current = user.id;

        fetch("/api/profile/ensure", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Profile bootstrap failed with status ${response.status}`);
                }
                try {
                    sessionStorage.setItem(storageKey, "done");
                } catch {
                    // Ignore storage issues.
                }
            })
            .catch(() => {
                inFlight.current = null;
            });
    }, [isLoaded, isSignedIn, user?.id]);

    return null;
}
