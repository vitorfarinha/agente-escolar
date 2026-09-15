# Agente Escolar

Assistente de informação escolar para encarregados de educação — MVP por email, arquitetado para ligar a WhatsApp e ao Awl mais tarde.

## Setup local

```bash
supabase start   # stack local do Supabase (requer Docker)
pnpm install
pnpm dev          # http://localhost:3000
```

## Documentação

- [`CLAUDE.md`](./CLAUDE.md) — stack, convenções, forma de trabalhar
- [`docs/PLANO.md`](./docs/PLANO.md) — fonte da verdade sobre o que construir (fases, schema, arquitetura)
- [`docs/ENV.md`](./docs/ENV.md) — variáveis de ambiente

## Scripts úteis

- `scripts/create-admin-user.mjs` — cria um utilizador admin de teste (login por magic link)
- `scripts/test-ingest-and-ask.sh` — ingere um PDF e faz uma pergunta ao motor RAG, sem passar pela Admin UI
