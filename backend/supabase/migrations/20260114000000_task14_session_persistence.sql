create extension if not exists pgcrypto;

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  mode text not null,
  title text,
  duration_seconds integer default 0,
  overall_score integer,
  clarity_score integer,
  pace_score integer,
  delivery_score integer,
  engagement_score integer,
  camera_facing_score integer,
  filler_word_count integer default 0,
  words_per_minute numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.session_transcripts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.practice_sessions(id) on delete cascade,
  full_transcript text,
  final_segments jsonb default '[]'::jsonb,
  word_count integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.session_metrics (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.practice_sessions(id) on delete cascade,
  metrics jsonb not null default '{}'::jsonb,
  score_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.session_reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.practice_sessions(id) on delete cascade,
  provider text,
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.retry_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  baseline_session_id uuid references public.practice_sessions(id) on delete set null,
  retry_session_id uuid references public.practice_sessions(id) on delete set null,
  comparison jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_practice_sessions_user_created
  on public.practice_sessions(user_id, created_at desc);

create index if not exists idx_session_transcripts_session
  on public.session_transcripts(session_id);

create index if not exists idx_session_metrics_session
  on public.session_metrics(session_id);

create index if not exists idx_session_reports_session
  on public.session_reports(session_id);

create index if not exists idx_retry_comparisons_user_created
  on public.retry_comparisons(user_id, created_at desc);

create index if not exists idx_retry_comparisons_baseline_session
  on public.retry_comparisons(baseline_session_id);

create index if not exists idx_retry_comparisons_retry_session
  on public.retry_comparisons(retry_session_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_practice_sessions_updated_at on public.practice_sessions;
create trigger trg_practice_sessions_updated_at
before update on public.practice_sessions
for each row
execute function public.set_updated_at();

alter table public.practice_sessions enable row level security;
alter table public.session_transcripts enable row level security;
alter table public.session_metrics enable row level security;
alter table public.session_reports enable row level security;
alter table public.retry_comparisons enable row level security;

drop policy if exists "Users can select own practice sessions" on public.practice_sessions;
create policy "Users can select own practice sessions"
on public.practice_sessions
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own practice sessions" on public.practice_sessions;
create policy "Users can insert own practice sessions"
on public.practice_sessions
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own practice sessions" on public.practice_sessions;
create policy "Users can update own practice sessions"
on public.practice_sessions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own practice sessions" on public.practice_sessions;
create policy "Users can delete own practice sessions"
on public.practice_sessions
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can select own transcripts" on public.session_transcripts;
create policy "Users can select own transcripts"
on public.session_transcripts
for select
using (
  exists (
    select 1
    from public.practice_sessions ps
    where ps.id = session_id
      and ps.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own transcripts" on public.session_transcripts;
create policy "Users can insert own transcripts"
on public.session_transcripts
for insert
with check (
  exists (
    select 1
    from public.practice_sessions ps
    where ps.id = session_id
      and ps.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own transcripts" on public.session_transcripts;
create policy "Users can update own transcripts"
on public.session_transcripts
for update
using (
  exists (
    select 1
    from public.practice_sessions ps
    where ps.id = session_id
      and ps.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.practice_sessions ps
    where ps.id = session_id
      and ps.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own transcripts" on public.session_transcripts;
create policy "Users can delete own transcripts"
on public.session_transcripts
for delete
using (
  exists (
    select 1
    from public.practice_sessions ps
    where ps.id = session_id
      and ps.user_id = auth.uid()
  )
);

drop policy if exists "Users can select own metrics" on public.session_metrics;
create policy "Users can select own metrics"
on public.session_metrics
for select
using (
  exists (
    select 1
    from public.practice_sessions ps
    where ps.id = session_id
      and ps.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own metrics" on public.session_metrics;
create policy "Users can insert own metrics"
on public.session_metrics
for insert
with check (
  exists (
    select 1
    from public.practice_sessions ps
    where ps.id = session_id
      and ps.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own metrics" on public.session_metrics;
create policy "Users can update own metrics"
on public.session_metrics
for update
using (
  exists (
    select 1
    from public.practice_sessions ps
    where ps.id = session_id
      and ps.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.practice_sessions ps
    where ps.id = session_id
      and ps.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own metrics" on public.session_metrics;
create policy "Users can delete own metrics"
on public.session_metrics
for delete
using (
  exists (
    select 1
    from public.practice_sessions ps
    where ps.id = session_id
      and ps.user_id = auth.uid()
  )
);

drop policy if exists "Users can select own reports" on public.session_reports;
create policy "Users can select own reports"
on public.session_reports
for select
using (
  exists (
    select 1
    from public.practice_sessions ps
    where ps.id = session_id
      and ps.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own reports" on public.session_reports;
create policy "Users can insert own reports"
on public.session_reports
for insert
with check (
  exists (
    select 1
    from public.practice_sessions ps
    where ps.id = session_id
      and ps.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own reports" on public.session_reports;
create policy "Users can update own reports"
on public.session_reports
for update
using (
  exists (
    select 1
    from public.practice_sessions ps
    where ps.id = session_id
      and ps.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.practice_sessions ps
    where ps.id = session_id
      and ps.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own reports" on public.session_reports;
create policy "Users can delete own reports"
on public.session_reports
for delete
using (
  exists (
    select 1
    from public.practice_sessions ps
    where ps.id = session_id
      and ps.user_id = auth.uid()
  )
);

drop policy if exists "Users can select own retry comparisons" on public.retry_comparisons;
create policy "Users can select own retry comparisons"
on public.retry_comparisons
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own retry comparisons" on public.retry_comparisons;
create policy "Users can insert own retry comparisons"
on public.retry_comparisons
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own retry comparisons" on public.retry_comparisons;
create policy "Users can update own retry comparisons"
on public.retry_comparisons
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own retry comparisons" on public.retry_comparisons;
create policy "Users can delete own retry comparisons"
on public.retry_comparisons
for delete
using (auth.uid() = user_id);
