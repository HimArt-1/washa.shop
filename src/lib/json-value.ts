import type { JsonValue } from "@/types/database";

export function isJsonValue(value: unknown, seen = new WeakSet<object>()): value is JsonValue {
    if (
        value === null
        || typeof value === "string"
        || typeof value === "boolean"
    ) {
        return true;
    }
    if (typeof value === "number") {
        return Number.isFinite(value);
    }
    if (typeof value !== "object" || seen.has(value)) {
        return false;
    }

    seen.add(value);
    const valid = Array.isArray(value)
        ? value.every((item) => isJsonValue(item, seen))
        : (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
            && Object.values(value).every((item) => isJsonValue(item, seen));
    seen.delete(value);
    return valid;
}

export function serializeJsonValue(value: unknown, label: string): JsonValue {
    let serialized: string | undefined;
    try {
        serialized = JSON.stringify(value);
    } catch {
        throw new TypeError(`${label} must be serializable as JSON.`);
    }
    if (serialized === undefined) {
        throw new TypeError(`${label} must be serializable as JSON.`);
    }

    const parsed: unknown = JSON.parse(serialized);
    if (!isJsonValue(parsed)) {
        throw new TypeError(`${label} must be a finite, acyclic JSON value.`);
    }
    return parsed;
}
