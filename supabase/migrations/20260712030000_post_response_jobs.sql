create table if not exists public.post_response_jobs (
    id uuid primary key default gen_random_uuid(),
    job_key text not null unique,
    job_type text not null,
    payload jsonb not null default '{}'::jsonb,
    status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
    attempt_count integer not null default 0,
    last_error text,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists post_response_jobs_recovery_idx
    on public.post_response_jobs(status, updated_at);

alter table public.post_response_jobs enable row level security;

create or replace function public.claim_post_response_job(p_job_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    affected integer;
begin
    update public.post_response_jobs
    set status = 'processing',
        attempt_count = attempt_count + 1,
        last_error = null,
        updated_at = now()
    where job_key = p_job_key
      and (
        status in ('pending', 'failed')
        or (status = 'processing' and updated_at < now() - interval '10 minutes')
      );
    get diagnostics affected = row_count;
    return affected = 1;
end;
$$;

revoke all on function public.claim_post_response_job(text) from public;
grant execute on function public.claim_post_response_job(text) to service_role;
