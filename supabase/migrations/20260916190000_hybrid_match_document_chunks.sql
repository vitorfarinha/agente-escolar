-- Bug real em produção: pesquisa vetorial pura falhou a encontrar o chunk
-- certo. Pergunta "quando é que a Madalena tem performance" — o chunk do
-- Horário (2ºC) contém literalmente "Performance" como nome de disciplina,
-- mas ficou fora do top-5 por similaridade de embedding (rank 9/10, atrás
-- de todos os chunks do "Calendário ano lectivo", topicamente mais próximo
-- da noção genérica de "quando"/datas do que o horário em si). O núcleo
-- nunca chegou a ver o chunk certo — não é um problema de geração
-- (generate-answer.ts responde corretamente quando o chunk está no
-- contexto, confirmado por teste isolado).
--
-- Correção: pesquisa híbrida. Além do top-N por similaridade vetorial,
-- inclui chunks que têm correspondência textual literal (full-text search)
-- com a pergunta — apanha termos próprios/exatos (nomes de disciplinas,
-- atividades, pessoas) que a distância de embedding pode sub-valorizar
-- num corpus pequeno onde outro documento é topicamente mais "parecido".
drop function if exists match_document_chunks(vector, jsonb, int);

create or replace function match_document_chunks(
  query_embedding vector(1536),
  guardian_scopes jsonb, -- array de {"scope_type": "...", "scope_id": "..."}
  match_count int default 5,
  query_text text default null
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
  with q as (
    -- Termos "|" (OR), não "&" (AND) como o websearch_to_tsquery faria —
    -- uma pergunta em linguagem natural raramente tem todas as palavras
    -- literalmente no chunk certo (ex: o nome do aluno não aparece no
    -- horário da turma), só o termo-chave (ex: "performance") tem de bater
    -- certo. Lexemas com menos de 4 carateres ficam de fora para não deixar
    -- passar palavras curtas demasiado comuns (ex: "é") que dariam falsos
    -- positivos em quase todo o corpus.
    select nullif(array_to_string(array(
      select lexeme from unnest(tsvector_to_array(to_tsvector('portuguese', coalesce(query_text, '')))) as lexeme
      where length(lexeme) >= 4
    ), ' | '), '') as query_or
  ),
  eligible as (
    select dc.*
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
  ),
  vector_matches as (
    select id, document_id, chunk_index, content, 1 - (embedding <=> query_embedding) as similarity
    from eligible
    order by embedding <=> query_embedding
    limit match_count
  ),
  keyword_matches as (
    select eligible.id, eligible.document_id, eligible.chunk_index, eligible.content,
      1 - (eligible.embedding <=> query_embedding) as similarity
    from eligible, q
    where q.query_or is not null
      and to_tsvector('portuguese', eligible.content) @@ to_tsquery('portuguese', q.query_or)
    order by eligible.embedding <=> query_embedding
    limit match_count
  )
  select id, document_id, chunk_index, content, similarity
  from (
    select distinct on (id) id, document_id, chunk_index, content, similarity
    from (select * from vector_matches union all select * from keyword_matches) combined
    order by id, similarity desc
  ) deduped
  order by similarity desc
  limit match_count + 3
$$;

grant execute on function match_document_chunks(vector, jsonb, int, text) to authenticated, service_role;
