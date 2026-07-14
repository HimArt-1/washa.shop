import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";

export const metadata: Metadata = {
    title: "انضم إلى مجتمع وشّى",
    description: "سجّل اهتمامك بالانضمام إلى مجتمع وشّى للفن والأزياء والتصميم.",
    alternates: { canonical: `${SITE_URL}/join` },
};

export default function JoinLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return children;
}
