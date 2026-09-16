# Histórico do projeto

Registo cronológico de sessões de trabalho, decisões e correções — o
**porquê**, não só o quê (isso já está no `git log`). Serve para qualquer
pessoa (ou o próprio Claude Code numa sessão nova) perceber rapidamente
em que estado ficou o projeto e porque é que certas decisões foram tomadas.

Ver `docs/PLANO.md` para o plano de fases (a fonte de verdade sobre o que
construir) e `docs/ENV.md` para variáveis de ambiente.

---

## 2026-09-16 (6) — Bug real em produção: retrieval vetorial perdia termos exatos

Reportado pelo utilizador: turma 2ºC, aluna Madalena. Pergunta "quando é
que a Madalena tem performance" (disciplina "Performance" no horário da
turma) respondeu que não havia informação suficiente — apesar de o chat
conseguir reproduzir o horário completo quando pedido diretamente. O
utilizador notou ainda que a resposta parecia ter interpretado
"performance" como "avaliação de desempenho da aluna", não como o nome
da disciplina.

### Diagnóstico (dados reais de produção)

- `generate-answer.ts` não tinha culpa: testado isoladamente com os 2
  chunks reais do documento "Horário" como contexto, o Claude Haiku
  respondeu corretamente, citando terça e quinta-feira.
- O problema estava um passo antes — `retrieveRelevantChunks`/
  `match_document_chunks` (pesquisa puramente vetorial, top-5 por
  distância de cosseno). Gerado o embedding real da pergunta e ordenados
  os 21 chunks elegíveis do encarregado (scopes `geral` + turma 2ºC): os
  2 chunks do "Horário" ficaram em 9º/10º lugar — fora do top-5 — atrás
  de **todos** os chunks do "Calendário ano lectivo", que é topicamente
  mais próximo da ideia genérica de "quando"/datas do que o horário em
  si, apesar de não conter a resposta. O núcleo nunca chegou a enviar o
  chunk certo ao Claude.
- Confirma o que já se tinha discutido nesta sessão: a fronteira de
  retrieval (`retrieveRelevantChunks` → RPC `match_document_chunks`) está
  bem isolada, permitindo trocar a estratégia sem tocar no resto do
  núcleo.

### Correção — pesquisa híbrida (vetor + full-text)

Migração `supabase/migrations/20260916190000_hybrid_match_document_chunks.sql`
reescreve `match_document_chunks` para combinar:
- top-N por similaridade vetorial (como antes);
- + chunks com correspondência textual literal (`to_tsvector('portuguese', content) @@ to_tsquery(...)`) contra os termos da pergunta.

Duas decisões importantes, ambas descobertas por teste direto antes de
aplicar em produção:
- **OR entre termos, não AND.** A primeira versão usou
  `websearch_to_tsquery`, que junta todos os termos com `&` — uma
  pergunta em linguagem natural raramente tem todas as palavras
  literalmente no chunk certo (ex: "Madalena" não aparece no horário da
  turma, só "Performance" aparece). Corrigido para construir uma query
  `|` (OR) a partir dos lexemas da pergunta.
- **Filtrar lexemas com menos de 4 carateres.** Sem isto, palavras curtas
  que sobrevivem ao dicionário `portuguese` como não-stopword (ex: "é")
  geravam falsos positivos em quase todo o corpus.
- `retrieveRelevantChunks` passa agora o texto da pergunta (`query_text`)
  ao RPC, além do embedding.

### Validação

- Teste sintético local (`supabase db reset` + `psql` direto): chunk A
  vetorialmente próximo mas irrelevante vs. chunk B vetorialmente
  distante mas com a palavra-chave — sem `query_text` só o A aparece; com
  `query_text` a bater na palavra-chave, A e B aparecem os dois.
- Reproduzido o caso real: com o embedding real da pergunta e os scopes
  reais da guardiã, a chamada a `match_document_chunks` em produção
  (`apply_migration`, sem tocar no dashboard) passou a incluir os 2
  chunks do "Horário" no resultado (antes ausentes do top-5).
- `pnpm build`/`pnpm lint` limpos.
- Nenhuma mensagem de teste foi enviada à conversa real da família — toda
  a validação foi feita com queries SQL diretas (leitura + `apply_migration`), sem inserir linhas em `conversations`/`messages`.

---

## 2026-09-16 (5) — Fase 7: stubs de preparação (WhatsApp + endpoints `/api/v1/*`)

Avanço da Fase 7 do `PLANO.md`, cuja auditoria de conformidade (sessão do
mesmo dia) tinha deixado uma decisão pendente sobre o path do endpoint de
ingestão.

- **`src/lib/channel-adapters/whatsapp.ts`** — adaptador stub, mesmo
  padrão do `email.ts`: `whatsappToIncomingMessage` (payload mínimo de
  webhook da Meta Cloud API → `IncomingMessage`) e
  `outgoingMessageToWhatsappReply` (`OutgoingMessage` → corpo do pedido
  de envio da Cloud API). Só tradução de formato, sem chamada de rede
  real — `TODO` explícito no ficheiro a apontar o que falta (webhook de
  receção + chamada de envio) quando o WhatsApp for ativado. Nenhuma
  mudança necessária em `resolve-guardian.ts`/schema — `channel_identities`
  já suporta `whatsapp`.
- **`POST /api/v1/query`** (novo) — recebe `{ channel, identifier, text }`
  validado com `zod`, protegido por `INTERNAL_API_KEY`, chama
  `handleIncomingMessage` diretamente. É o endpoint que o Awl vai usar
  para perguntar em nome de um encarregado já registado.
- **Decisão sobre o path de ingestão:** `/api/documents/ingest` não tinha
  nenhum consumidor real (o Admin UI faz a ingestão diretamente via
  Supabase client, não por HTTP; só `scripts/test-ingest-and-ask.sh` lhe
  chamava) — por isso foi **realinhado** para `/api/v1/documents`
  (`git mv`, mesma lógica, mesma proteção por `INTERNAL_API_KEY`) em vez
  de manter dois paths a fazer a mesma coisa. Script de teste atualizado
  para o novo path.
- `/api/dev/ask` mantido tal como está — continua a ser tooling de dev
  documentado, não o endpoint do Awl.

### Validação

- `pnpm build` e `pnpm lint` limpos após a mudança (incluindo o path
  novo `/api/v1/documents` a aparecer corretamente na lista de rotas).
- Testado localmente com `supabase start` + `pnpm dev`:
  `POST /api/v1/query` sem chave → `401`; payload inválido → erro `zod`
  claro; pedido válido para um encarregado da seed → resposta gerada e
  gravada em `conversations`/`messages` (`messageId` devolvido).
  `POST /api/v1/documents` → documento + chunk criados corretamente no
  path novo (registo de teste removido a seguir).
- Sem migração nova — só código de aplicação, sem tocar em schema/RLS.

---

## 2026-09-16 (3) — Centro de Conhecimento: RAG de duas fontes (School Sources + Parent Sources)

Pedido do utilizador: além dos documentos da escola, deixar os
encarregados adicionarem a sua própria informação sobre os educandos
(ex: "hoje a minha filha tem ballet às 17h", "é alérgica a frutos
secos"), com isolamento simétrico e estrito — a escola não pode ver nem
editar isto, tal como o encarregado não pode ver/editar os documentos
oficiais da escola.

### Decisões (plano completo revisto e aprovado antes de codar)

- **Captura híbrida**: extração automática de qualquer mensagem (corre no
  núcleo, `handle-incoming-message.ts`, portanto funciona em qualquer
  canal) + CRUD manual no Centro de Conhecimento (`/conhecimento`), que
  serve de superfície de retificação para erros de extração.
- **Isolamento estrutural**: `family_notes` não tem nenhuma policy de
  admin — nem sequer de leitura. Confirmado por teste direto em SQL:
  com `is_admin() = true`, `select count(*) from family_notes` devolve
  0, e qualquer `insert`/`update`/`delete` é rejeitado pelo RLS.
- **Validade temporal**: `event_date` opcional (`null` = facto
  permanente). Notas com data passada deixam de entrar no contexto do
  RAG mas continuam visíveis/editáveis no Centro de Conhecimento.
- **Retrieval sem embeddings**: inclusão direta de todas as notas ativas
  do(s) educando(s) do encarregado no prompt — volume esperado por
  educando é pequeno, evita o risco de uma nota relevante ficar de fora
  por um corte de pesquisa semântica.
- Componentes UI partilhados (`Input`/`Button`/`Card`/...) movidos de
  `src/components/admin/ui.tsx` para `src/components/ui.tsx` — uma
  página do encarregado a importar de `admin/*` seria estruturalmente
  enganador dado o isolamento que se está a reforçar.

### Bug encontrado e corrigido durante a validação

A extração devolvia sempre `null` mesmo com a mensagem a conter um facto
claro. Causa: a validação `zod` do `student_id` usava `.uuid()`, que no
zod v4 exige o formato RFC 4122 completo (dígito de versão em `[1-8]`,
variante em `[89ab]`) — mas os ids de teste do `seed.sql`
(`51111111-0000-0000-0000-000000000001`, etc.) não seguem esse formato,
apesar de serem `uuid` válidos para o Postgres. Corrigido para
`z.string().min(1)` — a verificação que realmente importa (o id
pertence mesmo a um educando do encarregado) já vem a seguir
(`isKnownChild`), tornando a validação de formato estrita redundante e,
pior, uma fonte de falsos negativos.

### Validação

- **RLS (SQL direto, simulando papéis)**: `service_role` insere/lê
  livremente; encarregado dono lê e edita só a sua nota; outro
  encarregado vê 0 linhas e é bloqueado a escrever nas de outrem; admin
  (`is_admin()=true`) vê 0 linhas e é bloqueado a escrever — a asserção
  mais importante do plano, confirmada.
- **Extração ponta-a-ponta (via `/api/dev/ask`, com chamadas reais a
  Claude Haiku)**: mensagem clara com 1 educando → nota `auto` gravada
  corretamente (conteúdo reescrito, `event_date` resolvido para hoje);
  mensagem ambígua com 2 educandos ("um dos meus filhos...") → nada
  gravado; mensagem com nome próprio ("o Bruno...") → resolve
  corretamente ao educando certo, `event_date` resolvido para amanhã.
- **Retrieval**: nota persistente (sem `event_date`) é recuperada e
  citada corretamente como "nota que registaste", não como fonte
  escolar; nota com `event_date` passada é corretamente excluída do
  contexto (a resposta reporta não ter informação, como esperado).
- `tsc`, `eslint` e `next build` limpos em todo o processo.
- **Produção**: migração aplicada a `motorcfjbhniqalunawd` via `apply_migration`; `get_advisors` sem novos avisos; confirmado diretamente (`pg_policies`) que `family_notes` tem exatamente uma política (`guardian manages own family_notes`, `ALL`) — nenhuma política de admin, tal como em local.

---

## 2026-09-16 (4) — Bug real em produção: extração não gravava rotinas sem hora exata

Reportado pelo utilizador logo após o primeiro teste real em produção:
"A Madalena tem ballet às quartas depois do fim das aulas" não gerou
nenhuma nota, e a resposta do assistente tratou a frase como uma
pergunta sem resposta ("não tenho informação suficiente... contacte a
escola"), em vez de reconhecer a informação partilhada.

### Diagnóstico (dados reais de produção, via SQL direto + Vercel runtime logs)

- `family_notes` estava completamente vazia em produção — confirmado
  antes de qualquer fix.
- A guardiã em causa só tem uma educanda (Madalena) — não era um caso
  de ambiguidade entre vários filhos.
- Sem erros nos runtime logs do Vercel à volta do timestamp da
  mensagem — a chamada não estava a rebentar, estava a devolver
  `has_fact: false` de forma "correta" segundo o prompt tal como
  estava escrito.
- Reproduzido localmente (com o nome da estudante de teste trocado
  para "Madalena", para replicar fielmente): `extractFamilyFact`
  devolvia sempre `has_fact:false` para frases com timing vago/recorrente
  ("às quartas depois das aulas", "por volta das 16h", "todas as
  quartas-feiras"), mas `has_fact:true` assim que havia uma hora exata
  ("às 17h"). Causa: o prompt dizia para não extrair "comentários
  vagos", e o modelo estava a aplicar essa regra à IMPRECISÃO DA HORA,
  não apenas à ausência de facto — apesar de o próprio prompt já dizer
  que rotinas recorrentes devem ter `event_date=null`.

### Correções

- `src/lib/core/extract-family-fact.ts` — `SYSTEM_PROMPT` reescrito
  para separar claramente as duas coisas: conservador quanto a QUAL a
  criança e SE existe mesmo um facto; nunca conservador quanto à
  precisão da hora. Acrescentado um exemplo explícito no próprio
  prompt ("a Madalena tem ballet às quartas depois das aulas" → extrair
  com `event_date=null`).
- `src/lib/core/generate-answer.ts` — a mensagem do encarregado nem
  sempre é uma pergunta; pode ser só informação partilhada. Nova regra
  no `SYSTEM_PROMPT` para reconhecer brevemente ("Ok, fica registado.")
  em vez de tratar como pergunta sem resposta. O rótulo da mensagem do
  utilizador no prompt também mudou de "Pergunta do encarregado" para
  "Mensagem do encarregado" — o rótulo antigo estava a enviesar o
  modelo a tratar tudo como pergunta.

### Validação

- Reproduzido o bug exato localmente antes de corrigir; confirmado que
  a mesma mensagem, após a correção, é extraída (`event_date=null`,
  como esperado para uma rotina recorrente) e a resposta passa a ser
  "Ok, fica registado. A Madalena tem ballet às quartas após o termo
  das aulas." em vez do texto de "não tenho informação suficiente".
- `tsc`, `eslint`, `next build` limpos.
- Sem migração nova — só alterações de prompt/lógica, sem tocar em
  schema.

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
