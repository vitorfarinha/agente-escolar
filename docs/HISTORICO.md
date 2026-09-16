# Histórico do projeto

Registo cronológico de sessões de trabalho, decisões e correções — o
**porquê**, não só o quê (isso já está no `git log`). Serve para qualquer
pessoa (ou o próprio Claude Code numa sessão nova) perceber rapidamente
em que estado ficou o projeto e porque é que certas decisões foram tomadas.

Ver `docs/PLANO.md` para o plano de fases (a fonte de verdade sobre o que
construir) e `docs/ENV.md` para variáveis de ambiente.

---

## 2026-09-16 (2) — Ingestão de páginas web como fonte de conhecimento

Pedido do utilizador: além do RAG sobre documentos (PDF/email), poder
apontar o assistente a websites/páginas específicas.

- **Decisão de âmbito:** versão simples primeiro — ingestão manual via
  Admin UI como snapshot único (tal como um PDF), sem re-fetch periódico.
  Se a página de origem mudar, o documento em `documents` não atualiza
  sozinho; é preciso reingerir manualmente. Re-fetch agendado (cron) fica
  para mais tarde, se vier a ser necessário.
- **Implementação:** `src/lib/documents/extract-url.ts` — faz fetch do
  URL (timeout de 15s, só http/https) e usa `cheerio` para remover
  `script/style/nav/header/footer/iframe/svg` e extrair o texto do
  `<body>`. Entra na mesma pipeline de sempre (`chunkText` →
  `embedChunks` → `document_chunks`), sem tocar em RAG/RLS/schema de
  âmbitos — um documento vindo de URL é etiquetado e pesquisado
  exatamente como um PDF.
- **Schema:** migração
  `supabase/migrations/20260916150000_add_url_document_source.sql` —
  adiciona `'url'` ao `check` de `documents.source_channel` e uma coluna
  `source_url text` (mostrada como link na lista de documentos do admin).
- **Limitação conhecida:** a extração usa `cheerio` com `.text()` simples
  sobre o `<body>` (não um algoritmo de "reader mode" como o
  `@mozilla/readability`) — em HTML muito compacto/minificado, texto de
  elementos de bloco adjacentes pode colar sem espaço/quebra de linha
  entre eles. Não impede a extração, mas pode exigir revisão manual do
  texto extraído (o admin já tem essa opção — "editar e reprocessar" —
  para documentos vindos de qualquer fonte).
- Validado: teste isolado da lógica `cheerio` (remoção correta de
  nav/header/footer/script) e teste da função real `extractFromUrl`
  contra um servidor HTTP local; migração aplicada e testada em local
  (`supabase db reset`) antes de aplicar à produção via `apply_migration`.

---

## 2026-09-16 — Auditoria de conformidade com o PLANO.md + correção de segurança em produção

### Auditoria de fases (Fases 0–8)

- **Fases 0–6: concluídas**, a corresponder ao `PLANO.md` linha a linha —
  setup do projeto, schema + RLS, pipeline de ingestão, motor RAG,
  canal de email, Admin UI, chat web para encarregados.
- **Fase 7 (stubs de preparação): por fazer.**
  - Não existe `channel-adapters/whatsapp.ts`.
  - Não existe `/api/v1/query`.
  - Existe `/api/documents/ingest` (protegido por `INTERNAL_API_KEY`), que
    cobre o espírito do `/api/v1/documents` do plano mas noutro path e
    sem versionamento. Decisão pendente: manter este path ou realinhar
    com o plano antes do Awl começar a integrar.
- **Fase 8 (testes com a turma-piloto): só parcial.**
  `scripts/test-ingest-and-ask.sh` é tooling de dev; não há evidência de
  documentos reais da turma carregados/etiquetados nem de testes reais
  por email com 2–3 encarregados (passos 33–34 do plano).

### Falha de segurança encontrada e corrigida (produção)

O Supabase Advisor (projeto `motorcfjbhniqalunawd`) assinalou que as
funções `SECURITY DEFINER` criadas na migração de RLS (`is_admin`,
`get_current_guardian_id`, `get_guardian_scopes`,
`guardian_can_access_document`) eram executáveis via RPC por `anon` e
`authenticated`, apesar de a migração original já ter
`grant execute ... to authenticated, service_role` explícito.

- **Causa:** um projeto Supabase novo tem `ALTER DEFAULT PRIVILEGES` no
  schema `public` a conceder `EXECUTE` a `anon`/`authenticated` em
  qualquer função nova por omissão. O `grant` explícito nunca chegou a
  restringir nada porque o `anon` já tinha acesso próprio, não só via
  `PUBLIC`.
- **Impacto real:** `get_guardian_scopes(p_guardian_id)` aceita um UUID
  arbitrário. Qualquer encarregado autenticado podia chamar
  `rpc/get_guardian_scopes` com o `guardian_id` de outra pessoa e
  descobrir a que turma/ano/ciclo/atividades os educandos dela
  pertencem — uma fuga de dados de menores.
- **Correção**
  (`supabase/migrations/20260916120000_restrict_security_definer_execute.sql`):
  - `get_guardian_scopes` reescrita para só devolver linhas quando
    `p_guardian_id = get_current_guardian_id()` (o próprio chamador) ou
    quando a chamada vem do `service_role` (usado pelo núcleo para os
    canais email/webapp, que não têm sessão Supabase Auth associada).
  - `EXECUTE` revogado de `anon`/`PUBLIC` nas 4 funções.
- **Validação:** testada localmente (`supabase db reset` + queries
  diretas simulando `service_role`, encarregado autenticado a ver os
  próprios dados, encarregado a tentar aceder aos de outro, e `anon`)
  antes de aplicar à produção. Aplicada à produção via `apply_migration`
  — nunca editada diretamente no dashboard, conforme a regra do
  `CLAUDE.md`.

### Outros avisos do Supabase Advisor por resolver (menor prioridade)

- Extensão `vector` instalada no schema `public` — devia mover para
  schema próprio.
- `auth_leaked_password_protection` desativado — ativar no dashboard
  (Auth → Policies), relevante desde que existe login por password
  (`c32e297`).
- `auth_rls_initplan` / `multiple_permissive_policies` — otimizações de
  performance menores, irrelevantes à escala de 1 turma-piloto.

---

## Como manter este ficheiro

- Uma entrada nova por sessão de trabalho relevante (não por cada commit
  — isso é o que o `git log` já dá).
- Foca-se em **decisões, porquês, e desvios face ao `PLANO.md`** — não
  repete o que já está descrito lá ou no schema.
- Ordem cronológica, mais recente no topo.
