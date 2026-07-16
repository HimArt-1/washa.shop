-- Terminal state for notification deliveries that cannot be recovered safely.

alter table public.event_dispatches
    drop constraint if exists event_dispatches_status_check;

alter table public.event_dispatches
    add constraint event_dispatches_status_check
    check (status in ('processing', 'sent', 'failed', 'abandoned', 'delivery_unknown'));

create index if not exists event_dispatches_recovery_idx
    on public.event_dispatches(channel, status, updated_at asc);

create or replace function public.mark_order_status_notification_sent(
    p_order_id uuid,
    p_status text,
    p_version text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    affected integer;
begin
    update public.orders
    set metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object(
            'status_notification_pending', false,
            'status_notification_sent_at', now()
        )
    where id = p_order_id
      and status::text = p_status
      and metadata ->> 'status_notification_pending' = 'true'
      and metadata ->> 'status_notification_version' = p_version;
    get diagnostics affected = row_count;
    return affected = 1;
end;
$$;

revoke all on function public.mark_order_status_notification_sent(uuid, text, text) from public;
grant execute on function public.mark_order_status_notification_sent(uuid, text, text) to service_role;
