-- Task 22 / Resume RAG-4: user-owned generated question history.
-- Stores question metadata only. Full raw resume text and full chunk
-- content remain in resume_chunks and are not copied here.

create extension if not exists pgcrypto;

create table if not exists public.resume_generated_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  resume_id uuid not null references public.resume_documents(id) on delete cascade,
  question text not null,
  question_normalized text not null,
  category text,
  difficulty text check (difficulty is null or difficulty in ('easy', 'medium', 'hard')),
  source text check (source is null or source in ('resume', 'general', 'mock')),
  grounded_in jsonb not null default '[]'::jsonb,
  resume_chunk_ids jsonb not null default '[]'::jsonb,
  suggested_answer_angle text,
  target_role text,
  focus text,
  practiced_count integer not null default 0 check (practiced_count >= 0),
  last_practiced_at timestamptz,
  is_favorite boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint resume_generated_questions_unique_question
    unique (user_id, resume_id, question_normalized)
);

create index if not exists idx_resume_generated_questions_user_resume_created
  on public.resume_generated_questions(user_id, resume_id, created_at desc);

create index if not exists idx_resume_generated_questions_user_resume_favorite
  on public.resume_generated_questions(user_id, resume_id, is_favorite, created_at desc);

create index if not exists idx_resume_generated_questions_user_resume_practiced
  on public.resume_generated_questions(user_id, resume_id, practiced_count, last_practiced_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_resume_generated_questions_updated_at on public.resume_generated_questions;
create trigger trg_resume_generated_questions_updated_at
before update on public.resume_generated_questions
for each row
execute function public.set_updated_at();

alter table public.resume_generated_questions enable row level security;

drop policy if exists "Users can select own generated resume questions"
  on public.resume_generated_questions;
create policy "Users can select own generated resume questions"
on public.resume_generated_questions
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own generated resume questions"
  on public.resume_generated_questions;
create policy "Users can insert own generated resume questions"
on public.resume_generated_questions
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.resume_documents rd
    where rd.id = resume_id
      and rd.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own generated resume questions"
  on public.resume_generated_questions;
create policy "Users can update own generated resume questions"
on public.resume_generated_questions
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.resume_documents rd
    where rd.id = resume_id
      and rd.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own generated resume questions"
  on public.resume_generated_questions;
create policy "Users can delete own generated resume questions"
on public.resume_generated_questions
for delete
using (auth.uid() = user_id);
