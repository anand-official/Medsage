create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  _id text primary key,
  uid text not null unique,
  email text not null,
  display_name text not null default '',
  photo_url text not null default '',
  onboarded boolean not null default false,
  mbbs_year integer,
  college text not null default '',
  country text not null default 'India',
  topics_weak jsonb not null default '[]'::jsonb,
  topics_strong jsonb not null default '[]'::jsonb,
  last_login_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_profiles_country_idx on public.user_profiles (country);

create table if not exists public.study_plans (
  _id text primary key,
  uid text not null unique,
  planner_version integer not null default 2,
  exam_date timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists study_plans_exam_date_idx on public.study_plans (exam_date);

create table if not exists public.chat_sessions (
  _id text primary key,
  user_id text not null,
  session_id text not null,
  title text not null default 'Untitled session',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, session_id)
);

create index if not exists chat_sessions_user_updated_idx on public.chat_sessions (user_id, updated_at desc);

create table if not exists public.flashcards (
  _id text primary key,
  user_id text not null,
  topic_id text not null,
  subject text not null default 'Pathology',
  chapter text not null,
  question text not null,
  answer_summary text not null,
  source_chunk_ids jsonb not null default '[]'::jsonb,
  source_book text,
  source_pages text,
  source_confidence double precision not null,
  source_tier text not null,
  ease_factor double precision not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  next_review timestamptz not null default timezone('utc', now()),
  last_reviewed timestamptz,
  last_quality integer,
  total_reviews integer not null default 0,
  total_correct integer not null default 0,
  is_suspended boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists flashcards_user_due_idx on public.flashcards (user_id, next_review, is_suspended);
create index if not exists flashcards_user_topic_idx on public.flashcards (user_id, topic_id);
create unique index if not exists flashcards_user_question_idx on public.flashcards (user_id, question);

create table if not exists public.audit_logs (
  _id text primary key,
  user_id text not null,
  log_id text not null unique,
  session_id text,
  question text not null,
  mode text not null default 'unknown',
  subject text,
  has_image boolean not null default false,
  answer text not null default '',
  pipeline text,
  confidence double precision,
  prompt_id text,
  prompt_version text,
  model_version text,
  is_clarification boolean not null default false,
  feedback jsonb not null default '{"rating": null, "comment": "", "rated_at": null}'::jsonb,
  flagged boolean not null default false,
  flag_reason text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_user_created_idx on public.audit_logs (user_id, created_at desc);
create index if not exists audit_logs_flagged_created_idx on public.audit_logs (flagged, created_at desc);
create index if not exists audit_logs_confidence_created_idx on public.audit_logs (confidence, created_at desc);

alter table public.user_profiles enable row level security;
alter table public.study_plans enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.flashcards enable row level security;
alter table public.audit_logs enable row level security;
