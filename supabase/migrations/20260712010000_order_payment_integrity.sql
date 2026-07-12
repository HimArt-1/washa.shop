-- Structured payment metadata and checkout retry protection.
create unique index if not exists orders_checkout_attempt_id_unique
    on public.orders (buyer_id, (metadata ->> 'checkout_attempt_id'))
    where metadata ->> 'checkout_attempt_id' is not null;

create index if not exists orders_payment_method_idx
    on public.orders ((metadata ->> 'payment_method'));

create index if not exists orders_bank_transfer_status_idx
    on public.orders ((metadata ->> 'bank_transfer_status'))
    where metadata ->> 'payment_method' = 'bank_transfer';

create or replace function public.claim_bank_transfer_confirmation(
    p_order_id uuid,
    p_confirmed_by uuid,
    p_payment_reference text
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
    set status = 'confirmed',
        payment_status = 'paid',
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
            'bank_transfer_status', 'confirmed',
            'payment_provider', 'bank_transfer',
            'payment_reference', p_payment_reference,
            'payment_confirmed_by', p_confirmed_by,
            'payment_confirmed_at', now()
        ),
        updated_at = now()
    where id = p_order_id
      and status = 'pending'
      and payment_status = 'pending'
      and metadata ->> 'payment_method' = 'bank_transfer'
      and metadata ->> 'bank_transfer_status' = 'awaiting_receipt'
      and (metadata ->> 'bank_transfer_expires_at')::timestamptz > now();
    get diagnostics affected = row_count;
    return affected = 1;
end;
$$;

revoke all on function public.claim_bank_transfer_confirmation(uuid, uuid, text) from public;
grant execute on function public.claim_bank_transfer_confirmation(uuid, uuid, text) to service_role;

create or replace function public.claim_expired_bank_transfer(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    affected integer;
begin
    update public.orders
    set status = 'cancelled',
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
            'bank_transfer_status', 'releasing_expired_reservation',
            'reservation_release_started_at', now()
        ),
        updated_at = now()
    where id = p_order_id
      and status = 'pending'
      and payment_status = 'pending'
      and metadata ->> 'payment_method' = 'bank_transfer'
      and metadata ->> 'bank_transfer_status' = 'awaiting_receipt'
      and (metadata ->> 'bank_transfer_expires_at')::timestamptz <= now();
    get diagnostics affected = row_count;
    return affected = 1;
end;
$$;

revoke all on function public.claim_expired_bank_transfer(uuid) from public;
grant execute on function public.claim_expired_bank_transfer(uuid) to service_role;

create or replace function public.claim_bank_transfer_cancellation(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    affected integer;
begin
    update public.orders
    set status = 'cancelled',
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
            'bank_transfer_status', 'releasing_cancelled_reservation',
            'reservation_release_started_at', now()
        ),
        updated_at = now()
    where id = p_order_id
      and status = 'pending'
      and payment_status = 'pending'
      and metadata ->> 'payment_method' = 'bank_transfer'
      and metadata ->> 'bank_transfer_status' = 'awaiting_receipt';
    get diagnostics affected = row_count;
    return affected = 1;
end;
$$;

revoke all on function public.claim_bank_transfer_cancellation(uuid) from public;
grant execute on function public.claim_bank_transfer_cancellation(uuid) to service_role;

alter table public.inventory_transactions
    add column if not exists operation_key text;

create unique index if not exists inventory_transactions_operation_key_unique
    on public.inventory_transactions (operation_key)
    where operation_key is not null;

create table if not exists public.order_coupon_operations (
    order_id uuid primary key references public.orders(id) on delete cascade,
    coupon_id uuid not null references public.discount_coupons(id),
    created_at timestamptz not null default now()
);

alter table public.order_coupon_operations enable row level security;

create or replace function public.consume_order_coupon_use(p_order_id uuid, p_coupon_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    inserted integer;
    consumed integer;
begin
    insert into public.order_coupon_operations(order_id, coupon_id)
    values (p_order_id, p_coupon_id)
    on conflict (order_id) do nothing;
    get diagnostics inserted = row_count;
    if inserted = 0 then return true; end if;

    update public.discount_coupons
    set current_uses = coalesce(current_uses, 0) + 1
    where id = p_coupon_id
      and is_active = true
      and (coalesce(max_uses, 0) = 0 or coalesce(current_uses, 0) < max_uses);
    get diagnostics consumed = row_count;
    if consumed = 0 then
        delete from public.order_coupon_operations where order_id = p_order_id;
        return false;
    end if;
    return true;
end;
$$;

create or replace function public.release_order_coupon_use(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    released_coupon_id uuid;
begin
    delete from public.order_coupon_operations
    where order_id = p_order_id
    returning coupon_id into released_coupon_id;
    if released_coupon_id is null then return true; end if;
    update public.discount_coupons
    set current_uses = greatest(coalesce(current_uses, 0) - 1, 0)
    where id = released_coupon_id;
    return true;
end;
$$;

revoke all on function public.consume_order_coupon_use(uuid, uuid) from public;
revoke all on function public.release_order_coupon_use(uuid) from public;
grant execute on function public.consume_order_coupon_use(uuid, uuid) to service_role;
grant execute on function public.release_order_coupon_use(uuid) to service_role;
