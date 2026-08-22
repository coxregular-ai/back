alter table debts
  add column if not exists resolution_reason text,
  add column if not exists resolved_at timestamptz,
  add column if not exists credential_audit text;

create table if not exists platform_settings (
  singleton boolean primary key default true check (singleton),
  platform_name text not null default 'Scoore Admin',
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table platform_settings enable row level security;

insert into platform_settings (singleton, platform_name, logo_url)
values (true, 'Scoore Admin', null)
on conflict (singleton) do nothing;

insert into storage.buckets (id, name, public)
values ('platform-assets', 'platform-assets', true)
on conflict (id) do nothing;
