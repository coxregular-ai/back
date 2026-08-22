create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  status text not null default 'ATIVO',
  cpf text,
  birth_date text,
  age_label text,
  mother_name text,
  father_name text,
  nationality text,
  birth_city text,
  birth_state text,
  gender text,
  rg text,
  rg_issuer text,
  rg_state text,
  marital_status text,
  education text,
  profession text,
  income text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('phone', 'email')),
  value text not null,
  label text,
  is_primary boolean not null default false
);

create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  street text,
  number text,
  complement text,
  district text,
  city text,
  state text,
  zip_code text
);

create table if not exists indicators (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  score integer not null default 970 check (score between 0 and 1000),
  score_label text not null default 'EXCELENTE',
  rating text not null default 'AAA',
  rating_label text not null default 'EXCELENTE',
  ranking text,
  restrictions_status text not null default 'NADA CONSTA'
);

create table if not exists debts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  amount text not null,
  creditor text,
  due_date text,
  status text not null default 'Aberta',
  details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists credit_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  label text not null,
  percentage numeric not null default 0,
  amount text,
  color text,
  sort_order integer not null default 0
);

alter table profiles enable row level security;
alter table contacts enable row level security;
alter table addresses enable row level security;
alter table indicators enable row level security;
alter table debts enable row level security;
alter table credit_items enable row level security;
