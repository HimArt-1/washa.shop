import { getClerkIdentitySnapshot, getClerkUsersList } from "@/app/actions/clerk-users";
import { AuthSyncCenter } from "@/components/admin/users/AuthSyncCenter";

interface PageProps {
    searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function ClerkUsersPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const search = params.search || "";

    const [{ data, totalCount, totalPages }, snapshot] = await Promise.all([
        getClerkUsersList(page, search),
        getClerkIdentitySnapshot(),
    ]);

    return (
        <AuthSyncCenter
            snapshot={snapshot}
            clientProps={{
                users: data,
                totalCount,
                totalPages,
                currentPage: page,
                currentSearch: search,
            }}
        />
    );
}
