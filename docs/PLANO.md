# Agente Escolar — Plano de Execução do MVP

**Âmbito:** MVP por email, restrito a uma turma-piloto, arquitetado desde o dia 1 para (a) ligar a WhatsApp, (b) alimentar/servir o Awl, e (c) suportar uma interface de chat web com login simples por email.

> **Nota sobre nomenclatura Supabase:** o CLI atual do Supabase gera chaves chamadas `publishable` e `secret` (não `anon key` / `service_role key` como em versões anteriores). Onde este documento referir `SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`, lê-se como as chaves `publishable`/`secret` devolvidas pelo `supabase start` ou pelo dashboard do projeto. Ver `docs/ENV.md` para o detalhe exato.

**Projeto:** independente do SAISHub (stack semelhante, base de código separada).

---

## 1. Princípios de arquitetura

1. **Repositório documental agnóstico de canal.** O motor de perguntas-e-respostas (RAG) não sabe se a pergunta veio de email, WhatsApp ou chat web — recebe sempre o mesmo formato interno.
2. **Adaptador de canal (Channel Adapter).** Cada canal (email hoje; WhatsApp e Awl amanhã) é uma camada fina que traduz o seu formato nativo para um formato comum (`IncomingMessage`) e vice-versa (`OutgoingMessage`). Acrescentar um canal novo = escrever um adaptador novo, sem tocar no núcleo.
3. **Multi-escola desde o início, mesmo com uma escola.** Todas as tabelas levam `school_id`. Não custa nada agora e evita uma migração dolorosa se um dia isto servir mais do que a turma-piloto (ou for reutilizado pelo Awl para outras famílias/escolas).
4. **API interna reutilizável pelo Awl.** O motor expõe endpoints REST simples (`/api/v1/query`, `/api/v1/documents`) protegidos por API key, para que o Awl possa consumi-los diretamente em vez de duplicar lógica.
5. **RLS (Row Level Security) desde o primeiro schema.** Dados de menores — mesmo em piloto, cada encarregado só pode ver o que é seu.

---

## 2. Stack e serviços necessários

| Serviço | Função | Custo no MVP |
|---|---|---|
| **Supabase** (projeto novo, separado do SAISHub) | Postgres + `pgvector` + Storage + Auth (magic link) + RLS | Grátis (free tier) |
| **Vercel** (projeto novo) | Hosting Next.js, funções serverless, Cron Jobs (lembretes) | Grátis (Hobby) |
| **Resend** | Receção de email inbound (webhook) + envio de respostas | Grátis até 3.000 emails/mês |
| **OpenAI API** | Embeddings (`text-embedding-3-small`) — a Anthropic não tem API de embeddings | Cêntimos/mês neste volume |
| **Anthropic API (Claude)** | Geração das respostas (Claude Haiku é suficiente e barato para este caso de uso) | Cêntimos/mês neste volume |
| **Domínio próprio** (podes já ter) | Necessário para verificar domínio no Resend e ter endereço tipo `escola@teudominio.pt` | Já existente, sem custo extra |

Passos de subscrição (fazer uma vez, manual):
1. Criar conta/projeto novo no Supabase → guardar `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
2. Criar conta Resend → verificar domínio (registos DNS) → configurar **Inbound Parse** para um endereço dedicado (ex: `agente-escola@teudominio.pt`) apontando para um webhook.
3. Criar chave API na OpenAI (só para embeddings).
4. Criar chave API na Anthropic (para geração de respostas).
5. Criar projeto novo no Vercel, ligado a um repositório novo no GitHub.

---

## 3. Schema da base de dados (Supabase / Postgres)

```sql
-- Extensão necessária para embeddings
create extension if not exists vector;

-- === Estrutura escolar ===
create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) not null,
  label text not null, -- ex: "2025/2026"
  start_date date,
  end_date date
);

create table cycles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) not null,
  name text not null -- ex: "1º Ciclo"
);

create table year_groups (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references cycles(id) not null,
  name text not null -- ex: "5º Ano"
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  year_group_id uuid references year_groups(id) not null,
  academic_year_id uuid references academic_years(id) not null,
  name text not null -- ex: "5ºA"
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) not null,
  name text not null, -- ex: "Natação", "Robótica"
  activity_type text,
  description text
);

-- === Pessoas ===
create table students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) not null,
  first_name text not null,
  last_name text not null,
  class_id uuid references classes(id),
  year_group_id uuid references year_groups(id),
  cycle_id uuid references cycles(id)
);

create table student_activities (
  student_id uuid references students(id) not null,
  activity_id uuid references activities(id) not null,
  enrolled_at date default now(),
  notes text,
  primary key (student_id, activity_id)
);

create table guardians (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  phone text unique,
  auth_user_id uuid references auth.users(id), -- ligação ao login Supabase Auth
  preferred_channel text default 'email'
);

create table guardian_students (
  guardian_id uuid references guardians(id) not null,
  student_id uuid references students(id) not null,
  relationship text, -- "mãe", "pai", "encarregado de educação"
  primary key (guardian_id, student_id)
);

-- Identidades por canal — permite reconhecer o mesmo encarregado
-- em email, WhatsApp, Telegram, ou app do Awl
create table channel_identities (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid references guardians(id) not null,
  channel text not null check (channel in ('email','whatsapp','sms','telegram','webapp','awl')),
  identifier text not null, -- email, número de telemóvel, ID do Telegram, etc.
  verified boolean default false,
  unique (channel, identifier)
);

-- === Repositório documental ===
create table documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) not null,
  title text not null,
  source_channel text not null check (source_channel in ('upload','email','api')),
  original_filename text,
  storage_path text, -- caminho no Supabase Storage
  raw_text text, -- texto extraído (PDF/email)
  received_at timestamptz default now(),
  document_date date -- data do evento a que se refere, se aplicável
);

-- Um documento pode ter vários âmbitos (ex: geral + turma específica)
create table document_scopes (
  document_id uuid references documents(id) not null,
  scope_type text not null check (scope_type in ('geral','ciclo','ano','turma','atividade','aluno')),
  scope_id uuid, -- id do ciclo/ano/turma/atividade/aluno; null se scope_type='geral'
  primary key (document_id, scope_type, scope_id)
);

create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) not null,
  chunk_index int not null,
  content text not null,
  embedding vector(1536)
);
create index on document_chunks using ivfflat (embedding vector_cosine_ops);

-- === Conversas ===
create table conversations (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid references guardians(id) not null,
  channel text not null,
  started_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) not null,
  sender text not null check (sender in ('guardian','agent')),
  content text not null,
  referenced_document_ids uuid[],
  created_at timestamptz default now()
);

-- === Lembretes/alertas proativos ===
create table reminders (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id),
  title text not null,
  due_date date not null,
  scope_type text not null,
  scope_id uuid,
  sent_at timestamptz
);

-- === Administração ===
create table admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) not null,
  role text default 'admin'
);
```

### RLS — regras essenciais

- `guardians`: um utilizador só vê a sua própria linha (`auth_user_id = auth.uid()`).
- `students`, `guardian_students`: um encarregado só vê educandos ligados a ele via `guardian_students`.
- `documents` / `document_chunks`: visíveis se `scope_type = 'geral'` OU o `scope_id` corresponder a um ciclo/ano/turma/atividade/aluno de um dos educandos do encarregado autenticado. Isto implementa-se com uma função SQL auxiliar (`get_guardian_scopes(guardian_id)`) usada nas policies.
- `admin_users`: acesso total, verificado por `exists (select 1 from admin_users where auth_user_id = auth.uid())`.
- O `service_role` key (usado só no backend/serverless, nunca no browser) contorna RLS para tarefas de ingestão e do agente.

---

## 4. Fluxo de ingestão de documentos

1. PDF/email chega (upload manual no admin, ou webhook do Resend).
2. Guardado em Supabase Storage; metadados criados em `documents`.
3. Extração de texto (PDF → `pdf-parse`; email → corpo + anexos).
4. Chunking do texto (~500 tokens por chunk, com overlap).
5. Embeddings gerados (OpenAI `text-embedding-3-small`) e guardados em `document_chunks`.
6. **Etiquetagem de âmbito** (`document_scopes`) — no MVP, feita manualmente no admin UI (escolher geral/turma/atividade/etc.); mais tarde pode ser sugerida automaticamente por IA.

## 5. Fluxo de resposta a perguntas (motor RAG)

1. `IncomingMessage { channel, identifier, text }` chega ao núcleo.
2. Núcleo resolve `identifier` → `guardian_id` via `channel_identities`.
3. Resolve `guardian_id` → lista de `student_id` e respetivos ciclo/ano/turma/atividades.
4. Gera embedding da pergunta; procura os `document_chunks` mais próximos, filtrados pelos âmbitos relevantes + geral (RLS trata disto automaticamente se a chamada for feita com o token do próprio encarregado; a chamada via canais externos usa `service_role` + filtro explícito no código).
5. Chama o Claude (Haiku) com os chunks recuperados como contexto, pedindo resposta curta e citação da fonte/documento.
6. Grava pergunta+resposta em `conversations`/`messages`.
7. Devolve `OutgoingMessage` ao adaptador do canal, que a formata e envia (email, WhatsApp, etc.).

## 6. Interfaces

### 6.1 Admin UI (Next.js, protegido por `admin_users`)
- CRUD de: escolas, anos letivos, ciclos, anos, turmas, atividades
- CRUD de alunos + associação a turma/ciclo/ano
- CRUD de encarregados + associação a alunos (com tipo de relação) + gestão de `channel_identities`
- Upload de documentos + formulário de etiquetagem de âmbito (multi-select: geral/ciclo/ano/turma/atividade/aluno)
- Lista de documentos com estado de processamento (extraído / com embeddings / etiquetado)
- Vista simples de lembretes agendados

### 6.2 Chat web para encarregados (login simples por email)
- Supabase Auth com **magic link** (sem password) — o encarregado recebe um link por email e entra
- Após login, o sistema já sabe quem é (via `guardians.auth_user_id`) e mostra só a informação dos seus educandos
- Interface de chat simples (input + histórico de `messages` da sua `conversation`)
- Serve também de **fallback de teste** para o motor RAG sem depender do canal de email

### 6.3 Canal de email (MVP ativo)
- Encarregado envia email para `agente-escola@teudominio.pt`
- Webhook do Resend (Inbound Parse) recebe, identifica o remetente por email em `channel_identities`, processa como `IncomingMessage`
- Resposta enviada de volta por email via Resend

### 6.4 Preparação para WhatsApp (não implementado no MVP, mas o adaptador já existe como stub)
- Webhook da Meta Cloud API a receber mensagens → traduzir para `IncomingMessage { channel: 'whatsapp', identifier: numero_telemovel }`
- Reconhecimento automático porque `channel_identities` já suporta `whatsapp` como tipo

### 6.5 Preparação para o Awl
- Endpoint `POST /api/v1/query` (API key) — o Awl pode enviar uma pergunta em nome de um encarregado (identificado por email/telefone já registado) e receber a resposta
- Endpoint `POST /api/v1/documents` (API key) — o Awl pode empurrar documentos (ex: emails da escola que já processa) diretamente para o repositório, reaproveitando a mesma pipeline de ingestão

---

## 7. Passos de execução para o Claude Code

### Fase 0 — Setup do projeto
1. Criar repositório novo no GitHub (`agente-escolar`)
2. `pnpm create next-app` com TypeScript, App Router, Tailwind
3. Instalar dependências: `@supabase/supabase-js`, `@supabase/ssr`, `openai`, `@anthropic-ai/sdk`, `pdf-parse`, `resend`, `zod`
4. Configurar variáveis de ambiente (`.env.local` + Vercel): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `INTERNAL_API_KEY` (para os endpoints usados pelo Awl)
5. Ligar repositório ao Vercel (deploy automático)

### Fase 1 — Base de dados
6. Criar projeto Supabase novo
7. Escrever migrações SQL (ficheiros em `supabase/migrations/`) com o schema completo da secção 3
8. Aplicar migrações (`supabase db push` ou via dashboard)
9. Escrever as policies de RLS (função auxiliar `get_guardian_scopes` + policies por tabela)
10. Popular dados de teste da turma-piloto (1 turma, ~5 alunos, respetivos encarregados, 2-3 atividades) via seed script

### Fase 2 — Pipeline de ingestão
11. Função `extractText(file)` — deteta tipo (PDF/email) e extrai texto
12. Função `chunkText(text)` — divide em chunks com overlap
13. Função `embedChunks(chunks)` — chama OpenAI embeddings, grava em `document_chunks`
14. Endpoint interno `POST /api/documents/ingest` que orquestra 11-13 e cria a entrada em `documents`

### Fase 3 — Motor de perguntas (núcleo agnóstico de canal)
15. Função `resolveGuardian(channel, identifier)` → consulta `channel_identities`
16. Função `getGuardianScopes(guardianId)` → devolve ciclos/anos/turmas/atividades/alunos relevantes
17. Função `retrieveRelevantChunks(question, scopes)` → embedding da pergunta + pesquisa vetorial filtrada
18. Função `generateAnswer(question, chunks)` → chamada ao Claude Haiku com prompt estruturado (contexto + pedido de citação da fonte)
19. Função core `handleIncomingMessage(msg: IncomingMessage): OutgoingMessage` que junta 15-18 e grava em `conversations`/`messages`

### Fase 4 — Canal de email
20. Configurar domínio + Inbound Parse no Resend
21. Endpoint `POST /api/webhooks/email-inbound` — recebe payload do Resend, monta `IncomingMessage`, chama o núcleo, envia resposta via Resend

### Fase 5 — Admin UI
22. Autenticação de admin (Supabase Auth, verificação contra `admin_users`)
23. Páginas CRUD: `/admin/escolas`, `/admin/turmas`, `/admin/atividades`, `/admin/alunos`, `/admin/encarregados`
24. Página `/admin/documentos` — upload + formulário de etiquetagem de âmbito + estado de processamento
25. Página `/admin/lembretes` — lista simples de lembretes agendados

### Fase 6 — Chat web para encarregados
26. Página de login (`/login`) com magic link do Supabase Auth
27. Página `/chat` — interface simples de pergunta/resposta ligada ao núcleo (Fase 3), usando o `auth.uid()` da sessão para resolver o encarregado
28. Histórico de conversa visível na mesma página

### Fase 7 — Stubs de preparação (sem ativar ainda)
29. Ficheiro `channel-adapters/whatsapp.ts` com a função de tradução `IncomingMessage`/`OutgoingMessage` e um comentário `// TODO: ligar à Meta Cloud API quando pronto`
30. Endpoints `POST /api/v1/query` e `POST /api/v1/documents` protegidos por `INTERNAL_API_KEY`, já a chamar o núcleo/pipeline existentes — prontos a ser consumidos pelo Awl

### Fase 8 — Testes com a turma-piloto
31. Carregar 5-10 documentos reais da turma (circulares, horário, ementa, visita de estudo)
32. Etiquetar âmbitos no admin
33. Testar por email com 2-3 encarregados reais
34. Testar as mesmas perguntas via `/chat` para validar consistência entre canais
35. Ajustar prompt de geração conforme qualidade das respostas

---

## 8. Resumo de custos

| Item | Custo mensal estimado (piloto, 1 turma) |
|---|---|
| Supabase | €0 (free tier) |
| Vercel | €0 (Hobby) |
| Resend | €0 (free tier) |
| OpenAI (embeddings) | < €1 |
| Anthropic (Claude Haiku, geração) | < €2 |
| **Total** | **< €3/mês** |

Custos só sobem de forma material se/quando entrar WhatsApp Cloud API em produção (por conversa) ou o volume de documentos/perguntas crescer muito além de uma turma.
