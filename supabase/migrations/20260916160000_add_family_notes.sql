-- "Centro de Conhecimento" — factos curtos que o próprio encarregado
-- fornece sobre o seu educando (ex: "hoje tem ballet às 17h", "é alérgica
-- a frutos secos"). Complementam os documentos escolares no RAG, mas são
-- uma fonte estritamente privada da família: ao contrário de todas as
-- outras tabelas deste schema, esta tabela NÃO tem nenhuma policy de
-- admin — o objetivo é que `admin_users`/a app de admin tenham zero
-- acesso, mesmo de leitura. O núcleo (service_role) contorna RLS como
-- sempre (bypass nativo do Postgres, não uma policy).
create table family_notes (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid references guardians(id) not null,
  student_id uuid references students(id) not null,
  content text not null check (char_length(content) between 1 and 500),
  -- null = facto permanente (alergia, rotina); preenchido = só relevante
  -- a partir dessa data em diante (resolvida em Europe/Lisbon).
  event_date date,
  source text not null default 'manual' check (source in ('auto', 'manual')),
  created_at timestamptz not null default now()
);

create index family_notes_guardian_id_idx on family_notes (guardian_id);
create index family_notes_student_id_idx on family_notes (student_id);

alter table family_notes enable row level security;

-- Único par de regras nesta tabela: posse transitiva via guardian_students,
-- mesmo padrão usado em message_feedback (20260915190000). Note a ausência
-- deliberada de uma policy "admins manage family_notes" — é isso que torna
-- a tabela invisível à app de admin: com RLS ativo e nenhuma policy a
-- cobrir esse caso, um admin autenticado (sem guardian row) obtém sempre
-- zero linhas em SELECT/INSERT/UPDATE/DELETE.
create policy "guardian manages own family_notes" on family_notes
  for all
  using (
    guardian_id = get_current_guardian_id()
    and exists (
      select 1 from guardian_students gs
      where gs.student_id = family_notes.student_id
        and gs.guardian_id = get_current_guardian_id()
    )
  )
  with check (
    guardian_id = get_current_guardian_id()
    and exists (
      select 1 from guardian_students gs
      where gs.student_id = family_notes.student_id
        and gs.guardian_id = get_current_guardian_id()
    )
  );
