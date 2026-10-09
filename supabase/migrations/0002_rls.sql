-- Row-level security: every customer-domain row is scoped by org_id.
-- Service role (jobs, webhooks) bypasses RLS and is never exposed to the client.

create or replace function is_member(target uuid, min_role member_role default 'viewer')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members m
    where m.org_id = target
      and m.user_id = auth.uid()
      and m.seat_status = 'active'
      and array_position(enum_range(null::member_role), m.role) <= array_position(enum_range(null::member_role), min_role)
  );
$$;

do $$
declare t text;
begin
  foreach t in array array['companies','people','personas','integrations','raw_events','normalized_events','campaigns','content_drafts','approvals','opportunities','attribution_runs','agent_runs','jobs','audit_events']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (is_member(org_id))', t || '_read', t);
  end loop;
end $$;

alter table organizations enable row level security;
create policy organizations_read on organizations for select using (is_member(id));

alter table organization_members enable row level security;
create policy members_read on organization_members for select using (is_member(org_id));
create policy members_admin_write on organization_members for all using (is_member(org_id, 'admin')) with check (is_member(org_id, 'admin'));

-- Writes from the app go through server actions; operators may edit drafts and approvals.
create policy drafts_operator_write on content_drafts for update using (is_member(org_id, 'operator'));
create policy approvals_operator_insert on approvals for insert with check (is_member(org_id, 'operator'));
create policy integrations_admin_write on integrations for all using (is_member(org_id, 'admin')) with check (is_member(org_id, 'admin'));

-- oauth_tokens has NO client policies at all: only the service role can read token references.
alter table oauth_tokens enable row level security;
alter table attribution_touches enable row level security;
create policy touches_read on attribution_touches for select using (exists (select 1 from attribution_runs r where r.id = run_id and is_member(r.org_id)));
alter table agent_tool_calls enable row level security;
create policy tool_calls_read on agent_tool_calls for select using (exists (select 1 from agent_runs r where r.id = run_id and is_member(r.org_id)));
