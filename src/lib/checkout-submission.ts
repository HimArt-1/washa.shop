export class CheckoutSubmissionTimeoutError extends Error {
    constructor() {
        super("Checkout submission exceeded its client deadline");
        this.name = "CheckoutSubmissionTimeoutError";
    }
}

export function runCheckoutSubmission<TResult>(
    task: Promise<TResult>,
    timeoutMs: number
): Promise<TResult> {
    return new Promise<TResult>((resolve, reject) => {
        let settled = false;
        const timeoutId = globalThis.setTimeout(() => {
            if (settled) return;
            settled = true;
            reject(new CheckoutSubmissionTimeoutError());
        }, timeoutMs);

        task.then(
            (result) => {
                if (settled) return;
                settled = true;
                globalThis.clearTimeout(timeoutId);
                resolve(result);
            },
            (error) => {
                if (settled) return;
                settled = true;
                globalThis.clearTimeout(timeoutId);
                reject(error);
            }
        );
    });
}
