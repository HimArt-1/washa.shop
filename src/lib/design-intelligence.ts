export type DesignIntelligenceMetadata = {
    creative_direction?: string | null;
    energy?: "low" | "medium" | "high" | null;
    complexity?: "minimal" | "balanced" | "bold" | null;
    luxury_tier?: "core" | "signature" | "editorial" | null;
    story_hook?: string | null;
    palette_family?: string | null;
    keywords?: string[];
    moods?: string[];
    audiences?: string[];
    placements?: string[];
    recommended_methods?: string[];
    notes?: string | null;
};

export type DesignColorToken = {
    hex: string;
    name: string;
};

export type SmartStoreOptionType =
    | "garment"
    | "style"
    | "art_style"
    | "color_package"
    | "studio_item"
    | "preset";

export type DesignMethod = "from_text" | "from_image" | "studio";
export type PrintPosition = "chest" | "back" | "shoulder_right" | "shoulder_left";
export type PrintSize = "large" | "small";

export type DesignPreset = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    story: string | null;
    badge: string | null;
    image_url: string | null;
    garment_id: string | null;
    design_method: DesignMethod | null;
    style_id: string | null;
    art_style_id: string | null;
    color_package_id: string | null;
    studio_item_id: string | null;
    print_position: PrintPosition | null;
    print_size: PrintSize | null;
    sort_order: number;
    is_featured: boolean;
    is_active: boolean;
    metadata: DesignIntelligenceMetadata;
    created_at: string;
    updated_at: string;
};

export type DesignOptionCompatibility = {
    id: string;
    source_type: SmartStoreOptionType;
    source_id: string;
    target_type: SmartStoreOptionType;
    target_id: string;
    relation: "recommended" | "signature" | "avoid";
    score: number;
    reason: string | null;
    created_at: string;
    updated_at: string;
};

export type RankedDesignCandidate<T> = {
    item: T;
    score: number;
    relation: DesignOptionCompatibility["relation"] | null;
    signals: string[];
};

type DesignScoringLookup = {
    lookup: Map<string, DesignOptionCompatibility>;
    label: string;
    weight?: number;
};

type MetadataScoringAnchor = {
    label: string;
    metadata?: DesignIntelligenceMetadata | null;
    weight?: number;
};

function asObject(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export function parseCsvList(value: FormDataEntryValue | string | null | undefined) {
    return String(value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

export function normalizeDesignMetadata(value: unknown): DesignIntelligenceMetadata {
    const input = asObject(value);
    const list = (key: keyof DesignIntelligenceMetadata) => {
        const raw = input[key];
        if (!Array.isArray(raw)) return [];
        return raw.map((item) => String(item).trim()).filter(Boolean);
    };
    const scalar = (key: keyof DesignIntelligenceMetadata) => {
        const raw = input[key];
        return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
    };

    return {
        creative_direction: scalar("creative_direction"),
        energy: scalar("energy") as DesignIntelligenceMetadata["energy"],
        complexity: scalar("complexity") as DesignIntelligenceMetadata["complexity"],
        luxury_tier: scalar("luxury_tier") as DesignIntelligenceMetadata["luxury_tier"],
        story_hook: scalar("story_hook"),
        palette_family: scalar("palette_family"),
        keywords: list("keywords"),
        moods: list("moods"),
        audiences: list("audiences"),
        placements: list("placements"),
        recommended_methods: list("recommended_methods"),
        notes: scalar("notes"),
    };
}

export function buildDesignMetadataFromFormData(formData: FormData): DesignIntelligenceMetadata {
    return buildDesignMetadataFromInput({
        creative_direction: formData.get("creative_direction"),
        energy: formData.get("energy"),
        complexity: formData.get("complexity"),
        luxury_tier: formData.get("luxury_tier"),
        story_hook: formData.get("story_hook"),
        palette_family: formData.get("palette_family"),
        keywords: formData.get("keywords"),
        moods: formData.get("moods"),
        audiences: formData.get("audiences"),
        placements: formData.get("placements"),
        recommended_methods: formData.get("recommended_methods"),
        notes: formData.get("notes"),
    });
}

export function buildDesignMetadataFromInput(input: Record<string, unknown>): DesignIntelligenceMetadata {
    return normalizeDesignMetadata({
        creative_direction: input.creative_direction,
        energy: input.energy,
        complexity: input.complexity,
        luxury_tier: input.luxury_tier,
        story_hook: input.story_hook,
        palette_family: input.palette_family,
        keywords: Array.isArray(input.keywords) ? input.keywords : parseCsvList(input.keywords as string | null | undefined),
        moods: Array.isArray(input.moods) ? input.moods : parseCsvList(input.moods as string | null | undefined),
        audiences: Array.isArray(input.audiences) ? input.audiences : parseCsvList(input.audiences as string | null | undefined),
        placements: Array.isArray(input.placements) ? input.placements : parseCsvList(input.placements as string | null | undefined),
        recommended_methods: Array.isArray(input.recommended_methods)
            ? input.recommended_methods
            : parseCsvList(input.recommended_methods as string | null | undefined),
        notes: input.notes,
    });
}

export function normalizeColorTokens(value: unknown): DesignColorToken[] {
    if (!Array.isArray(value)) return [];

    return value
        .map((item, index) => {
            if (typeof item === "string") {
                return {
                    hex: item,
                    name: `لون ${index + 1}`,
                };
            }

            const entry = asObject(item);
            const hex = typeof entry.hex === "string"
                ? entry.hex
                : typeof entry.color === "string"
                    ? entry.color
                    : null;
            if (!hex) return null;

            return {
                hex,
                name: typeof entry.name === "string" && entry.name.trim().length > 0
                    ? entry.name.trim()
                    : `لون ${index + 1}`,
            };
        })
        .filter((item): item is DesignColorToken => Boolean(item));
}

export function getCompatibilityLookup(
    items: DesignOptionCompatibility[],
    sourceType: SmartStoreOptionType,
    sourceId: string | null | undefined,
    targetType: SmartStoreOptionType
) {
    if (!sourceId) return new Map<string, DesignOptionCompatibility>();

    return new Map(
        items
            .filter(
                (item) =>
                    item.source_type === sourceType &&
                    item.source_id === sourceId &&
                    item.target_type === targetType
            )
            .map((item) => [item.target_id, item])
    );
}

export function sortByCompatibility<T extends { id: string }>(
    items: T[],
    lookup: Map<string, DesignOptionCompatibility>
) {
    return [...items].sort((a, b) => {
        const aScore = lookup.get(a.id)?.score ?? -1;
        const bScore = lookup.get(b.id)?.score ?? -1;
        return bScore - aScore;
    });
}

function getRelationPriority(relation: DesignOptionCompatibility["relation"] | null) {
    if (relation === "signature") return 3;
    if (relation === "recommended") return 2;
    if (relation === "avoid") return 1;
    return 0;
}

function getMethodLabel(method: DesignMethod) {
    if (method === "from_text") return "من نص";
    if (method === "from_image") return "من صورة";
    return "ستيديو وشّى";
}

function getPlacementLabel(position: PrintPosition) {
    if (position === "chest") return "الصدر";
    if (position === "back") return "الظهر";
    if (position === "shoulder_right") return "الكتف الأيمن";
    return "الكتف الأيسر";
}

function pushSignal(signals: string[], signal: string) {
    if (!signals.includes(signal)) {
        signals.push(signal);
    }
}

function countOverlap(left: string[] = [], right: string[] = []) {
    if (left.length === 0 || right.length === 0) return 0;

    const rightSet = new Set(right.map((item) => item.toLowerCase()));
    return left.filter((item) => rightSet.has(item.toLowerCase())).length;
}

function scoreMetadataAlignment(
    metadata: DesignIntelligenceMetadata | null | undefined,
    anchors: MetadataScoringAnchor[],
    signals: string[]
) {
    if (!metadata) return 0;

    let score = 0;
    const energyScale = { low: 0, medium: 1, high: 2 } as const;
    const complexityScale = { minimal: 0, balanced: 1, bold: 2 } as const;

    for (const anchor of anchors) {
        const reference = anchor.metadata;
        if (!reference) continue;

        const weight = anchor.weight ?? 1;

        if (metadata.luxury_tier && reference.luxury_tier) {
            if (metadata.luxury_tier === reference.luxury_tier) {
                score += Math.round(12 * weight);
                pushSignal(signals, `نفس المستوى مع ${anchor.label}`);
            } else {
                score -= Math.round(3 * weight);
            }
        }

        if (metadata.energy && reference.energy) {
            const distance = Math.abs(energyScale[metadata.energy] - energyScale[reference.energy]);
            if (distance === 0) {
                score += Math.round(10 * weight);
                pushSignal(signals, `بنفس الطاقة مع ${anchor.label}`);
            } else if (distance === 1) {
                score += Math.round(3 * weight);
            } else {
                score -= Math.round(6 * weight);
            }
        }

        if (metadata.complexity && reference.complexity) {
            const distance = Math.abs(complexityScale[metadata.complexity] - complexityScale[reference.complexity]);
            if (distance === 0) {
                score += Math.round(9 * weight);
                pushSignal(signals, `بنفس الكثافة مع ${anchor.label}`);
            } else if (distance === 1) {
                score += Math.round(2 * weight);
            } else {
                score -= Math.round(5 * weight);
            }
        }

        if (metadata.palette_family && reference.palette_family) {
            if (metadata.palette_family === reference.palette_family) {
                score += Math.round(14 * weight);
                pushSignal(signals, `من نفس عائلة الألوان مع ${anchor.label}`);
            } else {
                score -= Math.round(2 * weight);
            }
        }

        const keywordOverlap = Math.min(countOverlap(metadata.keywords ?? [], reference.keywords ?? []), 2);
        if (keywordOverlap > 0) {
            score += Math.round(keywordOverlap * 4 * weight);
            pushSignal(
                signals,
                keywordOverlap > 1 ? `يلتقط مفردات ${anchor.label}` : `قريب من روح ${anchor.label}`
            );
        }

        const moodOverlap = Math.min(countOverlap(metadata.moods ?? [], reference.moods ?? []), 2);
        if (moodOverlap > 0) {
            score += Math.round(moodOverlap * 3 * weight);
            pushSignal(signals, `قريب من مزاج ${anchor.label}`);
        }

        const audienceOverlap = Math.min(countOverlap(metadata.audiences ?? [], reference.audiences ?? []), 1);
        if (audienceOverlap > 0) {
            score += Math.round(4 * weight);
        }
    }

    return score;
}

export function rankDesignCandidates<T extends { id: string; metadata?: DesignIntelligenceMetadata | null }>(
    items: T[],
    {
        preferredId,
        method,
        printPosition,
        lookups = [],
        metadataAnchors = [],
    }: {
        preferredId?: string | null;
        method?: DesignMethod | null;
        printPosition?: PrintPosition | null;
        lookups?: DesignScoringLookup[];
        metadataAnchors?: MetadataScoringAnchor[];
    }
): RankedDesignCandidate<T>[] {
    return items
        .map((item, index) => {
            let score = 0;
            let relation: DesignOptionCompatibility["relation"] | null = null;
            const signals: string[] = [];

            if (preferredId && preferredId === item.id) {
                score += 32;
                pushSignal(signals, "مطابق للـ preset");
            }

            for (const entry of lookups) {
                const compatibility = entry.lookup.get(item.id);
                if (!compatibility) continue;

                const weight = entry.weight ?? 1;
                const relationBonus =
                    compatibility.relation === "signature"
                        ? 24
                        : compatibility.relation === "recommended"
                            ? 12
                            : -28;

                score += compatibility.score * weight + relationBonus;

                if (getRelationPriority(compatibility.relation) > getRelationPriority(relation)) {
                    relation = compatibility.relation;
                }

                if (compatibility.relation === "signature") {
                    pushSignal(signals, `Signature مع ${entry.label}`);
                } else if (compatibility.relation === "recommended") {
                    pushSignal(signals, `مناسب مع ${entry.label}`);
                } else {
                    pushSignal(signals, `أضعف مع ${entry.label}`);
                }
            }

            score += scoreMetadataAlignment(item.metadata, metadataAnchors, signals);

            const recommendedMethods = item.metadata?.recommended_methods ?? [];
            if (method && recommendedMethods.length > 0) {
                if (recommendedMethods.includes(method)) {
                    score += 18;
                    pushSignal(signals, `مناسب لطريقة ${getMethodLabel(method)}`);
                } else {
                    score -= 10;
                }
            }

            const placements = item.metadata?.placements ?? [];
            if (printPosition && placements.length > 0) {
                if (placements.includes(printPosition)) {
                    score += 14;
                    pushSignal(signals, `مناسب لـ ${getPlacementLabel(printPosition)}`);
                } else {
                    score -= 8;
                }
            }

            return {
                item,
                score,
                relation,
                signals: signals.slice(0, 3),
                index,
            };
        })
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.index - b.index;
        })
        .map(({ index: _index, ...entry }) => entry);
}

export function rankDesignPresets<T extends {
    id: string;
    metadata?: DesignIntelligenceMetadata | null;
    description?: string | null;
    story?: string | null;
    garment_id?: string | null;
    design_method?: DesignMethod | null;
    print_position?: PrintPosition | null;
    print_size?: PrintSize | null;
    is_featured?: boolean;
}>(
    items: T[],
    {
        garmentId,
        method,
        printPosition,
        printSize,
        metadataAnchors = [],
    }: {
        garmentId?: string | null;
        method?: DesignMethod | null;
        printPosition?: PrintPosition | null;
        printSize?: PrintSize | null;
        metadataAnchors?: MetadataScoringAnchor[];
    }
): RankedDesignCandidate<T>[] {
    return items
        .map((item, index) => {
            let score = item.is_featured ? 10 : 0;
            const signals: string[] = [];

            if (garmentId && item.garment_id) {
                if (item.garment_id === garmentId) {
                    score += 28;
                    pushSignal(signals, "مناسب للقطعة الحالية");
                } else {
                    score -= 8;
                }
            }

            if (method && item.design_method) {
                if (item.design_method === method) {
                    score += 22;
                    pushSignal(signals, `جاهز لطريقة ${getMethodLabel(method)}`);
                } else {
                    score -= 8;
                }
            }

            if (printPosition && item.print_position) {
                if (item.print_position === printPosition) {
                    score += 16;
                    pushSignal(signals, `مصمم لـ ${getPlacementLabel(printPosition)}`);
                } else {
                    score -= 6;
                }
            }

            if (printSize && item.print_size) {
                if (item.print_size === printSize) {
                    score += 8;
                } else {
                    score -= 3;
                }
            }

            const recommendedMethods = item.metadata?.recommended_methods ?? [];
            if (method && recommendedMethods.length > 0 && recommendedMethods.includes(method)) {
                score += 10;
            }

            const placements = item.metadata?.placements ?? [];
            if (printPosition && placements.length > 0 && placements.includes(printPosition)) {
                score += 8;
            }

            score += scoreMetadataAlignment(item.metadata, metadataAnchors, signals);

            return {
                item,
                score,
                relation: null,
                signals: signals.slice(0, 3),
                index,
            };
        })
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.index - b.index;
        })
        .map(({ index: _index, ...entry }) => entry);
}
