import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { handleIncomingMessage } from "@/lib/core/handle-incoming-message";
import { whatsappToIncomingMessage, outgoingMessageToWhatsappReply, type WhatsappInboundPayload } from "@/lib/channel-adapters/whatsapp";

const GRAPH_API_VERSION = "v21.0";

/** Handshake de subscrição do webhook — a Meta chama isto uma vez ao configurar o Callback URL. */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && process.env.WHATSAPP_VERIFY_TOKEN && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return NextResponse.json({ error: "verification failed" }, { status: 403 });
}

/**
 * Verifica a assinatura HMAC do payload (X-Hub-Signature-256) contra o
 * App Secret da app da Meta. Sem WHATSAPP_APP_SECRET configurado, esta
 * verificação é ignorada (fica documentado como limitação conhecida em
 * docs/HISTORICO.md) — qualquer pedido POST bem formado ao endpoint seria
 * aceite sem confirmar que veio mesmo da Meta.
 */
function hasValidSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return true;
  if (!signatureHeader) return false;

  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  if (signatureHeader.length !== expected.length) return false;

  return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!hasValidSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as WhatsappInboundPayload;
  const incoming = whatsappToIncomingMessage(payload);

  // Eventos sem mensagem de texto (confirmações de entrega/leitura, etc.) — nada a fazer.
  if (!incoming) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const outgoing = await handleIncomingMessage(incoming);
  const reply = outgoingMessageToWhatsappReply(outgoing, incoming.identifier);

  const sendResponse = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(reply),
  });

  if (!sendResponse.ok) {
    const errorBody = await sendResponse.text();
    return NextResponse.json({ error: errorBody }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
