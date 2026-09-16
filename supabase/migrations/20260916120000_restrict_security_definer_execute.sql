-- get_guardian_scopes aceita um p_guardian_id arbitrário e, sendo
-- SECURITY DEFINER, qualquer utilizador autenticado (ou anónimo, via o
-- GRANT implícito a PUBLIC que o Postgres cria por omissão) podia chamar
-- a função via RPC com o guardian_id de outra pessoa e descobrir a que
-- turma/ano/ciclo/atividades os educandos dela pertencem. Corrige-se
-- obrigando p_guardian_id a ser o do próprio chamador, exceto quando a
-- chamada vem do service_role (usado pelo núcleo para canais como email,
-- onde não há sessão Supabase Auth associada).
create or replace function get_guardian_scopes(p_guardian_id uuid)
returns table(scope_type text, scope_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select scope_type, scope_id from (
    select 'aluno'::text as scope_type, s.id as scope_id
    from guardian_students gs
    join students s on s.id = gs.student_id
    where gs.guardian_id = p_guardian_id

    union

    select 'turma'::text, s.class_id
    from guardian_students gs
    join students s on s.id = gs.student_id
    where gs.guardian_id = p_guardian_id and s.class_id is not null

    union

    select 'ano'::text, s.year_group_id
    from guardian_students gs
    join students s on s.id = gs.student_id
    where gs.guardian_id = p_guardian_id and s.year_group_id is not null

    union

    select 'ciclo'::text, s.cycle_id
    from guardian_students gs
    join students s on s.id = gs.student_id
    where gs.guardian_id = p_guardian_id and s.cycle_id is not null

    union

    select 'atividade'::text, sa.activity_id
    from guardian_students gs
    join student_activities sa on sa.student_id = gs.student_id
    where gs.guardian_id = p_guardian_id
  ) scopes
  where auth.role() = 'service_role' or p_guardian_id = get_current_guardian_id()
$$;

-- O schema `public` tem ALTER DEFAULT PRIVILEGES a conceder EXECUTE a
-- anon/authenticated em qualquer função nova (é assim que o Supabase
-- configura projetos novos) — por isso o `grant ... to authenticated,
-- service_role` da migração anterior nunca chegou a restringir nada:
-- o anon já tinha um grant explícito próprio, não apenas via PUBLIC.
-- Um utilizador não autenticado não tem motivo nenhum para invocar
-- estas funções diretamente via RPC.
revoke execute on function is_admin() from public, anon;
revoke execute on function get_current_guardian_id() from public, anon;
revoke execute on function get_guardian_scopes(uuid) from public, anon;
revoke execute on function guardian_can_access_document(uuid) from public, anon;
