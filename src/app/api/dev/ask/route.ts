import { NextRequest, NextResponse } from "next/server";
import { handleIncomingMessage } from "@/lib/core/handle-incoming-message";

/**
 * Endpoint de desenvolvimento para testar o núcleo (Fase 3) manualmente,
 * sem depender de um canal real (email/chat) — que chegam nas Fases 4/6.
 * Remover quando esses canais estiverem prontos e forem o caminho de teste.
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
