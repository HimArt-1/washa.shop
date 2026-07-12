import { describe, expect, it } from "vitest";
import type { DesignState, DtfStudioConfig } from "../../washa-dtf-studio/src/types";
import {
  createStudioDraft,
  getHighestReachableStep,
  hasMeaningfulStudioDraft,
  isStudioAppPath,
  parseStudioDraft,
  parseStudioStep,
  reconcileStudioDraftState,
  resolveStudioRestoreStep,
  studioStepToSlug,
} from "../../washa-dtf-studio/src/lib/studioDraft";

function designState(overrides: Partial<DesignState> = {}): DesignState {
  return {
    garmentId: null,
    garmentType: "",
    garmentColorId: null,
    garmentColor: "",
    garmentColorHex: "#111111",
    garmentSizeId: null,
    garmentSize: "",
    designMethod: "text",
    designPosition: "front_large",
    printOptionId: null,
    printPosition: "chest",
    printSize: "large",
    printPositionLabel: "أمامي",
    prompt: "",
    calligraphyText: "",
    referenceImage: null,
    referenceImageMimeType: null,
    styleId: null,
    style: "",
    techniqueId: null,
    technique: "",
    paletteId: null,
    palette: "",
    customPalette: "",
    removeBackground: true,
    avoidHardEdges: true,
    ...overrides,
  };
}

const config = {
  garments: [
    {
      id: "garment-1",
      name: "تيشيرت",
      slug: "shirt",
      imageUrl: null,
      aiReferenceFrontUrl: null,
      aiReferenceBackUrl: null,
      aiReferenceMode: "match_reference",
      sortOrder: 0,
      basePrice: 80,
      pricing: { chestLarge: 0, chestSmall: 0, backLarge: 0, backSmall: 0, shoulderLarge: 0, shoulderSmall: 0 },
      colors: [{ id: "color-1", garmentId: "garment-1", name: "أسود", hexCode: "#111111", imageUrl: null, sortOrder: 0 }],
      sizes: [{ id: "size-1", garmentId: "garment-1", colorId: "color-1", name: "L", imageFrontUrl: null, imageBackUrl: null, stockStatus: "available" }],
    },
  ],
  positions: [{ id: "position-1", name: "أمامي", description: null, imageUrl: null, printPosition: "chest", printSize: "large", price: 0, sortOrder: 0 }],
  styles: [{ id: "style-1", name: "هندسي", description: null, imageUrl: null, sortOrder: 0, prompt: "geometric" }],
  techniques: [{ id: "technique-1", name: "رقمي", description: null, imageUrl: null, sortOrder: 0, prompt: "digital" }],
  palettes: [{ id: "palette-1", name: "تلقائي", description: null, imageUrl: null, sortOrder: 0, prompt: "auto", colors: [] }],
} satisfies DtfStudioConfig;

describe("WASHA AI studio draft", () => {
  it("maps stable URL step slugs", () => {
    expect(parseStudioStep("idea")).toBe(2);
    expect(parseStudioStep("unknown")).toBeNull();
    expect(studioStepToSlug(5)).toBe("palette");
  });

  it("omits the reference image and bounds long text", () => {
    const draft = createStudioDraft(designState({ prompt: "x".repeat(4000), referenceImage: "large-image", referenceImageMimeType: "image/png" }), 3, 1000);

    expect(draft.state.prompt).toHaveLength(3000);
    expect(draft.state.referenceImage).toBeNull();
    expect(draft.referenceImageOmitted).toBe(true);
  });

  it("rejects expired and malformed drafts", () => {
    const draft = createStudioDraft(designState(), 2, 1000);
    expect(parseStudioDraft(JSON.stringify(draft), 1000 + 8 * 24 * 60 * 60 * 1000)).toBeNull();
    expect(parseStudioDraft(JSON.stringify({ ...draft, savedAt: 1000 + 10 * 60 * 1000 }), 1000)).toBeNull();
    expect(parseStudioDraft("not-json", 1000)).toBeNull();
    expect(parseStudioDraft(JSON.stringify({ ...draft, state: { ...draft.state, designMethod: "unknown" } }), 1000)).toBeNull();
    expect(parseStudioDraft(JSON.stringify({ ...draft, state: { ...draft.state, ideaBrief: { subject: "صقر", mood: 4 } } }), 1000)).toBeNull();
  });

  it("removes stale catalog ids while preserving valid selections", () => {
    const fallback = designState({ styleId: "style-1", style: "هندسي" });
    const restored = reconcileStudioDraftState(
      designState({
        garmentId: "garment-1",
        garmentType: "تيشيرت",
        garmentColorId: "missing-color",
        garmentColor: "قديم",
        garmentSizeId: "size-1",
        garmentSize: "L",
        styleId: "missing-style",
        style: "قديم",
      }),
      config,
      fallback,
    );

    expect(restored.garmentId).toBe("garment-1");
    expect(restored.garmentColorId).toBeNull();
    expect(restored.garmentSizeId).toBeNull();
    expect(restored.styleId).toBe("style-1");
  });

  it("recomputes placement fields from the current catalog", () => {
    const fallback = designState();
    const restored = reconcileStudioDraftState(
      designState({ printOptionId: "position-1", printPosition: "back", printSize: "small", printPositionLabel: "قديم" }),
      config,
      fallback,
    );

    expect(restored.printPosition).toBe("chest");
    expect(restored.printSize).toBe("large");
    expect(restored.printPositionLabel).toBe("أمامي");
  });

  it("limits restoration to the highest completed step", () => {
    const garmentReady = designState({ garmentId: "garment-1", garmentColorId: "color-1", garmentSizeId: "size-1" });
    expect(getHighestReachableStep(garmentReady)).toBe(2);
    expect(getHighestReachableStep({ ...garmentReady, prompt: "نمر هندسي", printOptionId: "position-1" })).toBe(4);
    expect(getHighestReachableStep({ ...garmentReady, designMethod: "image", referenceImage: null })).toBe(2);
  });

  it("never lets a URL jump past saved progress", () => {
    expect(resolveStudioRestoreStep(6, 2, 5)).toBe(2);
    expect(resolveStudioRestoreStep(3, 5, 5)).toBe(3);
  });

  it("does not persist a blank reset state", () => {
    expect(hasMeaningfulStudioDraft(designState(), 1)).toBe(false);
    expect(hasMeaningfulStudioDraft(designState({ garmentId: "garment-1" }), 1)).toBe(true);
  });

  it("preserves the omitted-image warning until the user changes method", () => {
    expect(createStudioDraft(designState({ designMethod: "image" }), 2, 1000, true).referenceImageOmitted).toBe(true);
    expect(createStudioDraft(designState({ designMethod: "text" }), 2, 1000, true).referenceImageOmitted).toBe(false);
  });

  it("accepts canonical and trailing-slash studio paths", () => {
    expect(isStudioAppPath("/design/washa-ai/app")).toBe(true);
    expect(isStudioAppPath("/design/washa-ai/app/")).toBe(true);
  });
});
