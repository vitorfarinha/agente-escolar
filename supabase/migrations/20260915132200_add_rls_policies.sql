-- === Funções auxiliares (SECURITY DEFINER — usadas dentro das policies) ===

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users where auth_user_id = auth.uid()
  )
$$;

create or replace function get_current_guardian_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from guardians where auth_user_id = auth.uid()
$$;

-- Devolve todos os âmbitos (ciclo/ano/turma/atividade/aluno) relevantes
-- para os educandos de um encarregado.
create or replace function get_guardian_scopes(p_guardian_id uuid)
returns table(scope_type text, scope_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select 'aluno'::text, s.id
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
$$;

-- Um documento é visível se tiver um âmbito 'geral' ou um âmbito que
-- coincida com um dos âmbitos do encarregado autenticado.
create or replace function guardian_can_access_document(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from document_scopes ds
    where ds.document_id = p_document_id
      and (
        ds.scope_type = 'geral'
        or exists (
          select 1 from get_guardian_scopes(get_current_guardian_id()) gs
          where gs.scope_type = ds.scope_type and gs.scope_id = ds.scope_id
        )
      )
  )
$$;

grant execute on function is_admin() to authenticated, service_role;
grant execute on function get_current_guardian_id() to authenticated, service_role;
grant execute on function get_guardian_scopes(uuid) to authenticated, service_role;
grant execute on function guardian_can_access_document(uuid) to authenticated, service_role;

-- === Tabelas de catálogo escolar — leitura para autenticados, escrita para admins ===

alter table schools enable row level security;
create policy "authenticated read schools" on schools for select using (auth.role() = 'authenticated');
create policy "admins manage schools" on schools for all using (is_admin()) with check (is_admin());

alter table academic_years enable row level security;
create policy "authenticated read academic_years" on academic_years for select using (auth.role() = 'authenticated');
create policy "admins manage academic_years" on academic_years for all using (is_admin()) with check (is_admin());

alter table cycles enable row level security;
create policy "authenticated read cycles" on cycles for select using (auth.role() = 'authenticated');
create policy "admins manage cycles" on cycles for all using (is_admin()) with check (is_admin());

alter table year_groups enable row level security;
create policy "authenticated read year_groups" on year_groups for select using (auth.role() = 'authenticated');
create policy "admins manage year_groups" on year_groups for all using (is_admin()) with check (is_admin());

alter table classes enable row level security;
create policy "authenticated read classes" on classes for select using (auth.role() = 'authenticated');
create policy "admins manage classes" on classes for all using (is_admin()) with check (is_admin());

alter table activities enable row level security;
create policy "authenticated read activities" on activities for select using (auth.role() = 'authenticated');
create policy "admins manage activities" on activities for all using (is_admin()) with check (is_admin());

-- === Pessoas ===

alter table guardians enable row level security;
create policy "guardian sees own row" on guardians for select using (auth_user_id = auth.uid());
create policy "guardian updates own row" on guardians for update using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());
create policy "admins manage guardians" on guardians for all using (is_admin()) with check (is_admin());

alter table students enable row level security;
create policy "guardian sees own students" on students for select using (
  exists (select 1 from guardian_students gs where gs.student_id = students.id and gs.guardian_id = get_current_guardian_id())
);
create policy "admins manage students" on students for all using (is_admin()) with check (is_admin());

alter table guardian_students enable row level security;
create policy "guardian sees own links" on guardian_students for select using (guardian_id = get_current_guardian_id());
create policy "admins manage guardian_students" on guardian_students for all using (is_admin()) with check (is_admin());

alter table channel_identities enable row level security;
create policy "guardian sees own identities" on channel_identities for select using (guardian_id = get_current_guardian_id());
create policy "admins manage channel_identities" on channel_identities for all using (is_admin()) with check (is_admin());

alter table student_activities enable row level security;
create policy "guardian sees own student activities" on student_activities for select using (
  exists (select 1 from guardian_students gs where gs.student_id = student_activities.student_id and gs.guardian_id = get_current_guardian_id())
);
create policy "admins manage student_activities" on student_activities for all using (is_admin()) with check (is_admin());

-- === Repositório documental ===

alter table documents enable row level security;
create policy "guardian sees scoped documents" on documents for select using (guardian_can_access_document(id));
create policy "admins manage documents" on documents for all using (is_admin()) with check (is_admin());

alter table document_scopes enable row level security;
create policy "guardian sees relevant document_scopes" on document_scopes for select using (
  scope_type = 'geral'
  or exists (
    select 1 from get_guardian_scopes(get_current_guardian_id()) gs
    where gs.scope_type = document_scopes.scope_type and gs.scope_id = document_scopes.scope_id
  )
);
create policy "admins manage document_scopes" on document_scopes for all using (is_admin()) with check (is_admin());

alter table document_chunks enable row level security;
create policy "guardian sees scoped document_chunks" on document_chunks for select using (guardian_can_access_document(document_id));
create policy "admins manage document_chunks" on document_chunks for all using (is_admin()) with check (is_admin());

-- === Conversas ===

alter table conversations enable row level security;
create policy "guardian sees own conversations" on conversations for select using (guardian_id = get_current_guardian_id());
create policy "guardian inserts own conversations" on conversations for insert with check (guardian_id = get_current_guardian_id());
create policy "admins manage conversations" on conversations for all using (is_admin()) with check (is_admin());

alter table messages enable row level security;
create policy "guardian sees own messages" on messages for select using (
  exists (select 1 from conversations c where c.id = messages.conversation_id and c.guardian_id = get_current_guardian_id())
);
create policy "guardian inserts own messages" on messages for insert with check (
  exists (select 1 from conversations c where c.id = messages.conversation_id and c.guardian_id = get_current_guardian_id())
);
create policy "admins manage messages" on messages for all using (is_admin()) with check (is_admin());

-- === Lembretes ===

alter table reminders enable row level security;
create policy "guardian sees relevant reminders" on reminders for select using (
  scope_type = 'geral'
  or exists (
    select 1 from get_guardian_scopes(get_current_guardian_id()) gs
    where gs.scope_type = reminders.scope_type and gs.scope_id = reminders.scope_id
  )
);
create policy "admins manage reminders" on reminders for all using (is_admin()) with check (is_admin());

-- === Administração ===

alter table admin_users enable row level security;
create policy "admins see admin_users" on admin_users for select using (is_admin());
create policy "admins manage admin_users" on admin_users for all using (is_admin()) with check (is_admin());
