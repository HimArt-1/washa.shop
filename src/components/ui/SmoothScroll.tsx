"use client";

import { ReactLenis } from "@studio-freight/react-lenis";
import type { ComponentType, ReactNode } from "react";

const SmoothReactLenis = ReactLenis as unknown as ComponentType<{
    root?: boolean;
    options?: { lerp?: number; duration?: number; smoothWheel?: boolean };
    children?: ReactNode;
}>;

export function SmoothScroll({ children }: { children: ReactNode }) {
    return (
        <SmoothReactLenis root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
            {children}
        </SmoothReactLenis>
    );
}
