# Agente Escolar

Assistente de informação escolar para encarregados de educação — MVP por email, arquitetado para ligar a WhatsApp e ao Awl mais tarde. Projeto independente do SAISHub.

**A fonte da verdade sobre o que construir é `docs/PLANO.md`. Lê esse ficheiro antes de começar qualquer trabalho.** Este CLAUDE.md cobre só stack, convenções e forma de trabalhar — não repitas aqui as fases nem o schema, que já lá estão.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + `pgvector` + Storage + Auth) — local via CLI/Docker em desenvolvimento
- Resend (email inbound/outbound)
- OpenAI API — só para embeddings (`text-embedding-3-small`)
- Anthropic API — geração de respostas (Claude Haiku)
- pnpm como gestor de pacotes
- Deploy: Vercel

## Convenções

- GitHub Flow: branch por feature, PR antes de merge para `main`
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, ...)
- Migrações SQL vivem em `supabase/migrations/`; nunca editar o schema diretamente no dashboard de produção — sempre via migração
- Ver `docs/ENV.md` para a lista completa de variáveis de ambiente e onde cada uma se usa

## Forma de trabalhar (importante)

1. **Desenvolve e testa sempre localmente primeiro.** O ambiente local corre com `supabase start` (Docker) + `pnpm dev`. Só fazer `git push` depois de validado localmente — o push não é o método de teste.
2. **Uma fase do `docs/PLANO.md` de cada vez.** Não avances para a fase seguinte sem confirmação explícita.
3. **No fim de cada fase:** correr a app localmente, confirmar que funciona, e resumir o que foi feito antes de pedir para avançar.
4. **RLS não é opcional.** Qualquer tabela nova com dados de encarregados/alunos precisa de políticas de Row Level Security antes de ser considerada "feita".
5. **Nunca committar segredos.** `.env.local` fica sempre fora do git (confirmar `.gitignore`). Usar `.env.example` como referência de que variáveis existem, sem valores reais.
6. **Desenho agnóstico de canal.** Toda a lógica de negócio (resolver encarregado, procurar chunks relevantes, gerar resposta) vive no núcleo, independente do canal. Os adaptadores de canal (email hoje, WhatsApp/Awl depois) só traduzem formatos — não devem conter lógica de negócio.

## Comandos úteis

```bash
supabase start        # arranca a stack local (Docker)
supabase db reset      # recria a base local e aplica todas as migrações
supabase stop          # pára a stack local
pnpm dev                # corre a app em localhost:3000
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
