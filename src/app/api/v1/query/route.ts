import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleIncomingMessage } from "@/lib/core/handle-incoming-message";

/**
 * Endpoint público do núcleo para o Awl (Fase 7 do PLANO.md, secção 6.5).
 * O Awl envia uma pergunta em nome de um encarregado já registado
 * (identificado por email/telefone em `channel_identities`) e recebe a
 * resposta do motor RAG, exatamente como um canal normal.
 */
const querySchema = z.object({
  channel: z.enum(["email", "whatsapp", "sms", "telegram", "webapp", "awl"]),
  identifier: z.string().min(1),
  text: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const internalKey = request.headers.get("x-internal-api-key");
  if (!process.env.INTERNAL_API_KEY || internalKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = querySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await handleIncomingMessage(parsed.data);
  return NextResponse.json(result);
}
