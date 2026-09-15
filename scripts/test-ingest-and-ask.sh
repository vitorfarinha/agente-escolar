#!/usr/bin/env bash
# Script de teste manual para a Fase 3 (motor de perguntas), antes de haver
# Admin UI (Fase 5) ou canais reais (email/chat, Fases 4/6).
#
# O que faz:
#   1. Ingere um PDF via POST /api/documents/ingest (extrai texto, faz
#      chunking e embeddings)
#   2. Etiqueta o documento como âmbito 'geral' (visível a todos)
#   3. Faz uma pergunta via POST /api/dev/ask, simulando um encarregado
#      a perguntar por email
#
# Requisitos: `pnpm dev` já a correr em localhost:3000, e `supabase start`
# já a correr (Docker).
#
# Uso:
#   ./scripts/test-ingest-and-ask.sh <caminho-para-pdf> ["pergunta"] [identificador-encarregado]
#
# Exemplos:
#   ./scripts/test-ingest-and-ask.sh ~/Downloads/circular.pdf
#   ./scripts/test-ingest-and-ask.sh ~/Downloads/circular.pdf "Quando é a reunião de pais?"
#   ./scripts/test-ingest-and-ask.sh ~/Downloads/circular.pdf "Quando é a reunião de pais?" rui.costa@example.com

set -euo pipefail

PDF_PATH="${1:?Uso: $0 <caminho-para-pdf> [\"pergunta\"] [identificador-encarregado]}"
QUESTION="${2:-Resume este documento em poucas frases.}"
IDENTIFIER="${3:-mariana.silva@example.com}"
SCHOOL_ID="11111111-1111-1111-1111-111111111111" # Escola Piloto (ver supabase/seed.sql)
BASE_URL="http://localhost:3000"
ENV_FILE="$(dirname "$0")/../.env.local"

if [ ! -f "$PDF_PATH" ]; then
  echo "Ficheiro não encontrado: $PDF_PATH" >&2
  exit 1
fi

if ! curl -s -o /dev/null "$BASE_URL"; then
  echo "O servidor de dev não está a responder em $BASE_URL — corre 'pnpm dev' primeiro." >&2
  exit 1
fi

INTERNAL_API_KEY=$(grep '^INTERNAL_API_KEY=' "$ENV_FILE" | cut -d= -f2-)
if [ -z "$INTERNAL_API_KEY" ]; then
  echo "INTERNAL_API_KEY não encontrado em $ENV_FILE" >&2
  exit 1
fi

TITLE=$(basename "$PDF_PATH")

echo "→ A ingerir '$TITLE'..."
FILE_BASE64=$(base64 -i "$PDF_PATH" | tr -d '\n')

INGEST_PAYLOAD=$(python3 - "$SCHOOL_ID" "$TITLE" "$FILE_BASE64" <<'PY'
import json, sys
school_id, title, file_base64 = sys.argv[1:4]
print(json.dumps({
    "school_id": school_id,
    "title": title,
    "source_channel": "upload",
    "mime_type": "application/pdf",
    "file_base64": file_base64,
}))
PY
)

INGEST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/documents/ingest" \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: $INTERNAL_API_KEY" \
  -d "$INGEST_PAYLOAD")

echo "  Resposta: $INGEST_RESPONSE"

DOCUMENT_ID=$(echo "$INGEST_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('document_id',''))")

if [ -z "$DOCUMENT_ID" ]; then
  echo "Falha na ingestão — sem document_id na resposta." >&2
  exit 1
fi

echo "→ A etiquetar documento $DOCUMENT_ID como âmbito 'geral'..."
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -q \
  -c "insert into document_scopes (document_id, scope_type, scope_id) values ('$DOCUMENT_ID', 'geral', null);"

echo "→ A perguntar (como $IDENTIFIER): \"$QUESTION\""
ASK_PAYLOAD=$(python3 - "$IDENTIFIER" "$QUESTION" <<'PY'
import json, sys
identifier, question = sys.argv[1:3]
print(json.dumps({"channel": "email", "identifier": identifier, "text": question}))
PY
)

ASK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/dev/ask" \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: $INTERNAL_API_KEY" \
  -d "$ASK_PAYLOAD")

echo
echo "=== Resposta do agente ==="
echo "$ASK_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('text', d))"
