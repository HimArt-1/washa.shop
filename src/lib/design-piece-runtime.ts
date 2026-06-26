import { getPublicVisibility } from "@/app/actions/settings";
import { resolveDesignPieceAccess, type DesignPieceAccessResult } from "@/lib/design-piece-access";

export type DesignPieceVisibility = Awaited<ReturnType<typeof getPublicVisibility>>;

type DesignPieceRuntimeOptions = {
    allowPublicAccess?: boolean;
};

/** Same rule as `/design/washa-ai` before access checks: section on + DTF shortcut not disabled. */
export function isWashaAiRouteAvailable(visibility: {
    design_piece?: boolean;
    design_piece_dtf_studio_switch?: boolean;
}): boolean {
    return Boolean(visibility.design_piece) && visibility.design_piece_dtf_studio_switch !== false;
}

export async function resolveDesignPiecePageState(options?: DesignPieceRuntimeOptions): Promise<{
    visibility: DesignPieceVisibility;
    publicGenerationEnabled: boolean;
    access: DesignPieceAccessResult;
    showWizard: boolean;
}> {
    const visibility = await getPublicVisibility();
    const allowPublicAccess = options?.allowPublicAccess === true;
    const access = await resolveDesignPieceAccess({ allowPublicAccess });

    return {
        visibility,
        publicGenerationEnabled: allowPublicAccess,
        access,
        showWizard: access.allowed,
    };
}
