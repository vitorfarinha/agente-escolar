create table token_usage_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  guardian_id uuid references guardians(id) on delete set null,
  call_type text not null, -- 'answer' | 'verification' | 'regeneration'
  model text not null,
  input_tokens integer not null,
  output_tokens integer not null
);

alter table token_usage_log enable row level security;
-- Só o service_role escreve/lê (o mesmo cliente usado em todo o núcleo);
-- sem policies para outros papéis, ficam automaticamente sem acesso.
