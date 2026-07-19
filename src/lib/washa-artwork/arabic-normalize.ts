export function normalizeArabicForCompare(text: string): string {
    return text
        .normalize("NFKC")
        .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "")
        .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
        .replace(/[إأآٱ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/\s+/g, " ")
        .trim();
}

export function levenshtein(a: string, b: string): number {
    if (a === b) return 0;

    const left = Array.from(a);
    const right = Array.from(b);
    if (left.length === 0) return right.length;
    if (right.length === 0) return left.length;

    let previous = Array.from(
        { length: right.length + 1 },
        (_, index) => index
    );

    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
        const current = [leftIndex];
        for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
            const substitutionCost =
                left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
            current[rightIndex] = Math.min(
                current[rightIndex - 1] + 1,
                previous[rightIndex] + 1,
                previous[rightIndex - 1] + substitutionCost
            );
        }
        previous = current;
    }

    return previous[right.length];
}

export function isArabicTextMatch(
    observed: string,
    expected: string,
    tolerancePercent = 0.10
): { matches: boolean; distance: number; tolerance: number } {
    const normalizedObserved = normalizeArabicForCompare(observed);
    const normalizedExpected = normalizeArabicForCompare(expected);
    const distance = levenshtein(normalizedObserved, normalizedExpected);
    const tolerance = Math.max(
        1,
        Math.floor(normalizedExpected.length * tolerancePercent)
    );

    return {
        matches: distance <= tolerance,
        distance,
        tolerance,
    };
}
