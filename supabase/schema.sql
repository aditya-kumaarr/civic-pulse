-- CivicPulse — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query → paste → Run).
-- All app access is server-side via the service-role key, which bypasses RLS,
-- so we enable RLS (locking out the public anon key) but add no policies.

create table if not exists users (
  id          text primary key,
  name        text not null,
  avatar_url  text,
  role        text not null default 'citizen',
  points      integer not null default 0,
  badges      text[] not null default '{}',
  ward        text,
  created_at  timestamptz not null default now()
);

create table if not exists issues (
  id            text primary key,
  title         text not null,
  description   text not null default '',
  category_id   text not null,
  severity      integer not null default 3,
  lat           double precision not null,
  lng           double precision not null,
  location_name text not null default '',
  ward          text not null default '',
  status        text not null default 'reported',
  image_url     text not null default '',
  reporter_id   text not null,
  reporter_name text not null,
  trust_score   double precision not null default 0.4,
  confirm_count integer not null default 0,
  deny_count    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

create table if not exists verifications (
  id         text primary key,
  issue_id   text not null references issues(id) on delete cascade,
  user_id    text not null,
  user_name  text not null,
  type       text not null,
  created_at timestamptz not null default now()
);

create table if not exists timeline (
  id         text primary key,
  issue_id   text not null references issues(id) on delete cascade,
  status     text not null,
  note       text not null,
  by_user    text not null,
  created_at timestamptz not null default now()
);

create table if not exists comments (
  id         text primary key,
  issue_id   text not null references issues(id) on delete cascade,
  user_id    text not null,
  user_name  text not null,
  text       text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_issues_created_at  on issues(created_at desc);
create index if not exists idx_issues_status      on issues(status);
create index if not exists idx_issues_category    on issues(category_id);
create index if not exists idx_verif_issue        on verifications(issue_id);
create index if not exists idx_timeline_issue     on timeline(issue_id);
create index if not exists idx_comments_issue     on comments(issue_id);

alter table users         enable row level security;
alter table issues        enable row level security;
alter table verifications enable row level security;
alter table timeline      enable row level security;
alter table comments      enable row level security;
