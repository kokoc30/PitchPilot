-- Task 20 (Resume RAG-2): vector retrieval RPC for personalized question generation.
-- Depends on extension "vector" and tables resume_documents, resume_chunks (Task 19).

create index if not exists idx_resume_chunks_embedding
  on public.resume_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- match_resume_chunks: cosine-similarity search filtered by user and resume.
-- SECURITY DEFINER + explicit search_path keeps the RPC callable from the
-- service role while honoring the caller-supplied user/resume filter.
create or replace function public.match_resume_chunks(
  query_embedding vector(384),
  match_user_id uuid,
  match_resume_id uuid,
  match_count integer default 8
)
returns table (
  id uuid,
  resume_id uuid,
  chunk_index integer,
  content text,
  metadata jsonb,
  similarity double precision,
  distance double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    rc.id,
    rc.resume_id,
    rc.chunk_index,
    rc.content,
    rc.metadata,
    1 - (rc.embedding <=> query_embedding) as similarity,
    rc.embedding <=> query_embedding as distance
  from public.resume_chunks rc
  where rc.user_id = match_user_id
    and rc.resume_id = match_resume_id
  order by rc.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 8), 24));
$$;

grant execute on function public.match_resume_chunks(vector, uuid, uuid, integer)
  to anon, authenticated, service_role;
