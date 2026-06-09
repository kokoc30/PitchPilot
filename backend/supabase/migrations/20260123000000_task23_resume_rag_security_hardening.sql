-- Task 23 / Resume RAG-5: security hardening for resume retrieval RPC.
-- The backend calls this RPC with the service role key. Direct browser clients
-- should not be able to execute a SECURITY DEFINER function that returns chunk
-- content, and authenticated SQL callers must never be able to pass another
-- user's UUID as match_user_id.

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
    and (
      auth.role() = 'service_role'
      or auth.uid() = match_user_id
    )
  order by rc.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 8), 24));
$$;

revoke execute on function public.match_resume_chunks(vector, uuid, uuid, integer)
  from anon, authenticated;

grant execute on function public.match_resume_chunks(vector, uuid, uuid, integer)
  to service_role;
