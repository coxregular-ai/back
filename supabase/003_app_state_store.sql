create table if not exists app_state (
  singleton boolean primary key default true check (singleton),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;

insert into app_state (singleton, payload)
values (true, '{}'::jsonb)
on conflict (singleton) do nothing;
