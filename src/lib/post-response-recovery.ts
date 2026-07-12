import "server-only";

import { processCheckoutSideEffectsForOrder } from "@/app/actions/orders";
import { authorizeInternalJobExecution } from "@/lib/internal-job-authorization";
import { enqueuePostResponseJob, runPostResponseJob } from "@/lib/post-response";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RecoverableJob = {
    job_key: string;
    job_type: string;
    payload: Record<string, unknown> | null;
};

async function processOrderJob(job: RecoverableJob) {
    const orderId = typeof job.payload?.orderId === "string" ? job.payload.orderId : "";
    if (!orderId) throw new Error(`Invalid payload for ${job.job_key}`);

    return runPostResponseJob(job.job_key, async () => {
        await processCheckoutSideEffectsForOrder(authorizeInternalJobExecution(), orderId);
    });
}

export async function recoverPostResponseJobs(limit = 50) {
    const supabase = getSupabaseAdminClient();

    // The order marker repairs the rare case where order persistence succeeded but
    // inserting the outbox row did not.
    const { data: pendingOrders, error: pendingOrdersError } = await supabase
        .from("orders")
        .select("id")
        .eq("metadata->>checkout_side_effects_state", "pending")
        .order("created_at", { ascending: true })
        .limit(limit);
    if (pendingOrdersError) throw new Error(pendingOrdersError.message);

    for (const order of pendingOrders || []) {
        await enqueuePostResponseJob({
            jobKey: `order:${order.id}:checkout-side-effects`,
            jobType: "order_checkout_side_effects",
            payload: { orderId: order.id },
        });
    }

    const { data: jobs, error: jobsError } = await supabase
        .from("post_response_jobs" as never)
        .select("job_key, job_type, payload")
        .in("status", ["pending", "failed", "processing"])
        .order("created_at", { ascending: true })
        .limit(limit);
    if (jobsError) throw new Error(jobsError.message);

    const results = await Promise.allSettled(
        ((jobs || []) as unknown as RecoverableJob[]).map(async (job) => {
            if (job.job_type !== "order_checkout_side_effects") {
                throw new Error(`Unsupported post-response job type: ${job.job_type}`);
            }
            return processOrderJob(job);
        })
    );

    const failed = results.filter((result) => result.status === "rejected");
    for (const result of failed) console.error("[post-response-recovery]", result.reason);

    return {
        ok: failed.length === 0,
        seeded: pendingOrders?.length || 0,
        inspected: results.length,
        failed: failed.length,
    };
}
