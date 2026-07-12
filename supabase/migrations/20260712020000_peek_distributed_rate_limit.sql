create or replace function public.peek_rate_limit(
    p_identifier text,
    p_limit integer,
    p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_window_index bigint;
    v_window_start timestamptz;
    v_reset_at timestamptz;
    v_hit_count integer;
begin
    if p_limit <= 0 or p_window_seconds <= 0 then
        raise exception 'p_limit and p_window_seconds must be positive';
    end if;

    v_window_index := floor(extract(epoch from timezone('utc'::text, now())) / p_window_seconds)::bigint;
    v_window_start := to_timestamp(v_window_index * p_window_seconds);
    v_reset_at := to_timestamp((v_window_index + 1) * p_window_seconds);

    select hit_count into v_hit_count
    from public.distributed_rate_limits
    where identifier = p_identifier and window_start = v_window_start;

    v_hit_count := coalesce(v_hit_count, 0);
    return jsonb_build_object(
        'success', v_hit_count < p_limit,
        'remaining', greatest(p_limit - v_hit_count, 0),
        'count', v_hit_count,
        'reset_at', v_reset_at
    );
end;
$$;

revoke all on function public.peek_rate_limit(text, integer, integer) from public;
grant execute on function public.peek_rate_limit(text, integer, integer) to service_role;
