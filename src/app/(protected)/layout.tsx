import { ensureProfile } from "@/lib/ensure-profile";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await ensureProfile();
    return <>{children}</>;
}
