import { getAdminUsers } from "@/app/actions/admin";
import { UsersClient } from "@/components/admin/UsersClient";

interface PageProps {
    searchParams: Promise<{ page?: string; role?: string; search?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const role = params.role || "all";
    const search = params.search || "";

    const { data: users, count, totalPages } = await getAdminUsers(page, role, search);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-fg">إدارة المستخدمين</h1>
                <p className="text-fg/40 mt-1">عرض وإدارة جميع المستخدمين على المنصة.</p>
            </div>

            <UsersClient
                users={users}
                count={count}
                totalPages={totalPages}
                currentPage={page}
                currentRole={role}
                currentSearch={search}
            />
        </div>
    );
}
