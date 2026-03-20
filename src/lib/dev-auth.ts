export type DevAuthUser = {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    imageUrl: null;
    primaryEmailAddressId: string;
    emailAddresses: Array<{
        id: string;
        emailAddress: string;
    }>;
};

function normalizeEnvFlag(value?: string | null) {
    return value?.trim().toLowerCase() === "true";
}

export function isDevAuthBypassEnabled() {
    return normalizeEnvFlag(process.env.DEV_AUTH_BYPASS);
}

export function shouldBypassClerkForDashboardPath(pathname: string) {
    return isDevAuthBypassEnabled() && pathname.startsWith("/dashboard");
}

export function getDevAdminUser(): DevAuthUser {
    const email =
        process.env.DEV_ADMIN_EMAIL?.trim().toLowerCase() ||
        process.env.ADMIN_EMAIL?.trim().toLowerCase() ||
        "dev-admin@local.test";

    return {
        id: process.env.DEV_ADMIN_CLERK_ID?.trim() || "dev-admin-local",
        firstName: "Local",
        lastName: "Admin",
        username: "local_admin",
        imageUrl: null,
        primaryEmailAddressId: "dev-admin-email",
        emailAddresses: [
            {
                id: "dev-admin-email",
                emailAddress: email,
            },
        ],
    };
}
