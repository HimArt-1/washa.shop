import { describe, expect, it } from "vitest";
import {
    resolveDtfMockupTemplate,
    type DtfMockupTemplate,
} from "@/lib/dtf-mockup-templates";

const garmentId = "11111111-1111-4111-8111-111111111111";
const blackColorId = "22222222-2222-4222-8222-222222222222";

function template(
    overrides: Partial<DtfMockupTemplate> = {}
): DtfMockupTemplate {
    return {
        id: "33333333-3333-4333-8333-333333333333",
        garment_id: garmentId,
        color_id: null,
        side: "front",
        base_image_url: "https://example.com/default-front.png",
        base_image_path: null,
        mask_image_url: null,
        mask_image_path: null,
        overlay_image_url: null,
        overlay_image_path: null,
        print_areas: [
            {
                print_position: "chest",
                print_size: "large",
                x: 0.25,
                y: 0.2,
                width: 0.5,
                height: 0.55,
                rotation: 0,
                physical_width_cm: 30,
                physical_height_cm: 36,
            },
        ],
        version: 1,
        sort_order: 0,
        is_active: true,
        created_at: "2026-07-18T00:00:00.000Z",
        updated_at: "2026-07-18T00:00:00.000Z",
        ...overrides,
    };
}

describe("WASHA AI mockup template resolution", () => {
    it("prefers the matching color template, then falls back to the garment default", () => {
        const defaultTemplate = template();
        const blackTemplate = template({
            id: "44444444-4444-4444-8444-444444444444",
            color_id: blackColorId,
            base_image_url: "https://example.com/black-front.png",
        });

        expect(resolveDtfMockupTemplate(
            [defaultTemplate, blackTemplate],
            {
                garmentId,
                colorId: blackColorId,
                printPosition: "chest",
                printSize: "large",
            }
        )?.template.id).toBe(blackTemplate.id);

        expect(resolveDtfMockupTemplate(
            [defaultTemplate, blackTemplate],
            {
                garmentId,
                colorId: "55555555-5555-4555-8555-555555555555",
                printPosition: "chest",
                printSize: "large",
            }
        )?.template.id).toBe(defaultTemplate.id);
    });

    it("uses the requested side and requires a compatible print area", () => {
        const frontTemplate = template();
        const backTemplate = template({
            id: "66666666-6666-4666-8666-666666666666",
            side: "back",
            base_image_url: "https://example.com/default-back.png",
            print_areas: [
                {
                    print_position: "back",
                    print_size: "large",
                    x: 0.22,
                    y: 0.18,
                    width: 0.56,
                    height: 0.62,
                    rotation: 0,
                    physical_width_cm: 32,
                    physical_height_cm: 40,
                },
            ],
        });

        const result = resolveDtfMockupTemplate(
            [frontTemplate, backTemplate],
            {
                garmentId,
                colorId: null,
                printPosition: "back",
                printSize: "large",
            }
        );

        expect(result?.template.id).toBe(backTemplate.id);
        expect(result?.area.print_position).toBe("back");
        expect(resolveDtfMockupTemplate(
            [frontTemplate],
            {
                garmentId,
                colorId: null,
                printPosition: "shoulder_left",
                printSize: "small",
            }
        )).toBeNull();
    });
});
