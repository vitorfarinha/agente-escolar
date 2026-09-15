-- match_document_chunks ficou sem "set search_path", ao contrário das
-- outras funções SECURITY DEFINER deste projeto — apanhado pelo advisor
-- de segurança do Supabase (function_search_path_mutable) após o deploy
-- para produção. Sem isto, a função é vulnerável a search_path hijacking.
create or replace function match_document_chunks(
  query_embedding vector(1536),
  guardian_scopes jsonb,
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index int,
  content text,
  similarity float
)
language sql
stable
set search_path = public
as $$
  select
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  where exists (
    select 1 from document_scopes ds
    where ds.document_id = dc.document_id
      and (
        ds.scope_type = 'geral'
        or exists (
          select 1
          from jsonb_to_recordset(guardian_scopes) as gs(scope_type text, scope_id uuid)
          where gs.scope_type = ds.scope_type and gs.scope_id = ds.scope_id
        )
      )
  )
  order by dc.embedding <=> query_embedding
  limit match_count
$$;
