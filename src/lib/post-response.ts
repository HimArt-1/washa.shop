import "server-only";

import { after } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export type PostResponseJob<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
    jobKey: string;
    jobType: string;
    payload: TPayload;
};

export function schedulePostResponseTask(
    label: string,
    task: () => Promise<void>
) {
    try {
        after(async () => {
            try {
                await task();
            } catch (error) {
                console.error(`[post-response] ${label} failed`, error);
            }
        });
    } catch (error) {
        console.error(`[post-response] ${label} scheduling failed`, error);
    }
}

export async function enqueuePostResponseJob(job: PostResponseJob) {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("post_response_jobs" as never).insert({
        job_key: job.jobKey,
        job_type: job.jobType,
        payload: job.payload,
        status: "pending",
        attempt_count: 0,
    } as never);
    if (error && error.code !== "23505") throw new Error(error.message);
}

export async function runPostResponseJob(jobKey: string, task: () => Promise<void>) {
    const supabase = getSupabaseAdminClient();
    const { data: claimed, error: claimError } = await supabase.rpc(
        "claim_post_response_job" as never,
        { p_job_key: jobKey } as never
    );
    if (claimError) throw new Error(claimError.message);
    if (claimed !== true) return { processed: false as const };

    try {
        await task();
        const { error } = await supabase.from("post_response_jobs" as never).update({
            status: "completed",
            completed_at: new Date().toISOString(),
            last_error: null,
            updated_at: new Date().toISOString(),
        } as never).eq("job_key", jobKey);
        if (error) throw new Error(error.message);
        return { processed: true as const };
    } catch (error) {
        await supabase.from("post_response_jobs" as never).update({
            status: "failed",
            last_error: error instanceof Error ? error.message.slice(0, 1000) : "Unknown job error",
            updated_at: new Date().toISOString(),
        } as never).eq("job_key", jobKey);
        throw error;
    }
}
