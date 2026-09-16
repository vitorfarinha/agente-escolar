# Variáveis de ambiente

Nunca colocar valores reais neste ficheiro nem em qualquer ficheiro versionado — isto é só documentação. Os valores reais vivem em `.env.local` (fora do git) e nas Environment Variables do projeto Vercel (para produção).

## Supabase

| Variável | Onde se usa | Local (`supabase start`) | Produção |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend + backend | `http://127.0.0.1:54321` | URL do projeto Supabase (dashboard → Project Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend (chave pública) | Valor `Publishable` do `supabase start` | Valor `Publishable` do dashboard de produção |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend/serverless apenas — **nunca no browser** | Valor `Secret` do `supabase start` | Valor `Secret` do dashboard de produção |

> Nota: o CLI atual do Supabase chama a estas chaves `Publishable` e `Secret` (substituem os antigos nomes `anon key`/`service_role key`). Os nomes das variáveis de ambiente (`..._ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) mantêm-se por convenção/compatibilidade com o SDK — o que muda é só de onde copias o valor.

## Email (Resend)

| Variável | Onde se usa |
|---|---|
| `RESEND_API_KEY` | Backend — envio de respostas por email |
| `RESEND_INBOUND_WEBHOOK_SECRET` | Backend — validar que o webhook de email inbound vem mesmo do Resend |

Em desenvolvimento, os emails enviados pela app **não saem para a internet** — ficam visíveis no Mailpit local (`http://127.0.0.1:54324`). Não precisas de uma conta Resend real só para testar o fluxo de login por magic link.

## IA

| Variável | Onde se usa |
|---|---|
| `OPENAI_API_KEY` | Backend — geração de embeddings (`text-embedding-3-small`) |
| `ANTHROPIC_API_KEY` | Backend — geração das respostas (Claude Haiku) |

Estas são reais em qualquer ambiente (local ou produção) — não têm versão "local", porque não há Docker equivalente a estas APIs. Usa a mesma chave em dev e produção, mas fica atento ao consumo.

## Interno (Awl / futuros canais)

| Variável | Onde se usa |
|---|---|
| `INTERNAL_API_KEY` | Protege os endpoints `/api/v1/query` e `/api/v1/documents` que o Awl (e mais tarde outros canais) vão chamar |

## WhatsApp (Meta Cloud API)

| Variável | Onde se usa |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Backend — autentica os pedidos de envio (`POST .../messages`) à Graph API |
| `WHATSAPP_PHONE_NUMBER_ID` | Backend — identifica o número de WhatsApp remetente na Graph API |
| `WHATSAPP_VERIFY_TOKEN` | Backend — segredo à escolha, usado só no handshake `GET` de subscrição do webhook (comparado com `hub.verify_token`) |
| `WHATSAPP_APP_SECRET` | Backend — valida a assinatura `X-Hub-Signature-256` dos webhooks `POST`, confirmando que vêm mesmo da Meta. **Sem esta variável definida, a verificação de assinatura é ignorada** — ver `docs/HISTORICO.md` para o estado desta limitação. |

Callback URL a configurar no dashboard da Meta (WhatsApp → Configuration): `https://agente-escolar.vercel.app/api/webhooks/whatsapp-inbound`.

## Ficheiro `.env.example`

Mantém sempre um `.env.example` no repositório (sem valores reais) para que qualquer pessoa — ou o próprio Claude Code numa sessão nova — saiba que variáveis o projeto precisa:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_INBOUND_WEBHOOK_SECRET=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
INTERNAL_API_KEY=
```
