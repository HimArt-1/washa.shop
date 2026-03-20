import {
    getAdminApplications,
    getApplicationsOperationsSnapshot,
} from "@/app/actions/admin";
import { ApplicationsOperationsCenter } from "@/components/admin/applications/ApplicationsOperationsCenter";

interface PageProps {
    searchParams?: {
        status?: string;
        joinType?: string;
        gender?: string;
        ageBand?: string;
        identityState?: string;
    };
}

export default async function AdminApplicationsPage({ searchParams }: PageProps) {
    const params = searchParams ?? {};
    const status = params.status || "all";
    const joinType = params.joinType || "all";
    const gender = params.gender || "all";
    const ageBand = params.ageBand || "all";
    const identityState = params.identityState || "all";

    let applications: any[] = [];
    let count = 0;
    let snapshot: Awaited<ReturnType<typeof getApplicationsOperationsSnapshot>> = {
        stats: {
            total: 0,
            pending: 0,
            reviewing: 0,
            accepted: 0,
            rejected: 0,
            createdToday: 0,
            waitingDecision: 0,
            acceptedWithoutProfile: 0,
            acceptedWithoutClerk: 0,
            highPriority: 0,
        },
        intakeQueue: [],
        identityBacklog: [],
        recentlyReviewed: [],
        priorityQueue: [],
        segments: {
            joinTypeMix: [],
            genderMix: [],
            ageBands: [],
            styleSignals: [],
        },
    };

    try {
        const [result, operationsSnapshot] = await Promise.all([
            getAdminApplications({ status, joinType, gender, ageBand, identityState }),
            getApplicationsOperationsSnapshot(),
        ]);

        applications = result.data ?? [];
        count = result.count ?? 0;
        snapshot = operationsSnapshot;
    } catch (err) {
        console.error("[Applications] Error:", err);
    }

    return (
        <ApplicationsOperationsCenter
            snapshot={snapshot}
            clientProps={{
                applications,
                count,
                currentStatus: status,
                currentJoinType: joinType,
                currentGender: gender,
                currentAgeBand: ageBand,
                currentIdentityState: identityState,
            }}
        />
    );
}
