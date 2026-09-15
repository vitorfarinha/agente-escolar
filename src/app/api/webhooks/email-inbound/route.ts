import { NextRequest, NextResponse } from "next/server";
import { createResendClient } from "@/lib/resend/client";
import { emailToIncomingMessage, outgoingMessageToReplyEmail } from "@/lib/channel-adapters/email";
import { handleIncomingMessage } from "@/lib/core/handle-incoming-message";

/**
 * Webhook do Resend para email inbound. O payload do evento email.received
 * só traz metadados (from/to/subject/attachments) — o corpo tem de ser
 * pedido à parte via resend.emails.receiving.get().
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const resend = createResendClient();

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature || !process.env.RESEND_INBOUND_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let event;
  try {
    event = resend.webhooks.verify({
      payload: rawBody,
      headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
      webhookSecret: process.env.RESEND_INBOUND_WEBHOOK_SECRET,
    });
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const { data: received, error: fetchError } = await resend.emails.receiving.get(event.data.email_id);

  if (fetchError || !received) {
    return NextResponse.json({ error: fetchError?.message ?? "email não encontrado" }, { status: 500 });
  }

  const incoming = emailToIncomingMessage(received);
  const outgoing = await handleIncomingMessage(incoming);
  const reply = outgoingMessageToReplyEmail(outgoing, received);

  const { error: sendError } = await resend.emails.send(reply);

  if (sendError) {
    return NextResponse.json({ error: sendError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
