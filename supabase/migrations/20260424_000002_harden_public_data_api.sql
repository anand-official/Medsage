-- Harden Medsage's patient/user data tables against direct Data API access.
-- The app uses the backend service role for these tables, so anon/authenticated
-- should not have table privileges in the public schema.

alter table public.user_profiles enable row level security;
alter table public.study_plans enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.flashcards enable row level security;
alter table public.audit_logs enable row level security;

revoke all on table public.user_profiles from anon, authenticated;
revoke all on table public.study_plans from anon, authenticated;
revoke all on table public.chat_sessions from anon, authenticated;
revoke all on table public.flashcards from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;

-- Keep future tables and functions in public private by default.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

