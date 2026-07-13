import { describe, expect, it } from "vitest";
import {
  assessGuidedIdea,
  buildCreativeDirections,
  buildGuidedIdeaPrompt,
  createEmptyGuidedIdeaBrief,
  isGuidedIdeaStale,
} from "../../washa-dtf-studio/src/lib/ideaBuilder";

describe("WASHA AI guided idea builder", () => {
  it("builds a concise Arabic prompt from structured answers", () => {
    const prompt = buildGuidedIdeaPrompt({
      subject: "صقر هندسي",
      mood: "جريء وواثق",
      meaning: "الطموح والحرية",
      wording: "حلّق عاليًا",
      avoid: "الخلفيات المزدحمة",
      direction: "cinematic",
    });

    expect(prompt).toContain("صقر هندسي");
    expect(prompt).toContain("جريء وواثق");
    expect(prompt).toContain("الطموح والحرية");
    expect(prompt).toContain("حلّق عاليًا");
    expect(prompt).toContain("الخلفيات المزدحمة");
    expect(prompt).toContain("برؤية سينمائية");
    expect(prompt.length).toBeLessThan(420);
  });

  it("offers cinematic, symbolic, and abstract directions tailored to the idea", () => {
    const directions = buildCreativeDirections({
      ...createEmptyGuidedIdeaBrief(),
      subject: "نخلة عربية هندسية",
      meaning: "الأصالة والنمو",
    });

    expect(directions.map((direction) => direction.id)).toEqual(["cinematic", "symbolic", "abstract"]);
    expect(directions.every((direction) => direction.description.includes("نخلة عربية هندسية"))).toBe(true);
  });

  it("does not produce a prompt without a subject", () => {
    expect(buildGuidedIdeaPrompt({ ...createEmptyGuidedIdeaBrief(), mood: "فاخر" })).toBe("");
  });

  it("returns specific guidance for an incomplete idea", () => {
    const quality = assessGuidedIdea({ ...createEmptyGuidedIdeaBrief(), subject: "أسد" });

    expect(quality.tier).toBe("needs-details");
    expect(quality.suggestions).toContain("حدد الطابع أو الشعور المطلوب");
  });

  it("recognizes a complete brief", () => {
    const quality = assessGuidedIdea({
      subject: "نخلة عربية بتكوين هندسي",
      mood: "هادئ وفاخر",
      meaning: "الأصالة والنمو",
      wording: "",
      avoid: "التفاصيل الصغيرة جدًا",
      direction: "symbolic",
    });

    expect(quality.tier).toBe("strong");
    expect(quality.score).toBeGreaterThanOrEqual(4);
  });

  it("keeps a complete professional ending when answers are very long", () => {
    const longAnswer = "تفاصيل عربية هندسية متوازنة ".repeat(20);
    const prompt = buildGuidedIdeaPrompt({
      subject: longAnswer,
      mood: longAnswer,
      meaning: longAnswer,
      wording: longAnswer,
      avoid: longAnswer,
      direction: "abstract",
    });

    expect(prompt.length).toBeLessThanOrEqual(420);
    expect(prompt).toContain("بتكوين متوازن");
    expect(prompt.endsWith(".")).toBe(true);
  });

  it("detects when structured answers changed after composing", () => {
    const brief = { ...createEmptyGuidedIdeaBrief(), subject: "صقر هندسي" };
    const source = buildGuidedIdeaPrompt(brief);

    expect(isGuidedIdeaStale(brief, source)).toBe(false);
    expect(isGuidedIdeaStale({ ...brief, mood: "هادئ وفاخر" }, source)).toBe(true);
    expect(isGuidedIdeaStale({ ...brief, direction: "cinematic" }, source)).toBe(true);
  });
});
