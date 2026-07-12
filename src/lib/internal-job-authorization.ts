import "server-only";

const INTERNAL_JOB_AUTHORIZATION = Symbol("washa.internal-job-authorization");

export type InternalJobAuthorization = typeof INTERNAL_JOB_AUTHORIZATION;

export function authorizeInternalJobExecution(): InternalJobAuthorization {
    return INTERNAL_JOB_AUTHORIZATION;
}

export function assertInternalJobAuthorization(value: unknown): asserts value is InternalJobAuthorization {
    if (value !== INTERNAL_JOB_AUTHORIZATION) {
        throw new Error("Unauthorized internal job execution attempt");
    }
}
