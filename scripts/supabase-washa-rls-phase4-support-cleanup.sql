-- WASHA Supabase RLS hardening - Phase 4
-- Purpose:
-- - remove legacy/duplicate support RLS policies left from older migrations
-- - isolate support tickets/messages from anon/authenticated direct table access
-- - keep production support flows server-managed through service role actions

create or replace function public.current_clerk_subject()
returns text
language sql
stable
as $$
    select coalesce(
        nullif(nullif(current_setting('request.jwt.claims', true), '')::json->>'sub', ''),
        auth.uid()::text
    );
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
    select profiles.id
    from public.profiles
    where profiles.clerk_id = public.current_clerk_subject()
    limit 1;
$$;

grant execute on function public.current_clerk_subject() to anon, authenticated;
grant execute on function public.current_profile_id() to authenticated;

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

revoke all privileges on table public.support_tickets from anon, authenticated;
revoke all privileges on table public.support_messages from anon, authenticated;

grant select on table public.support_tickets to authenticated;
grant select on table public.support_messages to authenticated;

drop policy if exists "Admins can manage all tickets" on public.support_tickets;
drop policy if exists "Admins can read all tickets" on public.support_tickets;
drop policy if exists "Admins can update tickets" on public.support_tickets;
drop policy if exists "Anyone can insert a support ticket" on public.support_tickets;
drop policy if exists "Users can insert own tickets" on public.support_tickets;
drop policy if exists "Users can read their own tickets" on public.support_tickets;
drop policy if exists "Users can view own tickets" on public.support_tickets;

drop policy if exists "Admins can manage all messages" on public.support_messages;
drop policy if exists "Admins can view and insert all messages" on public.support_messages;
drop policy if exists "Users can insert messages to own tickets" on public.support_messages;
drop policy if exists "Users can view messages for own tickets" on public.support_messages;

-- Leave read-only owner policies for authenticated sessions if direct client reads are ever restored.
-- Current WASHA app uses Server Actions with service role for writes.
create policy "Authenticated users can view own support tickets"
on public.support_tickets
for select
to authenticated
using (user_id = public.current_profile_id());

create policy "Authenticated users can view own support messages"
on public.support_messages
for select
to authenticated
using (
    exists (
        select 1
        from public.support_tickets t
        where t.id = support_messages.ticket_id
          and t.user_id = public.current_profile_id()
    )
);

comment on table public.support_tickets is
  'WASHA support tickets: direct client writes disabled; production access is server-managed through service role actions.';

comment on table public.support_messages is
  'WASHA support messages: direct client writes disabled; production access is server-managed through service role actions.';

select
    p.tablename,
    p.policyname,
    p.roles,
    p.cmd,
    p.qual,
    p.with_check
from pg_policies p
where p.schemaname = 'public'
  and p.tablename in ('support_tickets', 'support_messages')
order by p.tablename, p.policyname;

select
    table_name,
    grantee,
    privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('support_tickets', 'support_messages')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
