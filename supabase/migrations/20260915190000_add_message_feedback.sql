-- Feedback do encarregado sobre respostas do assistente ("Útil"/"Não útil"),
-- usado pelo componente MessageFeedback no chat web (redesign do /chat).
create table message_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id) not null,
  guardian_id uuid references guardians(id) not null,
  feedback_type text not null check (feedback_type in ('util', 'nao_util')),
  created_at timestamptz default now(),
  unique (message_id, guardian_id)
);

alter table message_feedback enable row level security;

-- Um encarregado só pode dar feedback a mensagens de conversas suas —
-- reaproveita a mesma verificação de posse usada nas policies de "messages".
create policy "guardian manages own feedback" on message_feedback for all using (
  guardian_id = get_current_guardian_id()
) with check (
  guardian_id = get_current_guardian_id()
  and exists (
    select 1 from messages m
    join conversations c on c.id = m.conversation_id
    where m.id = message_feedback.message_id and c.guardian_id = get_current_guardian_id()
  )
);

create policy "admins manage message_feedback" on message_feedback for all using (is_admin()) with check (is_admin());
