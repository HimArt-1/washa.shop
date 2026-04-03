import { getPublicVisibility } from "@/app/actions/settings";
import { resolveDesignPieceAccess, type DesignPieceAccessResult } from "@/lib/design-piece-access";

export type DesignPieceVisibility = Awaited<ReturnType<typeof getPublicVisibility>>;

/** Same rule as `/design/washa-ai` before access checks: section on + DTF shortcut not disabled. */
export function isWashaAiRouteAvailable(visibility: {
    design_piece?: boolean;
    design_piece_dtf_studio_switch?: boolean;
}): boolean {
    return Boolean(visibility.design_piece) && visibility.design_piece_dtf_studio_switch !== false;
}

function getPublicAccessResult(): DesignPieceAccessResult {
    return {
        allowed: true,
        reason: "public_access",
    };
}

export async function resolveDesignPiecePageState(): Promise<{
    visibility: DesignPieceVisibility;
    publicGenerationEnabled: boolean;
    access: DesignPieceAccessResult;
    showWizard: boolean;
}> {
    const visibility = await getPublicVisibility();
    const publicGenerationEnabled = visibility.design_piece_generation_public === true;
    const access = publicGenerationEnabled
        ? getPublicAccessResult()
        : await resolveDesignPieceAccess();

    return {
        visibility,
        publicGenerationEnabled,
        access,
        showWizard: publicGenerationEnabled || access.allowed,
    };
}

export async function resolveDesignPieceApiState(): Promise<{
    visibility: DesignPieceVisibility;
    publicGenerationEnabled: boolean;
    access: DesignPieceAccessResult;
}> {
    const visibility = await getPublicVisibility();
    const publicGenerationEnabled = visibility.design_piece_generation_public === true;
    const access = await resolveDesignPieceAccess({
        allowPublicAccess: publicGenerationEnabled,
    });

    return {
        visibility,
        publicGenerationEnabled,
        access,
    };
}
