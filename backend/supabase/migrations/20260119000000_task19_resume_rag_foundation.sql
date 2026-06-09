create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.resume_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  filename text not null,
  file_type text not null,
  file_size_bytes integer,
  text_char_count integer default 0,
  chunk_count integer default 0,
  embedding_model text not null default 'sentence-transformers/all-MiniLM-L6-v2',
  status text not null default 'processed',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.resume_chunks (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resume_documents(id) on delete cascade,
  user_id uuid not null,
  chunk_index integer not null,
  content text not null,
  content_char_count integer default 0,
  embedding vector(384),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_resume_documents_user_created
  on public.resume_documents(user_id, created_at desc);

create index if not exists idx_resume_chunks_user_resume_index
  on public.resume_chunks(user_id, resume_id, chunk_index);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_resume_documents_updated_at on public.resume_documents;
create trigger trg_resume_documents_updated_at
before update on public.resume_documents
for each row
execute function public.set_updated_at();

alter table public.resume_documents enable row level security;
alter table public.resume_chunks enable row level security;

drop policy if exists "Users can select own resume documents" on public.resume_documents;
create policy "Users can select own resume documents"
on public.resume_documents
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own resume documents" on public.resume_documents;
create policy "Users can insert own resume documents"
on public.resume_documents
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own resume documents" on public.resume_documents;
create policy "Users can delete own resume documents"
on public.resume_documents
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can select own resume chunks" on public.resume_chunks;
create policy "Users can select own resume chunks"
on public.resume_chunks
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own resume chunks" on public.resume_chunks;
create policy "Users can insert own resume chunks"
on public.resume_chunks
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

drop policy if exists "Users can delete own resume chunks" on public.resume_chunks;
create policy "Users can delete own resume chunks"
on public.resume_chunks
for delete
using (auth.uid() = user_id);
