import { NextRequest, NextResponse } from "next/server";
import { handleIncomingMessage } from "@/lib/core/handle-incoming-message";

/**
 * Utilitário de desenvolvimento para testar o núcleo diretamente, sem
 * passar por um canal real. Mantido de propósito (não é código morto) —
 * usado por scripts/test-ingest-and-ask.sh para testes rápidos por
 * linha de comando, mesmo com email/chat já disponíveis.
 */
export async function POST(request: NextRequest) {
  const internalKey = request.headers.get("x-internal-api-key");
  if (!process.env.INTERNAL_API_KEY || internalKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = await handleIncomingMessage(body);
  return NextResponse.json(result);
}
