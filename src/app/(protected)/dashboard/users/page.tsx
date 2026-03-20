import {
    getAdminUsers,
    getIdentityOperationsSnapshot,
} from "@/app/actions/admin";
import { IdentityOperationsCenter } from "@/components/admin/users/IdentityOperationsCenter";

interface PageProps {
    searchParams: Promise<{ page?: string; role?: string; search?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const role = params.role || "all";
    const search = params.search || "";

    const [{ data: users, count, totalPages }, snapshot] = await Promise.all([
        getAdminUsers(page, role, search),
        getIdentityOperationsSnapshot(),
    ]);

    return (
        <IdentityOperationsCenter
            snapshot={snapshot}
            clientProps={{
                users,
                count,
                totalPages,
                currentPage: page,
                currentRole: role,
                currentSearch: search,
                stats: {
                    total: snapshot.stats.total,
                    wushsha: snapshot.stats.wushsha,
                    subscriber: snapshot.stats.subscriber,
                    admin: snapshot.stats.admin,
                },
            }}
        />
    );
}
