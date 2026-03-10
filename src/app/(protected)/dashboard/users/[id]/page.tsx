import { getCustomerProfile } from "@/app/actions/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CustomerProfileClient } from "./CustomerProfileClient";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage({ params }: { params: { id: string } }) {
    const customer = await getCustomerProfile(params.id);

    if (!customer) {
        notFound();
    }

    const { profile, orders, tickets, stats } = customer;

    return (
        <div className="space-y-6">
            <AdminHeader
                title={String(profile.display_name || "مستخدم")}
                subtitle={`@${profile.username || "—"} · ${String(profile.role || "subscriber")}`}
                actions={
                    <Link href="/dashboard/users"
                        className="px-4 py-2 text-xs text-theme-subtle hover:text-theme-soft border border-theme-subtle rounded-lg hover:bg-theme-subtle transition-all">
                        ← العودة للمستخدمين
                    </Link>
                }
            />
            <CustomerProfileClient
                profile={profile}
                orders={orders}
                tickets={tickets}
                stats={stats}
            />
        </div>
    );
}
