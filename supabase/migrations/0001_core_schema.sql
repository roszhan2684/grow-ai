-- GROW AI · core schema (Postgres is the system of record; Neo4j is derived)
-- Status: written and reviewed; not yet applied to a live Supabase project in this build.

create extension if not exists pgcrypto;

create type member_role as enum ('owner', 'admin', 'operator', 'member', 'viewer');
create type seat_status as enum ('active', 'invited', 'suspended');
create type connector_status as enum ('DISCONNECTED', 'CONNECTING', 'HEALTHY', 'DEGRADED', 'REAUTH_REQUIRED');
create type raw_status as enum ('received', 'normalized', 'duplicate', 'dead_letter');
create type job_status as enum ('queued', 'running', 'succeeded', 'retrying', 'dead_letter', 'approval_required');

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'starter',
  activation_state jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text,
  avatar_url text
);

create table organization_members (
  org_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  role member_role not null default 'member',
  seat_status seat_status not null default 'invited',
  primary key (org_id, user_id)
);

create table companies (
  id text primary key,
  org_id uuid not null references organizations (id) on delete cascade,
  domain text not null,
  name text not null,
  industry text,
  size_band text,
  is_target boolean not null default false,
  unique (org_id, domain)
);

create table people (
  id text primary key,
  org_id uuid not null references organizations (id) on delete cascade,
  normalized_name text not null,
  email text,
  handles text[] not null default '{}',
  title text,
  company_id text references companies (id),
  identity_confidence numeric(3, 2) not null default 1.0
);
create index people_org_email on people (org_id, email);

create table personas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  person_id text not null references people (id),
  role_type text not null check (role_type in ('ceo', 'vp_sales', 'head_marketing')),
  voice_profile jsonb not null default '{}',
  approval_mode text not null default 'human_required'
);

create table integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  provider text not null,
  status connector_status not null default 'DISCONNECTED',
  scopes text[] not null default '{}',
  last_sync_at timestamptz,
  cursor text,
  last_error text,
  unique (org_id, provider)
);

-- Token VALUES live in Vault / KMS; this table only holds a reference + metadata.
create table oauth_tokens (
  integration_id uuid primary key references integrations (id) on delete cascade,
  encrypted_token_ref text not null,
  expires_at timestamptz,
  refresh_state text not null default 'ok'
);

-- Append-only. The unique index is the dedupe boundary for webhook retries.
create table raw_events (
  id text primary key,
  org_id uuid not null references organizations (id) on delete cascade,
  provider text not null,
  provider_event_id text not null,
  kind text not null,
  payload_json jsonb not null,
  hash text not null,
  received_at timestamptz not null default now(),
  status raw_status not null default 'received',
  error text
);
create unique index raw_events_dedupe on raw_events (org_id, provider, provider_event_id) where status <> 'duplicate';

create table normalized_events (
  id text primary key,
  org_id uuid not null references organizations (id) on delete cascade,
  raw_event_id text not null references raw_events (id),
  type text not null,
  actor_id text references people (id),
  subject_id text references people (id),
  object_id text,
  company_id text references companies (id),
  occurred_at timestamptz not null,
  source text not null,
  identity_confidence numeric(3, 2) not null,
  metadata jsonb not null default '{}'
);
create index normalized_events_company_time on normalized_events (org_id, company_id, occurred_at desc);

create table campaigns (
  id text primary key,
  org_id uuid not null references organizations (id) on delete cascade,
  theme text not null,
  objective text,
  audience text,
  proof_points jsonb not null default '[]',
  forbidden_claims text[] not null default '{}',
  target_segment text[] not null default '{}',
  status text not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz
);

create table content_drafts (
  id text primary key,
  org_id uuid not null references organizations (id) on delete cascade,
  persona_id uuid not null references personas (id),
  campaign_id text not null references campaigns (id),
  angle text not null,
  body text not null,
  status text not null default 'pending',
  model_version text not null,
  checks jsonb not null default '[]'
);

create table approvals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  resource_type text not null,
  resource_id text not null,
  approver_id uuid references users (id),
  decision text check (decision in ('approved', 'rejected')),
  note text,
  created_at timestamptz not null default now()
);

create table opportunities (
  id text primary key,
  org_id uuid not null references organizations (id) on delete cascade,
  company_id text not null references companies (id),
  crm_external_id text not null,
  stage text not null,
  amount numeric(14, 2) not null,
  opened_at timestamptz not null,
  closed_at timestamptz,
  unique (org_id, crm_external_id)
);

create table attribution_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  opportunity_id text not null references opportunities (id),
  model text not null,
  version text not null,
  computed_at timestamptz not null default now()
);

create table attribution_touches (
  run_id uuid not null references attribution_runs (id) on delete cascade,
  event_id text not null references normalized_events (id),
  weight numeric(8, 6) not null check (weight >= 0 and weight <= 1),
  explanation text not null,
  primary key (run_id, event_id)
);

create table agent_runs (
  id text primary key,
  org_id uuid not null references organizations (id) on delete cascade,
  prompt text not null,
  status text not null,
  policy_result jsonb not null default '{}',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table agent_tool_calls (
  id bigint generated always as identity primary key,
  run_id text not null references agent_runs (id) on delete cascade,
  tool text not null,
  input jsonb not null,
  output jsonb,
  duration_ms numeric(10, 3),
  result text not null
);

create table jobs (
  id text primary key,
  org_id uuid not null references organizations (id) on delete cascade,
  type text not null,
  status job_status not null default 'queued',
  attempt int not null default 0,
  idempotency_key text not null,
  last_error text,
  created_at timestamptz not null default now(),
  unique (org_id, idempotency_key)
);

create table audit_events (
  id bigint generated always as identity primary key,
  org_id uuid not null references organizations (id) on delete cascade,
  actor text not null,
  action text not null,
  resource text not null,
  before jsonb,
  after jsonb,
  ip inet,
  created_at timestamptz not null default now()
);
