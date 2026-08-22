create table if not exists app_state_versions (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null default 'demo-profile',
  name text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists app_state_versions_profile_created_idx
  on app_state_versions (profile_id, created_at desc);

alter table app_state_versions enable row level security;
