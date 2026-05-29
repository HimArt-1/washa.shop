export class OperationTimeoutError extends Error {
    constructor(label: string, timeoutMs: number) {
        super(`${label} timed out after ${timeoutMs}ms`);
        this.name = "OperationTimeoutError";
    }
}

export function readPositiveIntegerEnv(name: string, fallback: number, min: number, max: number) {
    const raw = process.env[name];
    const parsed = raw ? Number(raw) : NaN;
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(Math.round(parsed), min), max);
}

export async function withTimeout<T>(operation: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
        return await Promise.race([
            Promise.resolve(operation),
            new Promise<T>((_, reject) => {
                timeout = setTimeout(() => reject(new OperationTimeoutError(label, timeoutMs)), timeoutMs);
            }),
        ]);
    } finally {
        if (timeout) {
            clearTimeout(timeout);
        }
    }
}

export function createTimeoutFetch(timeoutMs: number): typeof fetch {
    return async (input, init) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const upstreamSignal = init?.signal;

        if (upstreamSignal) {
            if (upstreamSignal.aborted) {
                controller.abort();
            } else {
                upstreamSignal.addEventListener("abort", () => controller.abort(), { once: true });
            }
        }

        try {
            return await fetch(input, {
                ...init,
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeout);
        }
    };
}
